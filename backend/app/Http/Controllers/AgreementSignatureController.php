<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\Signature;
use App\Support\CambiarEstado;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgreementSignatureController extends Controller
{
    private const MAXIMO = 10;
    private const ZONA = 'America/Argentina/Buenos_Aires';

    public function pending(Request $request): JsonResponse
    {
        $consulta = Agreement::visiblesPara($request->user())->where('estado', 'aprobado');

        $total = (clone $consulta)->count();

        // Un aprobado no se edita: su última modificación es la aprobación
        $convenios = $consulta->with('unidad:id,sigla,nombre')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->limit(self::MAXIMO)
            ->get()
            ->map(fn (Agreement $c) => [
                'id' => $c->id,
                'codigo' => $c->codigo,
                'titulo' => $c->titulo,
                'tipo' => $c->tipo,
                'unidad' => $c->unidad
                    ? ['id' => $c->unidad->id, 'sigla' => $c->unidad->sigla, 'nombre' => $c->unidad->nombre]
                    : null,
                'fecha_vencimiento' => $c->fecha_vencimiento?->toDateString(),
                'actualizado_en' => $c->updated_at?->copy()->setTimezone(self::ZONA)->toIso8601String(),
            ])
            ->values();

        return response()->json([
            'data' => $convenios,
            'meta' => ['page' => 1, 'total' => $total],
        ]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        $datos = $request->validate([
            'latitud' => ['required', 'numeric', 'between:-90,90'],
            'longitud' => ['required', 'numeric', 'between:-180,180'],
            'fecha_firma' => ['nullable', 'date_format:Y-m-d'],
            'fecha_inicio' => ['nullable', 'date_format:Y-m-d'],
            'fecha_vencimiento' => ['nullable', 'date_format:Y-m-d'],
        ]);

        // Fuera del alcance del usuario = 404
        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);

        // Sin fechas cargadas, se firma hoy y el convenio empieza hoy
        $hoy = now(self::ZONA)->toDateString();
        $firma = $datos['fecha_firma'] ?? $convenio->fecha_firma?->toDateString() ?? $hoy;
        $inicio = $datos['fecha_inicio'] ?? $convenio->fecha_inicio?->toDateString() ?? $firma;

        // Mismo circuito de siempre (aprobado -> firmado); la firma se guarda en la misma transacción
        $firmado = CambiarEstado::aplicar($convenio, $usuario, 'firmado', [
            'fecha_firma' => $firma,
            'fecha_inicio' => $inicio,
            'fecha_vencimiento' => $datos['fecha_vencimiento'] ?? null,
        ], function (Agreement $c) use ($usuario, $datos) {
            Signature::create([
                'convenio_id' => $c->id,
                'usuario_id' => $usuario->id,
                'latitud' => $datos['latitud'],
                'longitud' => $datos['longitud'],
            ]);
        });

        return response()->json($firmado->toArray() + ['firma' => Signature::deConvenio($firmado->id)]);
    }
}