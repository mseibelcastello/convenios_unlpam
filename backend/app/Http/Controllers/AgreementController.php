<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AgreementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $pagina = Agreement::visiblesPara($request->user())
            ->with('unidad')
            ->orderBy('codigo')
            ->paginate(15);

        return response()->json([
            'data' => $pagina->items(),
            'meta' => ['page' => $pagina->currentPage(), 'total' => $pagina->total()],
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        // Fuera del alcance del usuario = 404, como si no existiera
        $convenio = Agreement::visiblesPara($request->user())
            ->with(['unidad', 'partes'])
            ->findOrFail($id);

        return response()->json($convenio);
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'codigo' => ['required', 'regex:/^CONV-\d{4}-\d{3}$/', 'unique:convenios,codigo'],
            'titulo' => ['required', 'string', 'max:200'],
            'tipo' => ['required', Rule::in(['marco', 'especifico', 'pasantia', 'adenda', 'renovacion', 'sustitucion'])],
            'unidad_id' => ['required', 'integer', 'exists:unidades,id'],
            'objeto' => ['required', 'string'],
            'alcance' => ['required', 'string'],
            'obligaciones' => ['required', 'string'],
            'condiciones_rescision' => ['required', 'string'],
            'marco_legal' => ['required', 'string'],
            'resolucion' => ['nullable', 'string', 'max:60'],
            'expediente' => ['nullable', 'string', 'max:60'],
            'condiciones_renovacion' => ['nullable', 'string'],
            'confidencialidad' => ['nullable', 'string'],
            'notas' => ['nullable', 'string'],
        ]);

        // Gestión solo crea en su unidad; administración global crea en cualquiera
        if (! $request->user()->puedeAccederUnidad($datos['unidad_id'])) {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        $convenio = Agreement::create($datos + ['estado' => 'borrador', 'version' => 1]);

        return response()->json($convenio->load('unidad'), 201);
    }
}