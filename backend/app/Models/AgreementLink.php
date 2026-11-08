<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgreementLink extends Model
{
    protected $table = 'vinculos_convenio';

    protected $fillable = ['convenio_origen_id', 'convenio_destino_id', 'tipo_vinculo'];

    public function origen(): BelongsTo
    {
        return $this->belongsTo(Agreement::class, 'convenio_origen_id');
    }

    public function destino(): BelongsTo
    {
        return $this->belongsTo(Agreement::class, 'convenio_destino_id');
    }
}