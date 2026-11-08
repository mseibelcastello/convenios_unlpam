<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    protected $table = 'documentos';

    public $timestamps = false;

    protected $fillable = [
        'convenio_id', 'tipo', 'nombre_original', 'version',
        'ruta_privada', 'tamano_bytes', 'sha256', 'subido_por',
    ];

    protected function casts(): array
    {
        return ['subido_en' => 'datetime'];
    }

    public function convenio(): BelongsTo
    {
        return $this->belongsTo(Agreement::class, 'convenio_id');
    }

    public function subidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subido_por');
    }
}