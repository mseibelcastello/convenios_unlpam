<?php

namespace App\Http\Controllers;

use App\Models\Party;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PartyController extends Controller
{
    private const TIPOS = ['universidad', 'organismo_publico', 'empresa', 'asociacion', 'otra'];

    public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'tipo' => ['nullable', Rule::in(self::TIPOS)],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $consulta = Party::query();

        if (filled($filtros['q'] ?? null)) {
            $consulta->where('nombre', 'like', '%'.addcslashes($filtros['q'], '%_\\').'%');
        }
        if (filled($filtros['tipo'] ?? null)) {
            $consulta->where('tipo', $filtros['tipo']);
        }

        return $this->lista($consulta->orderBy('nombre')->paginate(15));
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Party::findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:150'],
            'tipo' => ['required', Rule::in(self::TIPOS)],
            'representante' => ['nullable', 'string', 'max:120'],
            'cargo_representante' => ['nullable', 'string', 'max:80'],
        ]);

        return response()->json(Party::create($datos), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $parte = Party::findOrFail($id);

        $datos = $request->validate([
            'nombre' => ['sometimes', 'required', 'string', 'max:150'],
            'tipo' => ['sometimes', 'required', Rule::in(self::TIPOS)],
            'representante' => ['sometimes', 'nullable', 'string', 'max:120'],
            'cargo_representante' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);

        $parte->update($datos);

        return response()->json($parte);
    }
}