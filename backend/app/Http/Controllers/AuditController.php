<?php

namespace App\Http\Controllers;

use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AuditController extends Controller
{
    private const ZONA = 'America/Argentina/Buenos_Aires';

    private const POR_PAGINA = 25;

    public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'convenio_id' => ['nullable', 'integer', 'min:1'],
            'accion' => ['nullable', 'string', 'max:40'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $consulta = DB::query()->fromSub($this->registros(), 'r');

        if (! empty($filtros['convenio_id'])) {
            $consulta->where('r.convenio_id', $filtros['convenio_id']);
        }
        if (! empty($filtros['accion'])) {
            $consulta->where('r.accion', $filtros['accion']);
        }

        $pagina = $consulta
            ->leftJoin('convenios as c', 'c.id', '=', 'r.convenio_id')
            ->orderByDesc('r.fecha')->orderByDesc('r.id')
            ->select('r.*', 'c.codigo', 'c.titulo')
            ->paginate(self::POR_PAGINA);

        return response()->json([
            'data' => collect($pagina->items())->map(fn ($r) => [
                'id' => $r->id,
                // La base guarda UTC; se muestra con la zona de Argentina
                'fecha' => Carbon::parse($r->fecha, 'UTC')->setTimezone(self::ZONA)->toIso8601String(),
                'usuario' => ['id' => $r->usuario_id, 'nombre' => $r->usuario, 'rol' => $r->rol],
                'accion' => $r->accion,
                'entidad' => $r->entidad,
                'entidad_id' => $r->entidad_id ?: null,
                'convenio' => $r->convenio_id
                    ? ['id' => $r->convenio_id, 'codigo' => $r->codigo, 'titulo' => $r->titulo]
                    : null,
                'estado_anterior' => $r->estado_anterior,
                'estado_nuevo' => $r->estado_nuevo,
                'fundamento' => $r->fundamento,
            ]),
            'meta' => [
                'page' => $pagina->currentPage(),
                'last_page' => $pagina->lastPage(),
                'total' => $pagina->total(),
            ],
            // Opciones para los filtros: solo lo que aparece en la auditoría
            'filtros' => [
                'acciones' => DB::table('auditoria')->distinct()->orderBy('accion')->pluck('accion'),
                'convenios' => DB::query()->fromSub($this->registros(), 'r')
                    ->join('convenios as c', 'c.id', '=', 'r.convenio_id')
                    ->distinct()->orderBy('c.codigo')
                    ->get(['c.id', 'c.codigo', 'c.titulo']),
            ],
        ]);
    }

    /**
     * Cada registro de auditoría con el convenio al que pertenece.
     * Según la entidad, el convenio sale directo o de la fila del documento, observación o comentario.
     */
    private function registros(): Builder
    {
        return DB::table('auditoria as a')
            ->join('users as u', 'u.id', '=', 'a.usuario_id')
            ->leftJoin('documentos as d', fn ($j) => $j->on('d.id', '=', 'a.entidad_id')->where('a.entidad', 'documentos'))
            ->leftJoin('observaciones as o', fn ($j) => $j->on('o.id', '=', 'a.entidad_id')->where('a.entidad', 'observaciones'))
            ->leftJoin('comentarios as cm', fn ($j) => $j->on('cm.id', '=', 'a.entidad_id')->where('a.entidad', 'comentarios'))
            ->select([
                'a.id', 'a.fecha', 'a.usuario_id', 'a.accion', 'a.entidad', 'a.entidad_id',
                'a.estado_anterior', 'a.estado_nuevo', 'a.fundamento',
                'u.name as usuario', 'u.rol',
                // entidad_id 0 en convenios = acción sobre varios (por ejemplo, exportar el listado)
                DB::raw("COALESCE(CASE WHEN a.entidad = 'convenios' AND a.entidad_id > 0 THEN a.entidad_id END, d.convenio_id, o.convenio_id, cm.convenio_id) as convenio_id"),
            ]);
    }
}
