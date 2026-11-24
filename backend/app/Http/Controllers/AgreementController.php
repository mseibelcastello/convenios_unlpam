<?php

namespace App\Http\Controllers;

use App\Http\Requests\AgreementRequest;
use App\Models\Agreement;
use App\Models\AgreementLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Models\AuditLog;
use App\Models\Observation;
use App\Models\Signature;
use App\Support\Avisos;
use App\Support\ReglasVinculos;
use Illuminate\Validation\ValidationException;

class AgreementController extends Controller
{
    private const TIPOS = ['marco', 'especifico', 'pasantia', 'adenda', 'renovacion', 'sustitucion'];
    private const ESTADOS = ['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'];

   public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate(Agreement::reglasFiltros() + [
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $consulta = Agreement::visiblesPara($request->user())
            ->filtrar($filtros)
            ->with('unidad');

        // Consulta no ve observaciones internas; los demás reciben cuántas quedan sin resolver
        if ($request->user()->rol !== 'consulta') {
            $consulta->withCount(['observaciones as observaciones_pendientes' => fn ($q) => $q->where('resuelta', false)]);
        }

        $pagina = $consulta->orderBy('codigo')->paginate(15);

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
        // null si todavía no se generó el QR de la ficha
        $datos['qr_token'] = $convenio->qr_token;

        if ($interno) {
            $datos['observaciones'] = Observation::listaDe($convenio->id);
            $datos['firma'] = Signature::deConvenio($convenio->id);
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

        // El convenio del que depende (marco, o el que modifica la adenda) se vincula al crear
        $antecedenteId = Arr::pull($datos, 'antecedente_id');
        $antecedente = null;
        $tipoVinculo = ['especifico' => 'se_apoya_en', 'pasantia' => 'se_apoya_en', 'adenda' => 'adenda'][$datos['tipo']] ?? null;
        if ($tipoVinculo) {
            $antecedente = Agreement::visiblesPara($request->user())->find($antecedenteId);
            if (! $antecedente) {
                throw ValidationException::withMessages(['antecedente_id' => ['El convenio no existe o no tenés acceso']]);
            }
            $motivo = ReglasVinculos::incompatibilidad($tipoVinculo, $datos['tipo'], $antecedente->tipo);
            if ($motivo) {
                throw ValidationException::withMessages(['antecedente_id' => [$motivo]]);
            }
        }

        $convenio = DB::transaction(function () use ($datos, $request, $antecedente, $tipoVinculo) {
            $convenio = Agreement::create($datos + ['estado' => 'borrador', 'version' => 1]);
            if ($antecedente) {
                AgreementLink::create([
                    'convenio_origen_id' => $convenio->id,
                    'convenio_destino_id' => $antecedente->id,
                    'tipo_vinculo' => $tipoVinculo,
                ]);
                // Adenda, renovación y sustitución arrancan con las partes del convenio al que se refieren
                if (in_array($tipoVinculo, ['adenda', 'renovacion', 'sustitucion'], true)) {
                    $convenio->copiarPartesDe($antecedente);
                }
            }
            Avisos::convenioCreado($convenio, $request->user());

            return $convenio;
        });

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

        [$resultado, $convenio] = Agreement::editarConVersion($usuario, $id, Arr::except($datos, ['version']), $datos['version']);

        return match ($resultado) {
            'aplicado' => response()->json($convenio),
            'no_encontrado' => response()->json(['message' => 'No encontrado'], 404),
            'no_borrador' => $this->noEsBorrador(),
            // La versión que mandó el cliente ya quedó vieja: se le devuelve cómo está hoy
            'conflicto' => response()->json(['message' => 'Conflicto de versión', 'actual' => $convenio], 409),
        };
    }

    private function noEsBorrador(): JsonResponse
    {
        return response()->json([
            'message' => 'Solo se puede editar un convenio en borrador',
            'errors' => ['estado' => ['El convenio no está en borrador']],
        ], 422);
    }
}