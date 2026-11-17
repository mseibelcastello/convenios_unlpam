<?php

namespace App\Support;

use App\Models\Agreement;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Avisos a los usuarios (tabla notificaciones). Cada aviso queda en GET /alerts de quien lo recibe.
 * Solo reciben avisos los usuarios que pueden ver el convenio: los de su unidad y los globales (sin unidad).
 * Quien hizo la acción no se avisa a sí mismo.
 */
class Avisos
{
    public const TIPOS = ['convenio_creado', 'comentario', 'datos_modificados', 'rescindido', 'revision_asignada', 'cambio_estado', 'preaviso'];

    private const INTERNOS = ['administracion', 'gestion', 'revision'];

    private const ESTADOS = [
        'borrador' => 'Borrador',
        'revision' => 'Revisión',
        'aprobado' => 'Aprobado',
        'firmado' => 'Firmado',
        'rescindido' => 'Rescindido',
        'archivado' => 'Archivado',
    ];

    /** Crea un aviso de $tipo sobre $convenio para cada usuario de $usuarios. Devuelve cuántos creó. */
    public static function notify(iterable $usuarios, string $tipo, Agreement $convenio, string $texto): int
    {
        $filas = collect($usuarios)
            ->unique('id')
            ->map(fn (User $u) => [
                'usuario_id' => $u->id,
                'convenio_id' => $convenio->id,
                'tipo' => $tipo,
                'texto' => mb_substr($texto, 0, 500),
                'leida' => false,
            ])
            ->values()
            ->all();

        if ($filas !== []) {
            Notification::insert($filas);
        }

        return count($filas);
    }

    // ---- Un método por disparador: eligen los destinatarios y arman el texto ----

    public static function convenioCreado(Agreement $convenio, User $autor): void
    {
        self::notify(
            self::destinatarios($convenio, ['administracion', 'gestion'], $autor),
            'convenio_creado',
            $convenio,
            "Se creó el convenio {$convenio->codigo} «{$convenio->titulo}» en estado Borrador."
        );
    }

    public static function datosModificados(Agreement $convenio, User $autor): void
    {
        self::notify(
            self::destinatarios($convenio, self::INTERNOS, $autor),
            'datos_modificados',
            $convenio,
            "{$autor->name} modificó los datos de {$convenio->codigo} «{$convenio->titulo}»."
        );
    }

    public static function comentario(Agreement $convenio, User $autor): void
    {
        self::notify(
            self::destinatarios($convenio, self::INTERNOS, $autor),
            'comentario',
            $convenio,
            "{$autor->name} comentó en {$convenio->codigo} «{$convenio->titulo}»."
        );
    }

    /** Cambio de estado: pasar a revisión y rescindir tienen su propio aviso */
    public static function cambioEstado(Agreement $convenio, User $autor, string $desde, string $hasta, ?string $fundamento = null): void
    {
        $nombre = "{$convenio->codigo} «{$convenio->titulo}»";
        $cambio = 'pasó de '.self::ESTADOS[$desde].' a '.self::ESTADOS[$hasta];

        if ($hasta === 'revision') {
            // A revisión se le asigna el trabajo; gestión y administración solo ven el cambio
            self::notify(
                self::destinatarios($convenio, ['revision'], $autor),
                'revision_asignada',
                $convenio,
                "Se te asignó la revisión de {$nombre}."
            );
            self::notify(
                self::destinatarios($convenio, ['administracion', 'gestion'], $autor),
                'cambio_estado',
                $convenio,
                "{$nombre} {$cambio}."
            );

            return;
        }

        if ($hasta === 'rescindido') {
            // La rescisión le importa a todos los que ven el convenio, consulta incluida
            self::notify(
                self::destinatarios($convenio, [...self::INTERNOS, 'consulta'], $autor),
                'rescindido',
                $convenio,
                "Se rescindió {$nombre}.".($fundamento ? " Fundamento: {$fundamento}" : '')
            );

            return;
        }

        $detalle = match (true) {
            $hasta === 'borrador' && $fundamento !== null => " Observación: {$fundamento}",
            $hasta === 'firmado' && $convenio->fecha_vencimiento !== null => ' Vence el '.$convenio->fecha_vencimiento->format('d/m/Y').'.',
            default => '',
        };

        self::notify(
            self::destinatarios($convenio, self::INTERNOS, $autor),
            'cambio_estado',
            $convenio,
            "{$nombre} {$cambio}.{$detalle}"
        );
    }

    /** Lo dispara el comando diario avisos:preaviso; no hay autor */
    public static function preaviso(Agreement $convenio): int
    {
        return self::notify(
            self::destinatarios($convenio, ['administracion', 'gestion']),
            'preaviso',
            $convenio,
            "{$convenio->codigo} «{$convenio->titulo}» entró en período de preaviso: vence el "
                .$convenio->fecha_vencimiento->format('d/m/Y').'.'
        );
    }

    /** Usuarios con alguno de esos roles que pueden ver el convenio, sin contar a $excepto */
    private static function destinatarios(Agreement $convenio, array $roles, ?User $excepto = null): Collection
    {
        return User::whereIn('rol', $roles)
            ->where(fn ($q) => $q->whereNull('unidad_id')->orWhere('unidad_id', $convenio->unidad_id))
            ->when($excepto, fn ($q) => $q->where('id', '!=', $excepto->id))
            ->get(['id']);
    }
}
