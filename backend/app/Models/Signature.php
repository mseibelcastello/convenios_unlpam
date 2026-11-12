<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Signature extends Model
{
    private const ZONA = 'America/Argentina/Buenos_Aires';

    protected $table = 'firmas';

    public $timestamps = false;

    protected $fillable = ['convenio_id', 'usuario_id', 'latitud', 'longitud'];

    protected function casts(): array
    {
        return [
            'latitud' => 'float',
            'longitud' => 'float',
            'firmado_en' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    /** La firma de un convenio en formato de la API, o null si no tiene */
    public static function deConvenio(int $convenioId): ?array
    {
        $firma = static::with('usuario:id,name')->where('convenio_id', $convenioId)->first();

        if (! $firma) {
            return null;
        }

        return [
            'usuario' => $firma->usuario ? ['id' => $firma->usuario->id, 'nombre' => $firma->usuario->name] : null,
            'fecha' => $firma->firmado_en?->copy()->setTimezone(self::ZONA)->toIso8601String(),
            'latitud' => $firma->latitud,
            'longitud' => $firma->longitud,
        ];
    }
}