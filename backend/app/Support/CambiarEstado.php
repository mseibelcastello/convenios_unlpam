<?php

namespace App\Support;

use App\Models\Agreement;
use App\Models\AgreementLink;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\Observation;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class CambiarEstado
{
    private const DIAS_PREAVISO = 60;

    /**
     * Aplica un cambio de estado con todas las reglas del circuito.
     * $enTransaccion (opcional) corre dentro de la misma transacción, después del cambio.
     */
    public static function aplicar(
        Agreement $convenio,
        User $usuario,
        string $hasta,
        array $datos = [],
        ?callable $enTransaccion = null
    ): Agreement {
        $desde = $convenio->estado;

        $regla = CircuitoEstados::regla($desde, $hasta);
        if ($regla === null) {
            throw ValidationException::withMessages([
                'estado' => ["No se puede pasar de $desde a $hasta"],
            ]);
        }

        if (! in_array($usuario->rol, $regla['roles'], true)) {
            throw new AccessDeniedHttpException('Sin permiso');
        }

        $fundamento = trim($datos['fundamento'] ?? '');
        if ($regla['fundamento'] && $fundamento === '') {
            throw ValidationException::withMessages([
                'fundamento' => ['El fundamento es obligatorio para este cambio'],
            ]);
        }

        if ($hasta === 'aprobado') {
            self::exigirParaAprobar($convenio);
        }

        $cambios = ['estado' => $hasta];
        if ($hasta === 'firmado') {
            $cambios += self::fechasDeFirma($convenio, $datos);
        }

        $cambiado = DB::transaction(function () use ($convenio, $desde, $hasta, $cambios, $fundamento, $usuario, $enTransaccion) {
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

            // Al firmar una renovación, el convenio anterior se archiva en la misma operación
            if ($hasta === 'firmado' && $convenio->tipo === 'renovacion') {
                self::archivarAnteriores($convenio, $usuario);
            }

            if ($enTransaccion) {
                $enTransaccion($convenio);
            }

            return true;
        });

        if (! $cambiado) {
            throw ValidationException::withMessages([
                'estado' => ['El convenio cambió de estado mientras tanto. Volvé a cargarlo.'],
            ]);
        }

        return Agreement::with('unidad')->findOrFail($convenio->id);
    }

    private static function exigirParaAprobar(Agreement $convenio): void
    {
        $abiertas = Observation::where('convenio_id', $convenio->id)->where('resuelta', false)->count();
        if ($abiertas > 0) {
            throw ValidationException::withMessages([
                'estado' => ["Hay $abiertas observación(es) sin resolver"],
            ]);
        }

        if ($convenio->partes()->count() < 2) {
            throw ValidationException::withMessages([
                'estado' => ['Se necesitan al menos 2 partes para aprobar'],
            ]);
        }

        // El PDF principal tiene que estar subido; anexos y dictámenes no lo reemplazan
        if (! Document::where('convenio_id', $convenio->id)->where('tipo', 'principal')->exists()) {
            throw ValidationException::withMessages([
                'estado' => ['Falta subir el PDF principal'],
            ]);
        }

        if (in_array($convenio->tipo, ['especifico', 'pasantia'], true)) {
            self::exigirMarcosVigentes($convenio);
        }
    }

    /** Un específico o una pasantía solo se aprueba si todos sus marcos están firmados y vigentes */
    private static function exigirMarcosVigentes(Agreement $convenio): void
    {
        $marcos = AgreementLink::with('destino')
            ->where('convenio_origen_id', $convenio->id)
            ->where('tipo_vinculo', 'se_apoya_en')
            ->get()
            ->map(fn ($vinculo) => $vinculo->destino);

        if ($marcos->isEmpty()) {
            throw ValidationException::withMessages([
                'estado' => ['Falta vincular el marco del que depende el convenio'],
            ]);
        }

        $hoy = now()->toDateString();

        foreach ($marcos as $marco) {
            if ($marco->estado !== 'firmado') {
                throw ValidationException::withMessages([
                    'estado' => ["El marco {$marco->codigo} no está firmado"],
                ]);
            }

            // Sin fecha de vencimiento cuenta como vigente
            if ($marco->fecha_vencimiento && $marco->fecha_vencimiento->toDateString() < $hoy) {
                throw ValidationException::withMessages([
                    'estado' => ["El marco {$marco->codigo} está vencido"],
                ]);
            }
        }
    }

    /** Archiva los convenios que esta renovación reemplaza, dejando el rastro en auditoría */
    private static function archivarAnteriores(Agreement $renovacion, User $usuario): void
    {
        $anteriores = AgreementLink::where('convenio_origen_id', $renovacion->id)
            ->where('tipo_vinculo', 'renovacion')
            ->pluck('convenio_destino_id');

        foreach ($anteriores as $anteriorId) {
            // Solo se archiva el que sigue firmado; uno ya rescindido o archivado se deja como está
            $filas = Agreement::where('id', $anteriorId)
                ->where('estado', 'firmado')
                ->update(['estado' => 'archivado']);

            if ($filas > 0) {
                AuditLog::create([
                    'usuario_id' => $usuario->id,
                    'accion' => 'cambiar estado',
                    'entidad' => 'convenios',
                    'entidad_id' => $anteriorId,
                    'estado_anterior' => 'firmado',
                    'estado_nuevo' => 'archivado',
                    'fundamento' => "Archivado automáticamente al firmarse la renovación {$renovacion->codigo}",
                ]);
            }
        }
    }

    /** Fechas que exige el estado firmado, tomadas del cuerpo o de lo ya cargado */
    private static function fechasDeFirma(Agreement $convenio, array $datos): array
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