<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

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

        $codigo = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $usuario->mfa_codigo_hash = Hash::make($codigo);
        $usuario->mfa_expira_en = now()->addMinutes(self::MINUTOS_VIGENCIA);
        $usuario->mfa_intentos = 0;
        $usuario->save();

        // Simula el envío por mail: el código queda en storage/logs/laravel.log
        Log::info("MFA simulado. Codigo para {$usuario->email} = {$codigo}");

        return response()->json([
            'token' => $usuario->createToken('mfa', ['mfa'])->plainTextToken,
            'mfa_required' => true,
        ]);
    }

    public function verificarMfa(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'codigo' => ['required', 'string'],
        ]);

        $usuario = $request->user();

        if (! $usuario->mfa_codigo_hash || ! $usuario->mfa_expira_en || now()->greaterThan($usuario->mfa_expira_en)) {
            return response()->json(['message' => 'Código vencido. Iniciá sesión de nuevo.'], 401);
        }

        if (! Hash::check($datos['codigo'], $usuario->mfa_codigo_hash)) {
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

        // Código correcto: se borra el token limitado y se entrega uno completo
        $request->user()->currentAccessToken()->delete();
        $this->limpiarMfa($usuario);

        return response()->json([
            'token' => $usuario->createToken('app', ['acceso'])->plainTextToken,
            'user' => $usuario->load('unidad'),
        ]);
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