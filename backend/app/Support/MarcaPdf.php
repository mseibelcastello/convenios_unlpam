<?php

namespace App\Support;

use RuntimeException;
use setasign\Fpdi\Fpdi;
use Throwable;

class MarcaPdf
{
    /**
     * Copia las páginas de $origen a un PDF nuevo en $destino, con las propiedades de la marca.
     * Lanza RuntimeException si el PDF no se puede leer (protegido, formato no admitido, dañado).
     */
    public static function aplicar(string $origen, string $destino, array $marca): void
    {
        try {
            $pdf = new Fpdi();
            $paginas = $pdf->setSourceFile($origen);

            for ($pagina = 1; $pagina <= $paginas; $pagina++) {
                $plantilla = $pdf->importPage($pagina);
                $tamano = $pdf->getTemplateSize($plantilla);

                $pdf->AddPage($tamano['orientation'], [$tamano['width'], $tamano['height']]);
                $pdf->useTemplate($plantilla);
            }

            $pdf->SetTitle('Convenio '.$marca['convenio'], true);
            $pdf->SetAuthor($marca['usuario'], true);
            $pdf->SetSubject('Convenio '.$marca['convenio'], true);
            $pdf->SetKeywords(
                "convenio={$marca['convenio']}; usuario={$marca['usuario']}; fecha={$marca['fecha']}",
                true
            );
            $pdf->SetCreator('Sistema de convenios UNLPam', true);

            $pdf->Output('F', $destino);
        } catch (Throwable $e) {
            throw new RuntimeException('No se pudo marcar el PDF: '.$e->getMessage(), 0, $e);
        }
    }
}