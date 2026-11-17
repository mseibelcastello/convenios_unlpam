<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Rule;
use App\Support\Avisos;
use Illuminate\Support\Facades\DB;

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
            'fecha_firma' => 'date:Y-m-d',
            'fecha_inicio' => 'date:Y-m-d',
            'fecha_vencimiento' => 'date:Y-m-d',
            'fecha_preaviso' => 'date:Y-m-d',
        ];
    }

    public function unidad(): BelongsTo
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }

    /**
     * Edición con control optimista: un solo UPDATE condicionado a la versión y al estado.
     * Si otra persona editó antes (o el convenio ya salió de borrador) no toca ninguna fila.
     * Devuelve [resultado, convenio]: 'aplicado' con el convenio nuevo; 'conflicto' o 'no_borrador'
     * con el convenio como está hoy; 'no_encontrado' con null. Lo usan PUT /agreements/{id} y POST /sync.
     */
    public static function editarConVersion(User $usuario, int $id, array $campos, int $version): array
    {
        $filas = static::where('id', $id)
            ->where('version', $version)
            ->where('estado', 'borrador')
            ->update($campos + ['version' => DB::raw('version + 1')]);

        if ($filas === 0) {
            $actual = static::visiblesPara($usuario)->with('unidad')->find($id);

            if (! $actual) {
                return ['no_encontrado', null];
            }

            return [$actual->estado !== 'borrador' ? 'no_borrador' : 'conflicto', $actual];
        }

        $actualizado = static::with('unidad')->findOrFail($id);
        Avisos::datosModificados($actualizado, $usuario);

        return ['aplicado', $actualizado];
    }

    public function observaciones(): HasMany
    {
        return $this->hasMany(Observation::class, 'convenio_id');
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

    /** Reglas de validación de los filtros del listado y de la exportación */
    public static function reglasFiltros(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'tipo' => ['nullable', Rule::in(['marco', 'especifico', 'pasantia', 'adenda', 'renovacion', 'sustitucion'])],
            'estado' => ['nullable', Rule::in(['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'])],
            'unidad_id' => ['nullable', 'integer'],
            'anio' => ['nullable', 'digits:4'],
        ];
    }

    public function scopeFiltrar(Builder $query, array $filtros): Builder
    {
        if (filled($filtros['q'] ?? null)) {
            $texto = '%'.addcslashes($filtros['q'], '%_\\').'%';
            $query->where(fn ($q) => $q->where('codigo', 'like', $texto)->orWhere('titulo', 'like', $texto));
        }

        foreach (['tipo', 'estado', 'unidad_id'] as $campo) {
            if (filled($filtros[$campo] ?? null)) {
                $query->where($campo, $filtros[$campo]);
            }
        }

        if (filled($filtros['anio'] ?? null)) {
            $query->where('codigo', 'like', "CONV-{$filtros['anio']}-%");
        }

        return $query;
    }
}