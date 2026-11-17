<?php

namespace App\Console\Commands;

use App\Models\Agreement;
use App\Models\Notification;
use App\Support\Avisos;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('deadlines:check')]
#[Description('Avisa los convenios firmados que entraron en preaviso o ya vencieron (una sola vez cada uno)')]
class CheckDeadlines extends Command
{
    private const ZONA = 'America/Argentina/Buenos_Aires';

    public function handle(): int
    {
        // "Hoy" en Argentina: a la medianoche UTC todavía es el día anterior acá
        $hoy = now(self::ZONA)->toDateString();
        $filas = [];

        // Solo los firmados están vigentes: un borrador o uno rescindido no tiene plazo que avisar
        $convenios = Agreement::where('estado', 'firmado')->whereNotNull('fecha_vencimiento')->lazyById();

        foreach ($convenios as $convenio) {
            $tipo = $this->tipoDeAviso($convenio, $hoy);
            if ($tipo === null) {
                continue;
            }

            // Sin duplicar: cada convenio recibe un aviso de preaviso y uno de vencido como mucho
            $yaAvisado = Notification::where('convenio_id', $convenio->id)->where('tipo', $tipo)->exists();

            $creados = $yaAvisado ? 0 : ($tipo === 'vencido' ? Avisos::vencido($convenio) : Avisos::preaviso($convenio));

            $filas[] = [
                $convenio->codigo,
                $tipo,
                $convenio->fecha_vencimiento->format('d/m/Y'),
                $yaAvisado ? 'ya avisado antes' : "{$creados} aviso(s) nuevos",
            ];
        }

        if ($filas === []) {
            $this->info("Hoy ({$hoy}) no hay convenios en preaviso ni vencidos.");
        } else {
            $this->table(['Convenio', 'Situación', 'Vence', 'Resultado'], $filas);
        }

        return self::SUCCESS;
    }

    /** 'vencido', 'preaviso' o null si todavía falta. La regla está en Agreement::situacion (la comparte la línea de vida). */
    private function tipoDeAviso(Agreement $convenio, string $hoy): ?string
    {
        return match ($convenio->situacion($hoy)) {
            'vencido' => 'vencido',
            'proximo_a_vencer' => 'preaviso',
            default => null,
        };
    }
}
