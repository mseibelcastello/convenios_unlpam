<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Rule;
use App\Support\Avisos;
use App\Support\CambiarEstado;
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

    // El token del QR solo sale en la ficha (show), no en listados ni en otras respuestas
    protected $hidden = ['qr_token'];

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

    /**
     * En qué situación está el plazo del convenio hoy ($hoy en "AAAA-MM-DD", hora de Argentina).
     * Solo un firmado está vigente; los demás estados dicen por qué no:
     *  - vigente, proximo_a_vencer (ya entró en el preaviso) o vencido (pasó el vencimiento y sigue firmado)
     *  - en_tramite (borrador, revisión o aprobado: todavía no rige), rescindido o archivado
     * La usan el comando deadlines:check (avisos) y la línea de vida, así las dos dicen lo mismo.
     */
    public function situacion(string $hoy): string
    {
        if ($this->estado !== 'firmado') {
            return in_array($this->estado, ['rescindido', 'archivado'], true) ? $this->estado : 'en_tramite';
        }

        // Firmado sin vencimiento: rige hasta que se rescinda
        if ($this->fecha_vencimiento === null) {
            return 'vigente';
        }

        $vence = $this->fecha_vencimiento->toDateString();
        if ($vence < $hoy) {
            return 'vencido';
        }

        // Sin fecha de preaviso cargada, la regla general (los mismos días que al firmar)
        $preaviso = $this->fecha_preaviso?->toDateString()
            ?? $this->fecha_vencimiento->copy()->subDays(CambiarEstado::DIAS_PREAVISO)->toDateString();

        return $preaviso <= $hoy ? 'proximo_a_vencer' : 'vigente';
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
            // Solo sobre firmados: los que siguen vigentes (o sin vencimiento) y los que ya vencieron
            'vigencia' => ['nullable', Rule::in(['vigente', 'vencido'])],
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

        if (filled($filtros['vigencia'] ?? null)) {
            $hoy = now('America/Argentina/Buenos_Aires')->toDateString();
            $query->where('estado', 'firmado');
            if ($filtros['vigencia'] === 'vencido') {
                $query->whereNotNull('fecha_vencimiento')->where('fecha_vencimiento', '<', $hoy);
            } else {
                $query->where(fn ($q) => $q->whereNull('fecha_vencimiento')->orWhere('fecha_vencimiento', '>=', $hoy));
            }
        }

        return $query;
    }
}