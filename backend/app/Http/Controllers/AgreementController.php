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
use App\Models\Observation;

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

        // Consulta no ve datos personales ni observaciones internas
        $interno = in_array($usuario->rol, ['administracion', 'gestion', 'revision'], true);

        if ($interno) {
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

        $datos = $convenio->toArray();

        if ($interno) {
            $datos['observaciones'] = Observation::listaDe($convenio->id);
        }

        return response()->json($datos);
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
            return $this->noEsBorrador();
        }

        $version = $datos['version'];
        $campos = Arr::except($datos, ['version']);

        // Un solo UPDATE condicionado a la versión y al estado: si otra persona editó antes
        // (o el convenio ya salió de borrador), no toca ninguna fila
        $filas = Agreement::where('id', $id)
            ->where('version', $version)
            ->where('estado', 'borrador')
            ->update($campos + ['version' => DB::raw('version + 1')]);

        if ($filas === 0) {
            $actual = Agreement::visiblesPara($usuario)->with('unidad')->find($id);

            if (! $actual) {
                return response()->json(['message' => 'No encontrado'], 404);
            }

            if ($actual->estado !== 'borrador') {
                return $this->noEsBorrador();
            }

            // La versión que mandó el cliente ya quedó vieja: se le devuelve cómo está hoy
            return response()->json([
                'message' => 'Conflicto de versión',
                'actual' => $actual,
            ], 409);
        }

        return response()->json(Agreement::with('unidad')->findOrFail($id));
    }

    private function noEsBorrador(): JsonResponse
    {
        return response()->json([
            'message' => 'Solo se puede editar un convenio en borrador',
            'errors' => ['estado' => ['El convenio no está en borrador']],
        ], 422);
    }
}