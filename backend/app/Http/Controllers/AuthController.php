<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use PragmaRX\Google2FA\Google2FA;

class AuthController extends Controller
{
    private const MAX_INTENTOS = 5;
    private const MINUTOS_VIGENCIA = 5;

    public function login(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $usuario = User::where('email', $datos['email'])->first();

        // Mismo mensaje si falla el correo o la clave, para no dar pistas
        if (! $usuario || ! Hash::check($datos['password'], $usuario->password)) {
            return response()->json(['message' => 'Credenciales inválidas'], 401);
        }

        // Si había un token limitado de un login anterior, se descarta
        $usuario->tokens()->where('name', 'mfa')->delete();
        $this->limpiarMfa($usuario);

        $respuesta = [
            'token' => $usuario->createToken('mfa', ['mfa'])->plainTextToken,
            'mfa_required' => true,
            'mfa_activado' => $usuario->mfa_activado,
        ];

        // Primera vez con la app: se muestra el QR para escanear. Una vez activada, nunca más.
        if (! $usuario->mfa_activado) {
            $google2fa = new Google2FA();
            if (! $usuario->mfa_secreto) {
                $usuario->mfa_secreto = $google2fa->generateSecretKey();
                $usuario->save();
            }
            $respuesta['otpauth_uri'] = $google2fa->getQRCodeUrl('Convenios UNLPam', $usuario->email, $usuario->mfa_secreto);
            $respuesta['clave_manual'] = $usuario->mfa_secreto;
        }

        return response()->json($respuesta);
    }

    /** Manda al mail del usuario un código de 6 dígitos (con MAIL_MAILER=log queda en el log) */
    public function enviarCodigoPorMail(Request $request): JsonResponse
    {
        $usuario = $request->user();

        $codigo = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $usuario->mfa_codigo_hash = Hash::make($codigo);
        $usuario->mfa_expira_en = now()->addMinutes(self::MINUTOS_VIGENCIA);
        $usuario->save();

        try {
            Mail::raw(
                "Tu código de acceso es $codigo. Vale ".self::MINUTOS_VIGENCIA.' minutos.',
                fn ($mensaje) => $mensaje->to($usuario->email)->subject('Código de acceso - Convenios UNLPam')
            );
        } catch (\Throwable $e) {
            Log::warning('No se pudo enviar el mail del código: '.$e->getMessage());

            return response()->json(['message' => 'No se pudo enviar el mail. Probá con el código de la app.'], 502);
        }

        // Con el mail simulado, el código queda a la vista en el log para poder usarlo
        if (config('mail.default') === 'log') {
            Log::info("MFA simulado. Codigo para {$usuario->email} = {$codigo}");
        }

        return response()->json(['message' => 'Te enviamos un código por mail']);
    }

    public function verificarMfa(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'codigo' => ['required', 'string'],
        ]);

        $usuario = $request->user();
        $codigo = $datos['codigo'];

        $esDeLaApp = $this->codigoDeLaApp($usuario, $codigo);

        if (! $esDeLaApp && ! $this->codigoDelMail($usuario, $codigo)) {
            $usuario->mfa_intentos++;
            $usuario->save();

            if ($usuario->mfa_intentos >= self::MAX_INTENTOS) {
                // Se agotaron los intentos: el código y el token limitado dejan de servir
                $this->limpiarMfa($usuario);
                $request->user()->currentAccessToken()->delete();

                return response()->json(['message' => 'Demasiados intentos. Iniciá sesión de nuevo.'], 429);
            }

            return response()->json(['message' => 'Código incorrecto'], 401);
        }

        // El primer código correcto de la app deja activado Google Authenticator
        if ($esDeLaApp && ! $usuario->mfa_activado) {
            $usuario->mfa_activado = true;
            $usuario->save();
        }

        // Código correcto: se borra el token limitado y se entrega uno completo
        $request->user()->currentAccessToken()->delete();
        $this->limpiarMfa($usuario);

        return response()->json([
            'token' => $usuario->createToken('app', ['acceso'])->plainTextToken,
            'user' => $usuario->load('unidad'),
        ]);
    }

    /** Código de 6 dígitos de Google Authenticator (se admite 30 segundos de diferencia de reloj) */
    private function codigoDeLaApp(User $usuario, string $codigo): bool
    {
        return $usuario->mfa_secreto
            && (new Google2FA())->verifyKey($usuario->mfa_secreto, $codigo, 1);
    }

    /** Código que se mandó por mail: vale 5 minutos */
    private function codigoDelMail(User $usuario, string $codigo): bool
    {
        return $usuario->mfa_codigo_hash
            && $usuario->mfa_expira_en
            && now()->lessThanOrEqualTo($usuario->mfa_expira_en)
            && Hash::check($codigo, $usuario->mfa_codigo_hash);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada']);
    }

    public function me(Request $request): JsonResponse
    {
       return response()->json(['user' => $request->user()->load('unidad')]);
       
    }

    private function limpiarMfa(User $usuario): void
    {
        $usuario->mfa_codigo_hash = null;
        $usuario->mfa_expira_en = null;
        $usuario->mfa_intentos = 0;
        $usuario->save();
    }
}