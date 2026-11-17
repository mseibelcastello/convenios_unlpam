<?php

namespace App\Models;

use App\Support\Avisos;
use App\Support\FiltroOfensivo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

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

    /**
     * Guarda un comentario con el filtro de palabras ofensivas, la auditoría y los avisos.
     * Lo usan POST /agreements/{id}/comments y POST /sync.
     */
    public static function publicar(Agreement $convenio, User $usuario, string $texto): self
    {
        // Con una palabra de la lista se guarda solo el aviso: el texto original no queda en ningún lado
        $ofensivo = FiltroOfensivo::esOfensivo($texto);
        $contenido = $ofensivo ? config('moderacion.texto_reemplazo') : $texto;

        $comentario = DB::transaction(function () use ($convenio, $usuario, $contenido, $ofensivo) {
            $comentario = static::create([
                'convenio_id' => $convenio->id,
                'usuario_id' => $usuario->id,
                'contenido' => $contenido,
            ]);

            AuditLog::create([
                'usuario_id' => $usuario->id,
                'accion' => 'crear',
                'entidad' => 'comentarios',
                'entidad_id' => $comentario->id,
                'fundamento' => $ofensivo ? 'Comentario filtrado por palabras ofensivas' : null,
            ]);

            Avisos::comentario($convenio, $usuario);

            return $comentario;
        });

        return $comentario->fresh('usuario');
    }

    public function paraApi(): array
    {
        return [
            'id' => $this->id,
            'convenio_id' => $this->convenio_id,
            'contenido' => $this->contenido,
            'usuario' => $this->usuario
                ? ['id' => $this->usuario->id, 'nombre' => $this->usuario->name]
                : null,
            'fecha' => $this->fecha?->toIso8601String(),
        ];
    }
}
