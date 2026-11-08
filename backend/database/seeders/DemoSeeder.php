<?php

namespace Database\Seeders;

use App\Models\Agreement;
use App\Models\AgreementLink;
use App\Models\Party;
use App\Models\Unidad;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $hoy = now()->startOfDay();

        // Unidades
        $fcen = Unidad::create(['nombre' => 'Facultad de Ciencias Exactas y Naturales', 'sigla' => 'FCEyN']);
        $fcej = Unidad::create(['nombre' => 'Facultad de Ciencias Económicas y Jurídicas', 'sigla' => 'FCEyJ']);

        // Usuarios (contraseña "password"; el modelo la guarda con hash)
        $usuarios = [
            ['name' => 'Admin Demo',    'email' => 'admin@demo.test',    'rol' => 'administracion', 'unidad_id' => null],
            ['name' => 'Gestión Demo',  'email' => 'gestion@demo.test',  'rol' => 'gestion',        'unidad_id' => $fcen->id],
            ['name' => 'Revisión Demo', 'email' => 'revision@demo.test', 'rol' => 'revision',       'unidad_id' => $fcen->id],
            ['name' => 'Consulta Demo', 'email' => 'consulta@demo.test', 'rol' => 'consulta',       'unidad_id' => null],
        ];
        foreach ($usuarios as $usuario) {
            User::create($usuario + ['password' => 'password']);
        }

        // Partes (todo ficticio)
        $unlpam = Party::create([
            'nombre' => 'Universidad Nacional de La Pampa', 'tipo' => 'universidad',
            'representante' => 'Rector Ficticio', 'cargo_representante' => 'Rector',
        ]);
        $muni = Party::create([
            'nombre' => 'Municipalidad Ejemplo', 'tipo' => 'organismo_publico',
            'representante' => 'Intendente Ficticio', 'cargo_representante' => 'Intendente',
        ]);
        $coop = Party::create([
            'nombre' => 'Cooperativa Ejemplo', 'tipo' => 'asociacion',
            'representante' => 'Presidente Ficticio', 'cargo_representante' => 'Presidente',
        ]);
        $empresa = Party::create([
            'nombre' => 'Empresa Ejemplo S.A.', 'tipo' => 'empresa',
            'representante' => 'Gerente Ficticio', 'cargo_representante' => 'Gerente',
        ]);

        // Texto común de los campos obligatorios
        $base = [
            'objeto' => 'Convenio ficticio para pruebas del sistema.',
            'alcance' => 'Actividades de cooperación descritas en el texto del convenio.',
            'obligaciones' => 'Cada parte aporta los recursos acordados.',
            'condiciones_rescision' => 'Cualquiera de las partes puede rescindir con 60 días de aviso por escrito.',
            'marco_legal' => 'Ley de Educación Superior 24.521 y ordenanzas de la universidad.',
        ];

        // [número, tipo, unidad, estado, título, fecha de firma, vencimiento, contraparte]
        $definiciones = [
            ['001', 'marco',      $fcen, 'firmado',    'Convenio marco de cooperación académica',            $hoy->copy()->subYears(2), $hoy->copy()->addDays(20),  $muni],
            ['002', 'renovacion', $fcen, 'borrador',   'Renovación del convenio marco de cooperación',       null,                      null,                       $muni],
            ['003', 'especifico', $fcen, 'firmado',    'Convenio específico de capacitación docente',        $hoy->copy()->subYear(),   null,                       $coop],
            ['004', 'adenda',     $fcen, 'revision',   'Adenda al convenio de capacitación docente',         null,                      null,                       $coop],
            ['005', 'pasantia',   $fcej, 'aprobado',   'Convenio de pasantías para estudiantes',             null,                      null,                       $empresa],
            ['006', 'especifico', $fcej, 'rescindido', 'Convenio específico de investigación aplicada',      $hoy->copy()->subYear(),   $hoy->copy()->addMonths(6), $coop],
            ['007', 'marco',      $fcej, 'archivado',  'Convenio marco de colaboración institucional',       $hoy->copy()->subYears(5), $hoy->copy()->subYear(),    $muni],
            ['008', 'especifico', $fcej, 'firmado',    'Convenio específico de extensión universitaria',     $hoy->copy()->subYears(2), $hoy->copy()->subDays(30),  $empresa],
        ];

        $convenios = [];
        foreach ($definiciones as [$num, $tipo, $unidad, $estado, $titulo, $firma, $venc, $contraparte]) {
            $convenio = Agreement::create($base + [
                'codigo' => "CONV-2026-$num",
                'titulo' => $titulo,
                'tipo' => $tipo,
                'unidad_id' => $unidad->id,
                'estado' => $estado,
                'fecha_firma' => $firma,
                'fecha_inicio' => $firma,
                'fecha_vencimiento' => $venc,
                'fecha_preaviso' => $venc?->copy()->subDays(60),
            ]);

            $convenio->partes()->attach($unlpam->id, ['rol_parte' => 'UNLPam']);
            $convenio->partes()->attach($contraparte->id, ['rol_parte' => 'contraparte']);

            $convenios[$num] = $convenio;
        }

        // Vínculos: origen = convenio nuevo, destino = antecedente
        $vinculos = [
            ['002', '001', 'renovacion'],
            ['003', '001', 'se_apoya_en'],
            ['004', '003', 'adenda'],
            ['005', '001', 'se_apoya_en'],
        ];
        foreach ($vinculos as [$origen, $destino, $tipo]) {
            AgreementLink::create([
                'convenio_origen_id' => $convenios[$origen]->id,
                'convenio_destino_id' => $convenios[$destino]->id,
                'tipo_vinculo' => $tipo,
            ]);
        }
    }
}