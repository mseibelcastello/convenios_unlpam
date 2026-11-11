<?php

namespace App\Http\Controllers;

use App\Http\Requests\AgreementRequest;
use App\Models\Agreement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Models\AuditLog;

class AgreementController extends Controller
{
    private const TIPOS = ['marco', 'especifico', 'pasantia', 'adenda', 'renovacion', 'sustitucion'];
    private const ESTADOS = ['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'];

   public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate(Agreement::reglasFiltros() + [
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $pagina = Agreement::visiblesPara($request->user())
            ->filtrar($filtros)
            ->with('unidad')
            ->orderBy('codigo')
            ->paginate(15);

        return $this->lista($pagina);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        // Fuera del alcance del usuario = 404, como si no existiera
        $convenio = Agreement::visiblesPara($usuario)
            ->with(['unidad', 'partes'])
            ->findOrFail($id);

        // Consulta no ve datos personales
        if (in_array($usuario->rol, ['administracion', 'gestion', 'revision'], true)) {
            $convenio->load('personas');

            if ($convenio->personas->isNotEmpty()) {
                AuditLog::create([
                    'usuario_id' => $usuario->id,
                    'accion' => 'consultar datos personales',
                    'entidad' => 'convenios',
                    'entidad_id' => $convenio->id,
                ]);
            }
        }

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