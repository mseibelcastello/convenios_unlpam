<?php

namespace Database\Seeders;

use App\Models\Unidad;
use Illuminate\Database\Seeder;

// Las 7 facultades y las 3 secretarías del Rectorado de la UNLPam. Se puede correr varias veces: no repite las que ya existen.
class UnidadesSeeder extends Seeder
{
    public function run(): void
    {
        $unidades = [
            'FA' => 'Facultad de Agronomía',
            'FCEyJ' => 'Facultad de Ciencias Económicas y Jurídicas',
            'FCEyN' => 'Facultad de Ciencias Exactas y Naturales',
            'FCH' => 'Facultad de Ciencias Humanas',
            'FCS' => 'Facultad de Ciencias de la Salud',
            'FCV' => 'Facultad de Ciencias Veterinarias',
            'FI' => 'Facultad de Ingeniería',
            // Secretarías del Rectorado (el formulario las separa por el nombre)
            'SA' => 'Secretaría Académica',
            'SIP' => 'Secretaría de Investigación y Posgrado',
            'SCE' => 'Secretaría de Cultura y Extensión',
        ];

        foreach ($unidades as $sigla => $nombre) {
            Unidad::firstOrCreate(['sigla' => $sigla], ['nombre' => $nombre]);
        }
    }
}
