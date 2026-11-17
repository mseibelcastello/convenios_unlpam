<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Observation extends Model
{
    protected $table = 'observaciones';

    public $timestamps = false;

    protected $fillable = ['convenio_id', 'autor_id', 'contenido'];

    protected function casts(): array
    {
        return [
            'resuelta' => 'boolean',
            'fecha' => 'datetime',
            'respondida_en' => 'datetime',
            'resuelta_en' => 'datetime',
        ];
    }

    public function convenio(): BelongsTo
    {
        return $this->belongsTo(Agreement::class, 'convenio_id');
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'autor_id');
    }

    public function respondidaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'respondida_por');
    }

    public function resueltaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resuelta_por');
    }

    /** Observaciones de un convenio, de la más vieja a la más nueva, ya en formato de la API */
    public static function listaDe(int $convenioId): array
    {
        return static::with(['autor:id,name', 'respondidaPor:id,name', 'resueltaPor:id,name'])
            ->where('convenio_id', $convenioId)
            ->orderBy('id')
            ->get()
            ->map(fn (self $o) => $o->paraApi())
            ->all();
    }

    public function paraApi(): array
    {
        return [
            'id' => $this->id,
            'convenio_id' => $this->convenio_id,
            'contenido' => $this->contenido,
            'autor' => $this->quien($this->autor),
            'fecha' => $this->fecha?->toIso8601String(),
            'respuesta' => $this->respuesta,
            'respondida_por' => $this->quien($this->respondidaPor),
            'respondida_en' => $this->respondida_en?->toIso8601String(),
            'resuelta' => $this->resuelta,
            'resuelta_por' => $this->quien($this->resueltaPor),
            'resuelta_en' => $this->resuelta_en?->toIso8601String(),
        ];
    }

    private function quien(?User $usuario): ?array
    {
        return $usuario ? ['id' => $usuario->id, 'nombre' => $usuario->name] : null;
    }
}