<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Builder;

class Agreement extends Model
{
    protected $table = 'convenios';

    protected $fillable = [
        'codigo', 'titulo', 'tipo', 'unidad_id', 'objeto', 'alcance',
        'obligaciones', 'condiciones_rescision', 'marco_legal',
        'resolucion', 'expediente', 'condiciones_renovacion',
        'confidencialidad', 'notas', 'fecha_firma', 'fecha_inicio',
        'fecha_vencimiento', 'fecha_preaviso', 'estado', 'version',
    ];

    protected function casts(): array
    {
        return [
            'fecha_firma' => 'date',
            'fecha_inicio' => 'date',
            'fecha_vencimiento' => 'date',
            'fecha_preaviso' => 'date',
            'version' => 'integer',
        ];
    }

    public function unidad(): BelongsTo
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }

    public function partes(): BelongsToMany
    {
        return $this->belongsToMany(Party::class, 'convenio_parte', 'convenio_id', 'parte_id')
            ->withPivot('rol_parte');
    }

    public function personas(): BelongsToMany
    {
        return $this->belongsToMany(Person::class, 'convenio_persona', 'convenio_id', 'persona_id')
            ->withPivot(['rol', 'desde', 'hasta', 'carrera', 'tutor', 'carga_horaria', 'asignacion', 'seguro']);
    }
    
        public function scopeVisiblesPara(Builder $query, User $usuario): Builder
    {
        $unidades = $usuario->unidadesAccesibles();

        return $unidades === null ? $query : $query->whereIn('unidad_id', $unidades);
    }
}