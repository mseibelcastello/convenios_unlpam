<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AuditLog;
use App\Models\Comment;
use App\Support\FiltroOfensivo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommentController extends Controller
{
    private const POR_PAGINA = 20;

    public function index(Request $request, int $id): JsonResponse
    {
        // Convenio fuera del alcance del usuario = 404
        $convenio = Agreement::visiblesPara($request->user())->findOrFail($id);

        $request->validate(['page' => ['nullable', 'integer', 'min:1']]);

        $pagina = Comment::with('usuario:id,name')
            ->where('convenio_id', $convenio->id)
            ->orderBy('id')
            ->paginate(self::POR_PAGINA)
            ->through(fn (Comment $c) => $this->elemento($c));

        return $this->lista($pagina);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);

        $datos = $request->validate([
            'contenido' => ['required', 'string', 'max:2000'],
        ]);

        // Con una palabra de la lista se guarda solo el aviso: el texto original no queda en ningún lado
        $ofensivo = FiltroOfensivo::esOfensivo($datos['contenido']);
        $contenido = $ofensivo ? config('moderacion.texto_reemplazo') : $datos['contenido'];

        $comentario = DB::transaction(function () use ($convenio, $usuario, $contenido, $ofensivo) {
            $comentario = Comment::create([
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

            return $comentario;
        });

        return response()->json($this->elemento($comentario->fresh('usuario')), 201);
    }

    private function elemento(Comment $comentario): array
    {
        return [
            'id' => $comentario->id,
            'convenio_id' => $comentario->convenio_id,
            'contenido' => $comentario->contenido,
            'usuario' => $comentario->usuario
                ? ['id' => $comentario->usuario->id, 'nombre' => $comentario->usuario->name]
                : null,
            'fecha' => $comentario->fecha?->toIso8601String(),
        ];
    }
}