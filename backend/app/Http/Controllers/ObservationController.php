<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AuditLog;
use App\Models\Observation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ObservationController extends Controller
{
    public function index(Request $request, int $id): JsonResponse
    {
        // Convenio fuera del alcance del usuario = 404
        $convenio = Agreement::visiblesPara($request->user())->findOrFail($id);

        $lista = Observation::listaDe($convenio->id);

        return response()->json([
            'data' => $lista,
            'meta' => ['page' => 1, 'total' => count($lista)],
        ]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);

        $datos = $request->validate([
            'contenido' => ['required', 'string', 'max:2000'],
        ]);

        // Revisión anota mientras revisa
        if ($convenio->estado !== 'revision') {
            throw ValidationException::withMessages([
                'estado' => ['Solo se pueden anotar observaciones en un convenio en revisión'],
            ]);
        }

        $observacion = DB::transaction(function () use ($convenio, $usuario, $datos) {
            $observacion = Observation::create([
                'convenio_id' => $convenio->id,
                'autor_id' => $usuario->id,
                'contenido' => $datos['contenido'],
            ]);

            $this->auditar($usuario->id, 'crear', $observacion->id);

            return $observacion;
        });

        return response()->json($observacion->fresh()->paraApi(), 201);
    }

    public function reply(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();
        $observacion = $this->accesible($request, $id);

        $datos = $request->validate([
            'respuesta' => ['required', 'string', 'max:2000'],
        ]);

        if (! in_array($observacion->convenio->estado, ['borrador', 'revision'], true)) {
            throw ValidationException::withMessages([
                'estado' => ['El convenio ya no está en el circuito de revisión'],
            ]);
        }

        $respondida = DB::transaction(function () use ($observacion, $usuario, $datos) {
            // Solo si sigue abierta y sin respuesta: dos respuestas a la vez no se pisan
            $filas = Observation::where('id', $observacion->id)
                ->where('resuelta', false)
                ->whereNull('respuesta')
                ->update([
                    'respuesta' => $datos['respuesta'],
                    'respondida_por' => $usuario->id,
                    'respondida_en' => now(),
                ]);

            if ($filas === 0) {
                return false;
            }

            $this->auditar($usuario->id, 'editar', $observacion->id);

            return true;
        });

        if (! $respondida) {
            throw ValidationException::withMessages([
                'respuesta' => ['La observación ya tiene respuesta o está resuelta'],
            ]);
        }

        return response()->json($observacion->fresh()->paraApi());
    }

    public function resolve(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();
        $observacion = $this->accesible($request, $id);

        // Revisión resuelve cuando vuelve a revisar el convenio corregido
        if ($observacion->convenio->estado !== 'revision') {
            throw ValidationException::withMessages([
                'estado' => ['Solo se pueden resolver observaciones de un convenio en revisión'],
            ]);
        }

        $resuelta = DB::transaction(function () use ($observacion, $usuario) {
            $filas = Observation::where('id', $observacion->id)
                ->where('resuelta', false)
                ->update([
                    'resuelta' => true,
                    'resuelta_por' => $usuario->id,
                    'resuelta_en' => now(),
                ]);

            if ($filas === 0) {
                return false;
            }

            $this->auditar($usuario->id, 'editar', $observacion->id);

            return true;
        });

        if (! $resuelta) {
            throw ValidationException::withMessages([
                'resuelta' => ['La observación ya está resuelta'],
            ]);
        }

        return response()->json($observacion->fresh()->paraApi());
    }

    /** La observación, solo si el usuario puede ver su convenio; si no, es como si no existiera */
    private function accesible(Request $request, int $id): Observation
    {
        $observacion = Observation::findOrFail($id);

        $convenio = Agreement::visiblesPara($request->user())->findOrFail($observacion->convenio_id);
        $observacion->setRelation('convenio', $convenio);

        return $observacion;
    }

    private function auditar(int $usuarioId, string $accion, int $observacionId): void
    {
        AuditLog::create([
            'usuario_id' => $usuarioId,
            'accion' => $accion,
            'entidad' => 'observaciones',
            'entidad_id' => $observacionId,
        ]);
    }
}