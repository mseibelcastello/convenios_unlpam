<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Identity extends Model
{
    private const ZONA = 'America/Argentina/Buenos_Aires';

    protected $table = 'identidades';

    public $timestamps = false;

    protected $fillable = [
        'usuario_id', 'firma_ruta', 'firma_en', 'rostro_ruta', 'rostro_en', 'huella_hash', 'huella_en',
    ];

    // Nunca salen en una respuesta
    protected $hidden = ['firma_ruta', 'rostro_ruta', 'huella_hash'];

    protected function casts(): array
    {
        return [
            'firma_en' => 'datetime',
            'rostro_en' => 'datetime',
            'huella_en' => 'datetime',
        ];
    }

    /** Qué tiene registrado el usuario, sin exponer rutas ni hashes */
    public static function estadoDe(int $usuarioId): array
    {
        $identidad = static::where('usuario_id', $usuarioId)->first();

        $campo = fn (?string $valor, $fecha) => [
            'registrada' => $valor !== null,
            'fecha' => $valor !== null ? $fecha?->copy()->setTimezone(self::ZONA)->toIso8601String() : null,
        ];

        $firma = $campo($identidad?->firma_ruta, $identidad?->firma_en);
        $rostro = $campo($identidad?->rostro_ruta, $identidad?->rostro_en);
        $huella = $campo($identidad?->huella_hash, $identidad?->huella_en);

        return [
            'firma' => $firma,
            'rostro' => $rostro,
            'huella' => $huella,
            'completa' => $firma['registrada'] && $rostro['registrada'] && $huella['registrada'],
        ];
    }
}