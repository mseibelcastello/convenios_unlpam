<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * El QR de la ficha lleva solo un token aleatorio: una referencia, no el contenido del convenio.
 * Quien lo escanea igual necesita sesión y permiso sobre el convenio para verlo.
 */
class QrController extends Controller
{
    private const LARGO = 32;

    /** POST /agreements/{id}/qr: crea el token, o devuelve el que ya tiene (un QR impreso no deja de andar) */
    public function generar(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        // Fuera del alcance del usuario = 404
        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);

        if ($convenio->qr_token === null) {
            DB::transaction(function () use ($convenio, $usuario) {
                // Solo se asigna si sigue vacío: dos pedidos a la vez no generan dos QR distintos
                Agreement::where('id', $convenio->id)
                    ->whereNull('qr_token')
                    ->update(['qr_token' => $this->tokenNuevo()]);

                AuditLog::create([
                    'usuario_id' => $usuario->id,
                    'accion' => 'generar qr',
                    'entidad' => 'convenios',
                    'entidad_id' => $convenio->id,
                ]);
            });
            $convenio->refresh();
        }

        return response()->json([
            'token' => $convenio->qr_token,
            // Lo que va dentro del QR: la pantalla web que abre el convenio a partir del token
            'ruta' => "/qr/{$convenio->qr_token}",
        ]);
    }

    /** GET /qr/{token}: el convenio, solo si el usuario puede verlo. Si no, 404 igual que un token inexistente. */
    public function abrir(Request $request, string $token): JsonResponse
    {
        $convenioId = preg_match('/^[A-Za-z0-9]{'.self::LARGO.'}$/', $token)
            ? Agreement::visiblesPara($request->user())->where('qr_token', $token)->value('id')
            : null;

        if ($convenioId === null) {
            return response()->json(['message' => 'No encontrado'], 404);
        }

        // La misma respuesta que la ficha, con sus reglas (consulta no ve personas ni observaciones)
        return app(AgreementController::class)->show($request, $convenioId);
    }

    private function tokenNuevo(): string
    {
        do {
            $token = Str::random(self::LARGO); // letras y números, con generador criptográfico
        } while (Agreement::where('qr_token', $token)->exists());

        return $token;
    }
}
