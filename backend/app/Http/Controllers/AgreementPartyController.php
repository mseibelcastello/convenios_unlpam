<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AgreementPartyController extends Controller
{
    public function store(Request $request, int $id): JsonResponse
    {
        // Convenio fuera del alcance del usuario = 404
        $convenio = Agreement::visiblesPara($request->user())->findOrFail($id);

        $datos = $request->validate([
            'parte_id' => ['required', 'integer', 'exists:partes,id'],
            'rol_parte' => ['required', Rule::in(['UNLPam', 'contraparte', 'otro'])],
        ]);

        if ($convenio->partes()->where('partes.id', $datos['parte_id'])->exists()) {
            return response()->json(['message' => 'La parte ya está asociada al convenio'], 409);
        }

        $convenio->partes()->attach($datos['parte_id'], ['rol_parte' => $datos['rol_parte']]);

        return response()->json($convenio->partes()->find($datos['parte_id']), 201);
    }

    public function destroy(Request $request, int $id, int $parteId): JsonResponse
    {
        $convenio = Agreement::visiblesPara($request->user())->findOrFail($id);

        if (! $convenio->partes()->where('partes.id', $parteId)->exists()) {
            abort(404);
        }

        // Pasado el estado de revisión, las partes ya no se tocan
        if (! in_array($convenio->estado, ['borrador', 'revision'], true)) {
            return response()->json([
                'message' => 'El convenio ya fue aprobado',
                'errors' => ['estado' => ['No se pueden quitar partes de un convenio aprobado']],
            ], 422);
        }

        $convenio->partes()->detach($parteId);

        return response()->json(['message' => 'Parte quitada del convenio']);
    }
}