<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AgreementLink;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * GET /agreements/{id}/lifeline: la "línea de vida" de un convenio.
 * Toda la cadena de antecedentes y derivados (marco, específicos, adendas, renovaciones...), no solo el
 * primer nivel, ordenada por fecha, con la situación de cada tramo: vigente, próximo a vencer, vencido, etc.
 */
class LifelineController extends Controller
{
    private const ZONA = 'America/Argentina/Buenos_Aires';

    // Tope de seguridad: una cadena real tiene unos pocos tramos
    private const MAX_TRAMOS = 200;

    public function __invoke(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        // Fuera del alcance del usuario = 404, como la ficha
        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);

        [$ids, $vinculos] = $this->cadena($usuario, $convenio->id);

        $hoy = now(self::ZONA)->toDateString();
        $convenios = Agreement::with('unidad:id,sigla,nombre')->whereIn('id', $ids)->get()->keyBy('id');

        $tramos = $convenios
            ->map(fn (Agreement $c) => $this->tramo($c, $hoy, $convenio->id, $vinculos, $convenios))
            // Por fecha: inicio (o firma si no tiene); los que todavía no tienen fechas, al final
            ->sortBy(fn (array $t) => [$t['fecha_inicio'] ?? $t['fecha_firma'] ?? '9999-12-31', $t['id']])
            ->values();

        return response()->json([
            'convenio_id' => $convenio->id,
            'hoy' => $hoy,
            'resumen' => [
                'tramos' => $tramos->count(),
                'vigentes' => $tramos->where('situacion', 'vigente')->count(),
                'proximos_a_vencer' => $tramos->where('situacion', 'proximo_a_vencer')->count(),
                'vencidos' => $tramos->where('situacion', 'vencido')->count(),
                'en_tramite' => $tramos->where('situacion', 'en_tramite')->count(),
            ],
            'tramos' => $tramos,
        ]);
    }

    /**
     * Recorre los vínculos en las dos direcciones desde el convenio pedido.
     * Solo pasa por convenios que el usuario puede ver: uno de otra unidad no aparece
     * ni sirve de puente para descubrir otros. Devuelve [ids de la cadena, vínculos entre ellos].
     */
    private function cadena(User $usuario, int $inicio): array
    {
        $conocidos = [$inicio => true];
        $frontera = [$inicio];
        $vinculos = collect();

        while ($frontera !== [] && count($conocidos) < self::MAX_TRAMOS) {
            $nuevos = AgreementLink::whereIn('convenio_origen_id', $frontera)
                ->orWhereIn('convenio_destino_id', $frontera)
                ->get();

            $vecinos = [];
            foreach ($nuevos as $vinculo) {
                $vinculos[$vinculo->id] = $vinculo;
                foreach ([$vinculo->convenio_origen_id, $vinculo->convenio_destino_id] as $otro) {
                    if (! isset($conocidos[$otro])) {
                        $vecinos[$otro] = true;
                    }
                }
            }

            $frontera = $vecinos === []
                ? []
                : Agreement::visiblesPara($usuario)->whereIn('id', array_keys($vecinos))->pluck('id')->all();

            foreach ($frontera as $id) {
                $conocidos[$id] = true;
            }
        }

        $ids = array_keys($conocidos);

        // Solo los vínculos entre convenios de la cadena (ninguno hacia uno que no se ve)
        $vinculos = $vinculos->filter(fn ($v) => isset($conocidos[$v->convenio_origen_id], $conocidos[$v->convenio_destino_id]))->values();

        return [$ids, $vinculos];
    }

    private function tramo(Agreement $c, string $hoy, int $consultado, Collection $vinculos, Collection $convenios): array
    {
        $vence = $c->fecha_vencimiento?->toDateString();

        return [
            'id' => $c->id,
            'codigo' => $c->codigo,
            'titulo' => $c->titulo,
            'tipo' => $c->tipo,
            'estado' => $c->estado,
            'unidad' => $c->unidad?->sigla,
            'fecha_firma' => $c->fecha_firma?->toDateString(),
            'fecha_inicio' => $c->fecha_inicio?->toDateString(),
            'fecha_vencimiento' => $vence,
            // vigente, proximo_a_vencer, vencido, en_tramite, rescindido o archivado (misma regla que los avisos)
            'situacion' => $c->situacion($hoy),
            // Negativo si ya venció; null si no tiene vencimiento
            // (se comparan solo las fechas: con horas y zonas distintas se perdería un día)
            'dias_para_vencer' => $vence === null ? null : (int) Carbon::parse($hoy)->diffInDays(Carbon::parse($vence), false),
            'es_el_consultado' => $c->id === $consultado,
            // Con qué otros tramos de la cadena se relaciona, y cómo
            'vinculos' => $vinculos
                ->filter(fn ($v) => $v->convenio_origen_id === $c->id || $v->convenio_destino_id === $c->id)
                ->map(function ($v) use ($c, $convenios) {
                    // "antecedente": el otro es un convenio en el que este se apoya; "derivado": el otro se apoya en este
                    $esOrigen = $v->convenio_origen_id === $c->id;
                    $otro = $convenios[$esOrigen ? $v->convenio_destino_id : $v->convenio_origen_id];

                    return [
                        'tipo_vinculo' => $v->tipo_vinculo,
                        'relacion' => $esOrigen ? 'antecedente' : 'derivado',
                        'convenio_id' => $otro->id,
                        'codigo' => $otro->codigo,
                    ];
                })
                ->values(),
        ];
    }
}
