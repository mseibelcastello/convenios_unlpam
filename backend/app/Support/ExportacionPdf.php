<?php

namespace App\Support;

// agrega el número de página al pie
class ExportacionPdf extends \FPDF
{
    public function Footer(): void
    {
        $this->SetY(-10);
        $this->SetFont('Arial', '', 8);
        $this->Cell(0, 5, 'Pagina '.$this->PageNo().' de {nb}', 0, 0, 'C');
    }
}