<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Observation extends Model
{
    protected $table = 'observaciones';

    public $timestamps = false;

    protected $fillable = ['convenio_id', 'autor_id', 'contenido', 'resuelta'];

    protected function casts(): array
    {
        return [
            'resuelta' => 'boolean',
            'fecha' => 'datetime',
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
}