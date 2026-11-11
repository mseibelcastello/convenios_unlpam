<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\Unidad;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    private const ESTADOS = ['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'];
    private const TIPOS = ['marco', 'especifico', 'pasantia', 'adenda', 'renovacion', 'sustitucion'];
    private const DIAS_POR_VENCER = 30;
    private const MAXIMO_LISTA = 50;
    private const MOVIMIENTOS = 10;
    private const ZONA = 'America/Argentina/Buenos_Aires';
    private const SIN_VENCIMIENTO = 'sin vencimiento registrado';

    public function __invoke(Request $request): JsonResponse
    {
        $usuario = $request->user();

        $filtros = $request->validate([
            'unidad_id' => ['nullable', 'integer'],
            'anio' => ['nullable', 'digits:4'],
        ]);

        $hoy = now(self::ZONA)->startOfDay();
        $hoyFecha = $hoy->toDateString();

        // Cada consulta parte de cero, con el mismo alcance y los mismos filtros
        $base = fn () => $this->consultaBase($usuario, $filtros);

        $porEstado = $this->conteos($base(), 'estado', self::ESTADOS);
        $porTipo = $this->conteos($base(), 'tipo', self::TIPOS);

        // Firmados: vigentes, vencidos y sin fecha de vencimiento
        $f = $base()->where('estado', 'firmado')
            ->selectRaw(
                'count(*) as total, sum(fecha_vencimiento < ?) as vencidos, sum(fecha_vencimiento is null) as sin_vencimiento',
                [$hoyFecha]
            )
            ->toBase()->first();

        $firmados = (int) $f->total;
        $vencidos = (int) ($f->vencidos ?? 0);

        // DistribuciÃ³n por unidad, incluyendo las que no tienen convenios
        $conteoUnidad = $base()->selectRaw('unidad_id, count(*) as n')->groupBy('unidad_id')->pluck('n', 'unidad_id');
        $unidades = Unidad::query();
        $permitidas = $usuario->unidadesAccesibles();
        if ($permitidas !== null) {
            $unidades->whereIn('id', $permitidas);
        }
        $porUnidad = $unidades->orderBy('sigla')->get()->map(fn (Unidad $u) => [
            'unidad_id' => $u->id,
            'sigla' => $u->sigla,
            'nombre' => $u->nombre,
            'total' => (int) $conteoUnidad->get($u->id, 0),
        ])->all();

        // DistribuciÃ³n por aÃ±o de firma
        $porAnio = $base()->whereNotNull('fecha_firma')
            ->selectRaw('YEAR(fecha_firma) as anio, count(*) as n')
            ->groupBy('anio')->orderBy('anio')
            ->toBase()->get()
            ->map(fn ($r) => ['anio' => (int) $r->anio, 'total' => (int) $r->n])->all();

        $sinFirma = $base()->whereNull('fecha_firma')->count();

        // Personas Ãºnicas dentro del alcance; Consulta no ve datos personales
        $ids = $base()->pluck('id')->all();
        $personas = null;
        if ($usuario->rol !== 'consulta') {
            $personas = DB::table('convenio_persona')->whereIn('convenio_id', $ids)->distinct()->count('persona_id');
        }

        $limite = $hoy->copy()->addDays(self::DIAS_POR_VENCER)->toDateString();

        $proximos = $this->listaConvenios(
            $base()->where('estado', 'firmado')->whereBetween('fecha_vencimiento', [$hoyFecha, $limite]),
            'fecha_vencimiento', 'asc'
        );

        $vencidosLista = $this->listaConvenios(
            $base()->where('estado', 'firmado')->whereNotNull('fecha_vencimiento')->where('fecha_vencimiento', '<', $hoyFecha),
            'fecha_vencimiento', 'desc'
        );

        $ultimoAnio = $this->listaConvenios(
            $base()->where('estado', 'firmado')->where('fecha_firma', '>=', $hoy->copy()->subYear()->toDateString()),
            'fecha_firma', 'desc'
        );

        return response()->json([
            'generado_en' => now(self::ZONA)->toIso8601String(),
            'filtros' => [
                'unidad_id' => $filtros['unidad_id'] ?? null,
                'anio' => $filtros['anio'] ?? null,
            ],
            'total' => array_sum($porEstado),
            'por_estado' => $porEstado,
            'por_tipo' => $porTipo,
            'firmados' => [
                'total' => $firmados,
                'vigentes' => $firmados - $vencidos,
                'vencidos' => $vencidos,
                'sin_vencimiento_registrado' => (int) ($f->sin_vencimiento ?? 0),
            ],
            'por_unidad' => $porUnidad,
            'por_anio_firma' => $porAnio,
            'sin_fecha_firma' => $sinFirma,
            'personas_unicas' => $personas,
            'proximos_a_vencer' => ['dias' => self::DIAS_POR_VENCER] + $proximos,
            'vencidos' => $vencidosLista,
            'firmados_ultimo_anio' => $ultimoAnio,
            'ultimos_movimientos' => $this->movimientos($ids),
        ]);
    }

    /** Convenios que el usuario puede ver, con los filtros del pedido */
    private function consultaBase(User $usuario, array $filtros): Builder
    {
        $consulta = Agreement::visiblesPara($usuario);

        if (filled($filtros['unidad_id'] ?? null)) {
            $consulta->where('unidad_id', $filtros['unidad_id']);
        }
        if (filled($filtros['anio'] ?? null)) {
            $consulta->where('codigo', 'like', "CONV-{$filtros['anio']}-%");
        }

        return $consulta;
    }

    /** Cantidades por valor, con 0 para los que no aparecen */
    private function conteos(Builder $consulta, string $campo, array $valores): array
    {
        $resultado = array_fill_keys($valores, 0);

        $filas = $consulta->selectRaw("$campo, count(*) as n")->groupBy($campo)->pluck('n', $campo);
        foreach ($filas as $valor => $n) {
            $resultado[$valor] = (int) $n;
        }

        return $resultado;
    }

    private function listaConvenios(Builder $consulta, string $orden, string $sentido): array
    {
        $total = (clone $consulta)->count();

        $convenios = $consulta->orderBy($orden, $sentido)->orderBy('codigo')
            ->limit(self::MAXIMO_LISTA)->get()
            ->map(fn (Agreement $c) => $this->item($c))->all();

        return ['total' => $total, 'convenios' => $convenios];
    }

    private function item(Agreement $c): array
    {
        $vencimiento = $c->fecha_vencimiento?->toDateString();

        return [
            'id' => $c->id,
            'codigo' => $c->codigo,
            'titulo' => $c->titulo,
            'tipo' => $c->tipo,
            'estado' => $c->estado,
            'unidad_id' => $c->unidad_id,
            'fecha_firma' => $c->fecha_firma?->toDateString(),
            'fecha_vencimiento' => $vencimiento,
            'fecha_preaviso' => $c->fecha_preaviso?->toDateString(),
            'vencimiento' => $vencimiento ?? self::SIN_VENCIMIENTO,
        ];
    }

    /** Ãšltimos cambios de estado y subidas de documentos de los convenios del alcance */
    private function movimientos(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $campos = ['a.id', 'a.fecha', 'a.accion', 'u.name as usuario', 'c.id as convenio_id', 'c.codigo', 'c.titulo'];

        $estados = DB::table('auditoria as a')
            ->join('users as u', 'u.id', '=', 'a.usuario_id')
            ->join('convenios as c', 'c.id', '=', 'a.entidad_id')
            ->where('a.accion', 'cambiar estado')
            ->where('a.entidad', 'convenios')
            ->whereIn('a.entidad_id', $ids)
            ->orderByDesc('a.fecha')->orderByDesc('a.id')
            ->limit(self::MOVIMIENTOS)
            ->get([...$campos, 'a.estado_anterior', 'a.estado_nuevo', 'a.fundamento']);

        $subidas = DB::table('auditoria as a')
            ->join('users as u', 'u.id', '=', 'a.usuario_id')
            ->join('documentos as d', 'd.id', '=', 'a.entidad_id')
            ->join('convenios as c', 'c.id', '=', 'd.convenio_id')
            ->where('a.accion', 'subir')
            ->where('a.entidad', 'documentos')
            ->whereIn('d.convenio_id', $ids)
            ->orderByDesc('a.fecha')->orderByDesc('a.id')
            ->limit(self::MOVIMIENTOS)
            ->get([...$campos, 'd.tipo as documento_tipo']);

        return $estados->concat($subidas)
            ->sort(fn ($x, $y) => [$y->fecha, $y->id] <=> [$x->fecha, $x->id])
            ->take(self::MOVIMIENTOS)
            ->map(fn ($m) => [
                // La base guarda UTC (Paso 0); se muestra con la zona de Argentina
                'fecha' => Carbon::parse($m->fecha, 'UTC')->setTimezone(self::ZONA)->toIso8601String(),
                'accion' => $m->accion,
                'usuario' => $m->usuario,
                'convenio_id' => $m->convenio_id,
                'codigo' => $m->codigo,
                'titulo' => $m->titulo,
                'estado_anterior' => $m->estado_anterior ?? null,
                'estado_nuevo' => $m->estado_nuevo ?? null,
                'fundamento' => $m->fundamento ?? null,
                'documento_tipo' => $m->documento_tipo ?? null,
            ])
            ->values()->all();
    }
}
