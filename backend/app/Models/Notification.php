<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    private const ZONA = 'America/Argentina/Buenos_Aires';

    protected $table = 'notificaciones';

    public $timestamps = false;

    protected $fillable = ['usuario_id', 'convenio_id', 'tipo', 'texto', 'leida'];

    protected function casts(): array
    {
        return [
            'leida' => 'boolean',
            'fecha' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function convenio(): BelongsTo
    {
        return $this->belongsTo(Agreement::class, 'convenio_id');
    }

    /** Cómo sale un aviso por la API: con los datos del convenio y el enlace a su ficha */
    public function paraApi(): array
    {
        $convenio = $this->convenio;

        return [
            'id' => $this->id,
            'tipo' => $this->tipo,
            'texto' => $this->texto,
            'leida' => $this->leida,
            'fecha' => $this->fecha?->copy()->setTimezone(self::ZONA)->toIso8601String(),
            'convenio' => $convenio ? [
                'id' => $convenio->id,
                'codigo' => $convenio->codigo,
                'titulo' => $convenio->titulo,
                'estado' => $convenio->estado,
                'fecha_vencimiento' => $convenio->fecha_vencimiento?->toDateString(),
            ] : null,
            'enlace' => "/convenios/{$this->convenio_id}",
        ];
    }
}
