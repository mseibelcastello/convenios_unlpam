<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Party extends Model
{
    protected $table = 'partes';

    protected $fillable = ['nombre', 'tipo', 'representante', 'cargo_representante'];

    public function convenios(): BelongsToMany
    {
        return $this->belongsToMany(Agreement::class, 'convenio_parte', 'parte_id', 'convenio_id')
            ->withPivot('rol_parte');
    }
}