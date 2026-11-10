<?php

namespace App\Http\Controllers;

use App\Http\Requests\AgreementRequest;
use App\Models\Agreement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AgreementController extends Controller
{
    private const TIPOS = ['marco', 'especifico', 'pasantia', 'adenda', 'renovacion', 'sustitucion'];
    private const ESTADOS = ['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'];

    public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'tipo' => ['nullable', Rule::in(self::TIPOS)],
            'estado' => ['nullable', Rule::in(self::ESTADOS)],
            'unidad_id' => ['nullable', 'integer'],
            'anio' => ['nullable', 'digits:4'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $consulta = Agreement::visiblesPara($request->user())->with('unidad');

        if (filled($filtros['q'] ?? null)) {
            $texto = '%'.addcslashes($filtros['q'], '%_\\').'%';
            $consulta->where(fn ($q) => $q->where('codigo', 'like', $texto)->orWhere('titulo', 'like', $texto));
        }

        foreach (['tipo', 'estado', 'unidad_id'] as $campo) {
            if (filled($filtros[$campo] ?? null)) {
                $consulta->where($campo, $filtros[$campo]);
            }
        }

        if (filled($filtros['anio'] ?? null)) {
            $consulta->where('codigo', 'like', "CONV-{$filtros['anio']}-%");
        }

        $pagina = $consulta->orderBy('codigo')->paginate(15);

        return response()->json([
            'data' => $pagina->items(),
            'meta' => [
                'page' => $pagina->currentPage(),
                'total' => $pagina->total(),
                'per_page' => $pagina->perPage(),
                'last_page' => $pagina->lastPage(),
            ],
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

    public function store(AgreementRequest $request): JsonResponse
    {
        $datos = $request->validated();

        // Gestión solo crea en su unidad; administración global crea en cualquiera
        if (! $request->user()->puedeAccederUnidad($datos['unidad_id'])) {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        $convenio = Agreement::create($datos + ['estado' => 'borrador', 'version' => 1]);

        return response()->json($convenio->load('unidad'), 201);
    }

    public function update(AgreementRequest $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);
        $datos = $request->validated();

        // Gestión no puede mover el convenio a otra unidad
        if (! $usuario->puedeAccederUnidad($datos['unidad_id'])) {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        // Solo el borrador se edita; después hay que usar una adenda
        if ($convenio->estado !== 'borrador') {
            return response()->json([
                'message' => 'Solo se puede editar un convenio en borrador',
                'errors' => ['estado' => ['El convenio no está en borrador']],
            ], 422);
        }

        $version = $datos['version'];
        $campos = Arr::except($datos, ['version']);

        // Un solo UPDATE condicionado a la versión: si otra persona editó antes, no toca ninguna fila
        $filas = Agreement::where('id', $id)
            ->where('version', $version)
            ->update($campos + ['version' => DB::raw('version + 1')]);

        if ($filas === 0) {
            return response()->json(['message' => 'Conflicto de versión'], 409);
        }

        return response()->json(Agreement::with('unidad')->findOrFail($id));
    }
}