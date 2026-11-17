<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Unidad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UnidadController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Unidad::orderBy('sigla')->get(['id', 'nombre', 'sigla']));
    }

    /** POST /unidades: solo administración (lo controla la ruta) */
    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:255', Rule::unique('unidades', 'nombre')],
            // La sigla es la que se ve en listados y logos: corta, sin espacios y única
            'sigla' => ['required', 'string', 'max:20', 'regex:/^[A-Za-zÁÉÍÓÚÑáéíóúñ]+$/u', Rule::unique('unidades', 'sigla')],
        ]);

        $unidad = DB::transaction(function () use ($datos, $request) {
            $unidad = Unidad::create($datos);

            AuditLog::create([
                'usuario_id' => $request->user()->id,
                'accion' => 'crear',
                'entidad' => 'unidades',
                'entidad_id' => $unidad->id,
            ]);

            return $unidad;
        });

        return response()->json($unidad->only(['id', 'nombre', 'sigla']), 201);
    }
}
