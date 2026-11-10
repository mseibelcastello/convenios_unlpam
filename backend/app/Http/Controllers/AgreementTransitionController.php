<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AuditLog;
use App\Support\CircuitoEstados;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AgreementTransitionController extends Controller
{
    private const ESTADOS = ['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'];
    private const DIAS_PREAVISO = 60;

    public function __invoke(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        $datos = $request->validate([
            'estado' => ['required', Rule::in(self::ESTADOS)],
            'fundamento' => ['nullable', 'string', 'max:1000'],
            // Solo se usan al firmar
            'fecha_firma' => ['nullable', 'date_format:Y-m-d'],
            'fecha_inicio' => ['nullable', 'date_format:Y-m-d'],
            'fecha_vencimiento' => ['nullable', 'date_format:Y-m-d'],
        ]);

        // Fuera del alcance del usuario = 404
        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);

        $desde = $convenio->estado;
        $hasta = $datos['estado'];

        $regla = CircuitoEstados::regla($desde, $hasta);
        if ($regla === null) {
            throw ValidationException::withMessages([
                'estado' => ["No se puede pasar de $desde a $hasta"],
            ]);
        }

        if (! in_array($usuario->rol, $regla['roles'], true)) {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        $fundamento = trim($datos['fundamento'] ?? '');
        if ($regla['fundamento'] && $fundamento === '') {
            throw ValidationException::withMessages([
                'fundamento' => ['El fundamento es obligatorio para este cambio'],
            ]);
        }

        if ($hasta === 'aprobado' && $convenio->partes()->count() < 2) {
            throw ValidationException::withMessages([
                'estado' => ['Se necesitan al menos 2 partes para aprobar'],
            ]);
        }

        $cambios = ['estado' => $hasta];
        if ($hasta === 'firmado') {
            $cambios += $this->fechasDeFirma($convenio, $datos);
        }

        $cambiado = DB::transaction(function () use ($convenio, $desde, $hasta, $cambios, $fundamento, $usuario) {
            // Solo cambia si el estado sigue siendo el que leímos: evita dos cambios a la vez
            $filas = Agreement::where('id', $convenio->id)->where('estado', $desde)->update($cambios);

            if ($filas === 0) {
                return false;
            }

            AuditLog::create([
                'usuario_id' => $usuario->id,
                'accion' => 'cambiar estado',
                'entidad' => 'convenios',
                'entidad_id' => $convenio->id,
                'estado_anterior' => $desde,
                'estado_nuevo' => $hasta,
                'fundamento' => $fundamento !== '' ? $fundamento : null,
            ]);

            return true;
        });

        if (! $cambiado) {
            throw ValidationException::withMessages([
                'estado' => ['El convenio cambió de estado mientras tanto. Volvé a cargarlo.'],
            ]);
        }

        return response()->json(Agreement::with('unidad')->findOrFail($convenio->id));
    }

    /** Fechas que exige el estado firmado, tomadas del cuerpo o de lo ya cargado */
    private function fechasDeFirma(Agreement $convenio, array $datos): array
    {
        $firma = $datos['fecha_firma'] ?? $convenio->fecha_firma?->toDateString();
        $inicio = $datos['fecha_inicio'] ?? $convenio->fecha_inicio?->toDateString();
        $vencimiento = $datos['fecha_vencimiento'] ?? $convenio->fecha_vencimiento?->toDateString();

        $errores = [];
        if (! $firma) {
            $errores['fecha_firma'] = ['Obligatoria para firmar'];
        }
        if (! $inicio) {
            $errores['fecha_inicio'] = ['Obligatoria para firmar'];
        }
        if ($firma && $inicio && $inicio < $firma) {
            $errores['fecha_inicio'] = ['No puede ser anterior a la fecha de firma'];
        }
        if ($inicio && $vencimiento && $vencimiento <= $inicio) {
            $errores['fecha_vencimiento'] = ['Tiene que ser posterior al inicio'];
        }
        if ($errores) {
            throw ValidationException::withMessages($errores);
        }

        return [
            'fecha_firma' => $firma,
            'fecha_inicio' => $inicio,
            'fecha_vencimiento' => $vencimiento,
            'fecha_preaviso' => $vencimiento
                ? Carbon::parse($vencimiento)->subDays(self::DIAS_PREAVISO)->toDateString()
                : null,
        ];
    }
}