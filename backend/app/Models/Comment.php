<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comment extends Model
{
    protected $table = 'comentarios';

    public $timestamps = false;

    protected $fillable = ['convenio_id', 'usuario_id', 'contenido'];

    protected function casts(): array
    {
        return ['fecha' => 'datetime'];
    }

    public function convenio(): BelongsTo
    {
        return $this->belongsTo(Agreement::class, 'convenio_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}