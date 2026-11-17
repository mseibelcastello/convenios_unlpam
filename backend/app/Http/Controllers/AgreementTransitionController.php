<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Support\CambiarEstado;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AgreementTransitionController extends Controller
{
    private const ESTADOS = ['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'];

    public function __invoke(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        $datos = $request->validate([
            'estado' => ['required', Rule::in(self::ESTADOS)],
            'fundamento' => ['nullable', 'string', 'max:1000'],
            // Solo se usan al firmar
            'fecha_firma' => ['nullable', 'date_format:Y-m-d'],
            'fecha_inicio' => ['nullable', 'date_format:Y-m-d'],
            'fecha_vencimiento' => ['nullable', 'date_format:Y-m-d'],
        ]);

        // Fuera del alcance del usuario = 404
        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);

        return response()->json(CambiarEstado::aplicar($convenio, $usuario, $datos['estado'], $datos));
    }
}