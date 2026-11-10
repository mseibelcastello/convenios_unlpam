<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AgreementPersonController extends Controller
{
    private const CAMPOS_PASANTIA = ['carrera', 'tutor', 'carga_horaria', 'asignacion', 'seguro'];

    public function index(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();
        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);

        $personas = $convenio->personas()->orderBy('personas.nombre')->get();

        AuditLog::create([
            'usuario_id' => $usuario->id,
            'accion' => 'consultar datos personales',
            'entidad' => 'convenios',
            'entidad_id' => $convenio->id,
        ]);

        return response()->json([
            'data' => $personas,
            'meta' => ['page' => 1, 'total' => $personas->count()],
        ]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $convenio = Agreement::visiblesPara($request->user())->findOrFail($id);

        $datos = $request->validate([
            'persona_id' => ['required', 'integer', 'exists:personas,id'],
            'rol' => ['required', Rule::in(['representante', 'responsable', 'docente_guia', 'tutor', 'pasante'])],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', Rule::when($request->filled('desde'), 'after:desde')],
            'carrera' => ['nullable', 'string', 'max:100'],
            'tutor' => ['nullable', 'string', 'max:120'],
            'carga_horaria' => ['nullable', 'integer', 'between:1,20'],
            'asignacion' => ['nullable', 'numeric', 'min:0'],
            'seguro' => ['nullable', 'string', 'max:80'],
        ]);

        if ($datos['rol'] === 'pasante') {
            $this->validarPasante($datos);
        } else {
            // Los datos de pasantía solo se guardan para pasantes
            $datos = array_merge($datos, array_fill_keys(self::CAMPOS_PASANTIA, null));
        }

        $repetido = DB::table('convenio_persona')
            ->where('convenio_id', $convenio->id)
            ->where('persona_id', $datos['persona_id'])
            ->where('rol', $datos['rol'])
            ->exists();

        if ($repetido) {
            throw ValidationException::withMessages(['rol' => ['La persona ya tiene ese rol en el convenio']]);
        }

        $convenio->personas()->attach(
            $datos['persona_id'],
            Arr::only($datos, ['rol', 'desde', 'hasta', 'carrera', 'tutor', 'carga_horaria', 'asignacion', 'seguro'])
        );

        return response()->json(
            $convenio->personas()->wherePivot('rol', $datos['rol'])->find($datos['persona_id']),
            201
        );
    }

    public function destroy(Request $request, int $id, int $personaId): JsonResponse
    {
        $convenio = Agreement::visiblesPara($request->user())->findOrFail($id);

        if (! $convenio->personas()->where('personas.id', $personaId)->exists()) {
            abort(404);
        }

        // Quita a la persona con todos sus roles en este convenio
        $convenio->personas()->detach($personaId);

        return response()->json(['message' => 'Persona quitada del convenio']);
    }

    private function validarPasante(array $datos): void
    {
        $errores = [];

        foreach (['desde', 'hasta', 'carrera', 'tutor', 'carga_horaria', 'asignacion', 'seguro'] as $campo) {
            if (! isset($datos[$campo]) || $datos[$campo] === '') {
                $errores[$campo] = ['Obligatorio para pasantes'];
            }
        }

        if (! $errores) {
            $desde = Carbon::parse($datos['desde']);
            $hasta = Carbon::parse($datos['hasta']);

            if ($hasta->lt($desde->copy()->addMonths(2)) || $hasta->gt($desde->copy()->addMonths(12))) {
                $errores['hasta'] = ['La pasantía dura entre 2 y 12 meses'];
            }
        }

        if ($errores) {
            throw ValidationException::withMessages($errores);
        }
    }
}