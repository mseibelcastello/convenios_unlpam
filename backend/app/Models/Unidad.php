<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

   class Unidad extends Model
{
    protected $table = 'unidades';

    protected $fillable = ['nombre', 'sigla'];

    public function usuarios(): HasMany
    {
        return $this->hasMany(User::class, 'unidad_id');
    }
}

