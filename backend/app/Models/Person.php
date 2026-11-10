<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Person extends Model
{
    protected $table = 'personas';

    protected $fillable = ['nombre', 'legajo'];

    public function convenios(): BelongsToMany
    {
        return $this->belongsToMany(Agreement::class, 'convenio_persona', 'persona_id', 'convenio_id')
            ->withPivot('rol');
    }
}