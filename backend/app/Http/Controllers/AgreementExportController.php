<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AuditLog;
use App\Support\ExportacionPdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AgreementExportController extends Controller
{
    private const MAXIMO = 5000;
    private const ZONA = 'America/Argentina/Buenos_Aires';
    private const SIN_VENCIMIENTO = 'sin vencimiento registrado';

    public function __invoke(Request $request): Response
    {
        $usuario = $request->user();

        $filtros = $request->validate(Agreement::reglasFiltros() + [
            'formato' => ['nullable', Rule::in(['pdf', 'csv'])],
        ]);
        $formato = $filtros['formato'] ?? 'pdf';

        // Los mismos filtros y el mismo alcance que el listado
        $consulta = Agreement::visiblesPara($usuario)
            ->filtrar($filtros)
            ->with('unidad')
            ->orderBy('codigo');

        if ($consulta->count() > self::MAXIMO) {
            throw ValidationException::withMessages([
                'filtros' => ['Son demasiados convenios para exportar. Agregá filtros.'],
            ]);
        }

        $convenios = $consulta->get();
        $ahora = now(self::ZONA);

        $contenido = $formato === 'csv'
            ? $this->csv($convenios)
            : $this->pdf($convenios, $usuario->name, $filtros, $ahora);

        // Se registra recién cuando el archivo ya se generó
        AuditLog::create([
            'usuario_id' => $usuario->id,
            'accion' => 'exportar',
            'entidad' => 'convenios',
            'entidad_id' => 0,
        ]);

        $nombre = 'convenios-'.$ahora->format('Y-m-d').'.'.$formato;

        return response($contenido, 200, [
            'Content-Type' => $formato === 'csv' ? 'text/csv; charset=UTF-8' : 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$nombre.'"',
        ]);
    }

    private function csv(Collection $convenios): string
    {
        $flujo = fopen('php://temp', 'r+');
        fwrite($flujo, "\xEF\xBB\xBF"); // marca BOM: Excel abre bien los acentos

        fputcsv($flujo, [
            'codigo', 'titulo', 'tipo', 'unidad', 'estado',
            'fecha_firma', 'fecha_inicio', 'fecha_vencimiento', 'fecha_preaviso', 'version',
        ], ';', '"', '');

        foreach ($convenios as $c) {
            fputcsv($flujo, array_map($this->segura(...), [
                $c->codigo,
                $c->titulo,
                $c->tipo,
                $c->unidad?->sigla,
                $c->estado,
                $c->fecha_firma?->toDateString(),
                $c->fecha_inicio?->toDateString(),
                $c->fecha_vencimiento?->toDateString(),
                $c->fecha_preaviso?->toDateString(),
                $c->version,
            ]), ';', '"', '');
        }

        rewind($flujo);
        $texto = stream_get_contents($flujo);
        fclose($flujo);

        return $texto;
    }

    /** Una planilla ejecuta como fórmula lo que empieza con = + - @ (o tabulación / salto de línea) */
    private function segura(mixed $valor): string
    {
        $texto = (string) $valor;

        return preg_match('/^[=+\-@\t\r]/', $texto) ? "'".$texto : $texto;
    }

    private function pdf(Collection $convenios, string $quien, array $filtros, Carbon $ahora): string
    {
        $pdf = new ExportacionPdf('L', 'mm', 'A4');
        $pdf->AliasNbPages();
        $pdf->SetAutoPageBreak(false);
        $pdf->SetTitle('Convenios exportados');
        $pdf->SetCreator('Sistema de convenios UNLPam');
        $pdf->AddPage();

        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 8, 'Convenios', 0, 1);
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(0, 5, $this->latin("Generado el {$ahora->format('d/m/Y H:i')} por $quien - {$convenios->count()} convenios"), 0, 1);
        $pdf->Cell(0, 5, $this->latin($this->descripcionFiltros($filtros)), 0, 1);
        $pdf->Ln(3);

        // Ancho total: 277 mm (A4 apaisado con márgenes de 10 mm)
        $columnas = [
            ['Codigo', 28, fn (Agreement $c) => $c->codigo],
            ['Titulo', 95, fn (Agreement $c) => $c->titulo],
            ['Tipo', 24, fn (Agreement $c) => $c->tipo],
            ['Unidad', 20, fn (Agreement $c) => $c->unidad?->sigla ?? ''],
            ['Estado', 22, fn (Agreement $c) => $c->estado],
            ['Firma', 24, fn (Agreement $c) => $c->fecha_firma?->toDateString() ?? '-'],
            ['Vencimiento', 40, fn (Agreement $c) => $c->fecha_vencimiento?->toDateString() ?? self::SIN_VENCIMIENTO],
            ['Preaviso', 24, fn (Agreement $c) => $c->fecha_preaviso?->toDateString() ?? '-'],
        ];

        $encabezado = function () use ($pdf, $columnas) {
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->SetFillColor(230, 230, 230);
            foreach ($columnas as [$titulo, $ancho]) {
                $pdf->Cell($ancho, 7, $titulo, 1, 0, 'L', true);
            }
            $pdf->Ln();
            $pdf->SetFont('Arial', '', 8);
        };

        $encabezado();

        if ($convenios->isEmpty()) {
            $pdf->Cell(0, 8, 'No hay convenios para mostrar con estos filtros.', 0, 1);
        }

        foreach ($convenios as $convenio) {
            if ($pdf->GetY() > 188) {
                $pdf->AddPage();
                $encabezado();
            }

            foreach ($columnas as [, $ancho, $valor]) {
                $pdf->Cell($ancho, 6, $this->ajustar($pdf, (string) $valor($convenio), $ancho), 1);
            }
            $pdf->Ln();
        }

        return $pdf->Output('S');
    }

    private function descripcionFiltros(array $filtros): string
    {
        $activos = collect($filtros)->except('formato')->filter(fn ($valor) => filled($valor));

        if ($activos->isEmpty()) {
            return 'Sin filtros';
        }

        return 'Filtros: '.$activos->map(fn ($valor, $campo) => "$campo=$valor")->implode(', ');
    }

    /** FPDF trabaja en Windows-1252: convierte y recorta el texto para que entre en la celda */
    private function ajustar(\FPDF $pdf, string $texto, float $ancho): string
    {
        $texto = $this->latin($texto);

        if ($pdf->GetStringWidth($texto) <= $ancho - 2) {
            return $texto;
        }

        while ($texto !== '' && $pdf->GetStringWidth($texto.'...') > $ancho - 2) {
            $texto = substr($texto, 0, -1);
        }

        return $texto.'...';
    }

    private function latin(string $texto): string
    {
        return mb_convert_encoding($texto, 'Windows-1252', 'UTF-8');
    }
}
