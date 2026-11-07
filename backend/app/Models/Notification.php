<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $table = 'notificaciones';

    public $timestamps = false;

    protected $fillable = ['usuario_id', 'convenio_id', 'tipo', 'leida'];

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
}