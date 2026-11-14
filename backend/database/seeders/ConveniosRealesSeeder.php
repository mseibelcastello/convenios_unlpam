<?php

namespace Database\Seeders;

use App\Models\Agreement;
use App\Models\AgreementLink;
use App\Models\Party;
use App\Models\Person;
use App\Models\Unidad;
use App\Models\User;
use Illuminate\Database\Seeder;

// Convenios reales de la UNLPam, tomados de fuentes públicas (informe de gestión de la Facultad de Ingeniería,
// páginas de las facultades y notas de prensa). Los textos completos no son públicos: los campos obligatorios que
// no figuran en las fuentes llevan un texto genérico, y cada convenio indica su fuente en "notas".
// Se puede correr varias veces: no repite lo que ya existe.
class ConveniosRealesSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(UnidadesSeeder::class);
        $this->crearUsuarios();
        $this->crearConvenios();
        $this->crearPersonas();
    }

    // Autoridades y docentes reales (páginas oficiales de la UNLPam y de la Facultad de Ingeniería, notas de prensa).
    // La persona solo guarda nombre y legajo, así que el cargo va entre paréntesis en el nombre.
    private function crearPersonas(): void
    {
        $nombres = [
            'marull' => 'Francisco Gabriel Marull (Rector UNLPam)',
            'alpa' => 'Oscar Daniel Alpa (Vicerrector UNLPam, rector hasta 2026)',
            'mandrile' => 'Daniel Mandrile (Decano Fac. de Ingeniería)',
            'salto' => 'Carolina Salto (Vicedecana Fac. de Ingeniería)',
            'garcia' => 'Néstor García (Secretario Académico Fac. de Ingeniería)',
            'elhage' => 'Clarisa Mariela El Hage (Secretaria de Ciencia y Técnica Fac. de Ingeniería)',
            'amigone' => 'Jorge Amigone (Gestión Administrativa Fac. de Ingeniería)',
            'villegas' => 'Fernando Villegas (Docente-investigador Fac. de Ingeniería, Grupo de Mecatrónica Aplicada)',
            'ciordia' => 'Agustina Ciordia (Secretaria Legal y Técnica UNLPam)',
            'zulueta' => 'Andrés Zulueta (Presidente de EMPATEL)',
        ];

        $personas = [];
        foreach ($nombres as $clave => $nombre) {
            $personas[$clave] = Person::firstOrCreate(['nombre' => $nombre]);
        }

        // Solo se vinculan donde la fuente dice quién firmó o participó
        $vinculos = [
            // EMPATEL (04/08/2026): firmaron el decano y el presidente de la empresa; acompañó el secretario académico
            ['CONV-2026-101', 'mandrile', 'representante'],
            ['CONV-2026-101', 'zulueta', 'representante'],
            ['CONV-2026-101', 'garcia', 'responsable'],
            // Estudio de costos eléctricos (11/05/2026): firmó el rector de ese momento
            ['CONV-2026-180', 'alpa', 'representante'],
        ];
        foreach ($vinculos as [$codigo, $clave, $rol]) {
            Agreement::where('codigo', $codigo)->first()
                ?->personas()->syncWithoutDetaching([$personas[$clave]->id => ['rol' => $rol]]);
        }
    }

    // Un usuario de gestión por facultad (contraseña "password"); Ingeniería tiene además revisión y consulta
    private function crearUsuarios(): void
    {
        $facultades = [
            'FA' => 'Agronomía',
            'FCEyJ' => 'Económicas y Jurídicas',
            'FCEyN' => 'Exactas y Naturales',
            'FCH' => 'Humanas',
            'FCS' => 'Ciencias de la Salud',
            'FCV' => 'Veterinarias',
            'FI' => 'Ingeniería',
        ];

        foreach ($facultades as $sigla => $nombre) {
            $this->usuario("gestion.$sigla@demo.test", "Gestión $nombre", 'gestion', $sigla);
        }

        $this->usuario('revision.FI@demo.test', 'Revisión Ingeniería', 'revision', 'FI');
        $this->usuario('consulta.FI@demo.test', 'Consulta Ingeniería', 'consulta', 'FI');
    }

    private function usuario(string $email, string $nombre, string $rol, string $sigla): void
    {
        User::firstOrCreate(
            ['email' => strtolower($email)],
            ['name' => $nombre, 'rol' => $rol, 'unidad_id' => Unidad::where('sigla', $sigla)->value('id'), 'password' => 'password'],
        );
    }

    private function crearConvenios(): void
    {
        $unlpam = Party::firstOrCreate(
            ['nombre' => 'Universidad Nacional de La Pampa'],
            ['tipo' => 'universidad', 'representante' => 'Rector Ficticio', 'cargo_representante' => 'Rector'],
        );

        // Descripción de cada fuente
        $informeFI = 'Fuente: Informe de Gestión 2024 de la Facultad de Ingeniería (ing.unlpam.edu.ar).';
        $sinFirma = ' La fuente no indica la fecha de firma.';

        // Cada convenio: código, tipo, unidad, título, objeto, contraparte(s), fechas, resolución, fuente
        // contraparte = [nombre, tipo, representante, cargo]
        $convenios = [
            // ---------- Facultad de Ingeniería ----------
            [
                'codigo' => 'CONV-2026-101', 'tipo' => 'marco', 'unidad' => 'FI',
                'titulo' => 'Convenio marco de prácticas profesionales con EMPATEL',
                'objeto' => 'Desarrollar prácticas profesionales asistidas y supervisadas para estudiantes de la Facultad de Ingeniería en la Empresa Pampeana de Telecomunicaciones.',
                'partes' => [['EMPATEL - Empresa Pampeana de Telecomunicaciones', 'empresa', 'Andrés Zulueta', 'Presidente']],
                'firma' => '2026-08-04',
                'notas' => 'Fuente: nota de EMPATEL del 04/08/2026. Firmaron el presidente de EMPATEL y el decano Daniel Mandrile. Se suma a los convenios marco de pasantías y de cooperación que ya tenían.',
            ],
            [
                'codigo' => 'CONV-2024-102', 'tipo' => 'pasantia', 'unidad' => 'FI',
                'titulo' => 'Convenio marco de pasantías educativas con Aberturas Pampeanas S.A.',
                'objeto' => 'Pasantías educativas de estudiantes de la Facultad de Ingeniería en la empresa.',
                'partes' => [['Aberturas Pampeanas S.A.', 'empresa']],
                'resolucion' => 'CS 3925/2024', 'notas' => $informeFI.$sinFirma,
            ],
            [
                'codigo' => 'CONV-2024-103', 'tipo' => 'marco', 'unidad' => 'FI',
                'titulo' => 'Convenio marco de colaboración recíproca con Aberturas Pampeanas S.A.',
                'objeto' => 'Colaboración recíproca entre la Facultad de Ingeniería y la empresa.',
                'partes' => [['Aberturas Pampeanas S.A.', 'empresa']],
                'resolucion' => 'CS 425/2024', 'notas' => $informeFI.$sinFirma,
            ],
            [
                'codigo' => 'CONV-2024-104', 'tipo' => 'pasantia', 'unidad' => 'FI',
                'titulo' => 'Convenio marco de pasantías educativas con Milenaria S.A.',
                'objeto' => 'Pasantías educativas de estudiantes de la Facultad de Ingeniería en la empresa.',
                'partes' => [['Milenaria S.A.', 'empresa']],
                'resolucion' => 'CS 007/2024', 'notas' => $informeFI.$sinFirma,
            ],
            [
                'codigo' => 'CONV-2024-105', 'tipo' => 'marco', 'unidad' => 'FI',
                'titulo' => 'Convenio marco de colaboración recíproca con Milenaria S.A.',
                'objeto' => 'Colaboración recíproca entre la Facultad de Ingeniería y la empresa.',
                'partes' => [['Milenaria S.A.', 'empresa']],
                'resolucion' => 'CS 026/2024', 'notas' => $informeFI.$sinFirma,
            ],
            [
                'codigo' => 'CONV-2023-106', 'tipo' => 'pasantia', 'unidad' => 'FI',
                'titulo' => 'Convenio marco de pasantías educativas con Fedea S.A.',
                'objeto' => 'Pasantías educativas de estudiantes de la Facultad de Ingeniería en la empresa.',
                'partes' => [['Fedea S.A.', 'empresa']],
                'resolucion' => 'CS 529/2023', 'notas' => $informeFI.$sinFirma,
            ],
            [
                'codigo' => 'CONV-2024-107', 'tipo' => 'marco', 'unidad' => 'FI',
                'titulo' => 'Convenio marco de colaboración recíproca con Dumas S.A.',
                'objeto' => 'Colaboración recíproca entre la Facultad de Ingeniería y la empresa.',
                'partes' => [['Dumas S.A.', 'empresa']],
                'resolucion' => 'CS 079/2024', 'notas' => $informeFI.$sinFirma,
            ],
            [
                'codigo' => 'CONV-2024-108', 'tipo' => 'marco', 'unidad' => 'FI',
                'titulo' => 'Convenio marco de colaboración recíproca con ACEP La Pampa',
                'objeto' => 'Colaboración recíproca entre la Facultad de Ingeniería y la Asociación Civil Estudios Populares.',
                'partes' => [['ACEP La Pampa - Asociación Civil Estudios Populares', 'asociacion']],
                'resolucion' => 'CS 080/2024', 'notas' => $informeFI.$sinFirma,
            ],
            [
                'codigo' => 'CONV-2024-109', 'tipo' => 'especifico', 'unidad' => 'FI',
                'titulo' => 'Convenio específico con ACEP La Pampa: Diplomatura en Competencias Digitales',
                'objeto' => 'Dictado de la "Diplomatura de Extensión en Competencias Digitales y Ciudadanía Responsable".',
                'partes' => [['ACEP La Pampa - Asociación Civil Estudios Populares', 'asociacion']],
                'firma' => '2024-10-09', 'notas' => $informeFI,
            ],
            [
                'codigo' => 'CONV-2024-110', 'tipo' => 'especifico', 'unidad' => 'FI',
                'titulo' => 'Convenio de colaboración con el Ministerio de la Producción de La Pampa',
                'objeto' => 'Intercambio de información técnica y científica y de recursos humanos; investigación, capacitación, difusión y extensión; grupos de trabajo; promoción tecnológica; proyectos y servicios a terceros.',
                'partes' => [['Ministerio de la Producción de La Pampa', 'organismo_publico']],
                'firma' => '2024-01-03', 'notas' => $informeFI,
            ],
            [
                'codigo' => 'CONV-2024-111', 'tipo' => 'marco', 'unidad' => 'FI',
                'titulo' => 'Convenio marco con la Universidad Nacional de Villa Mercedes',
                'objeto' => 'Convenio marco de cooperación con la Escuela de Ingeniería y Ciencias Ambientales de la Universidad Nacional de Villa Mercedes.',
                'partes' => [['Universidad Nacional de Villa Mercedes', 'universidad']],
                'firma' => '2024-05-09', 'notas' => $informeFI,
            ],
            [
                'codigo' => 'CONV-2024-112', 'tipo' => 'especifico', 'unidad' => 'FI',
                'titulo' => 'Convenio específico con la Universidad Nacional de Villa Mercedes',
                'objeto' => 'Aprovechar infraestructuras educativas existentes mediante el intercambio de docentes y el uso de instalaciones para dictar asignaturas a estudiantes de grado de ambas facultades.',
                'partes' => [['Universidad Nacional de Villa Mercedes', 'universidad']],
                'firma' => '2024-08-16', 'notas' => $informeFI.' Se apoya en el convenio marco firmado el 9 de mayo de 2024.',
            ],
            [
                'codigo' => 'CONV-2024-113', 'tipo' => 'especifico', 'unidad' => 'FI',
                'titulo' => 'Convenio específico con la Facultad de Ingeniería de la Universidad Nacional de San Juan',
                'objeto' => 'Desarrollo de asignaturas de la carrera Ingeniería Biomédica del plan de estudios vigente de la Facultad de Ingeniería de la UNLPam.',
                'partes' => [['Universidad Nacional de San Juan - Facultad de Ingeniería', 'universidad']],
                'marco_legal' => 'Convenio marco entre Universidades Nacionales y Provinciales (Acuerdo plenario 142/94, Convenio CS UNLPam 1/1994).',
                'notas' => $informeFI.' Firmado en noviembre de 2024 (la fuente no indica el día).',
            ],
            [
                'codigo' => 'CONV-2024-114', 'tipo' => 'adenda', 'unidad' => 'FI',
                'titulo' => 'Acuerdo complementario con el Instituto Balseiro para la Práctica Profesional Supervisada',
                'objeto' => 'Usar instalaciones del Instituto Balseiro para la Práctica Profesional Supervisada (PPS) de estudiantes de grado de la Facultad de Ingeniería.',
                'partes' => [['Instituto Balseiro - Universidad Nacional de Cuyo', 'universidad']],
                'marco_legal' => 'Convenio marco UNCuyo - UNLPam (Resolución CS 411/2023) y acuerdo específico de octubre de 2023.',
                'notas' => $informeFI.' Firmado en mayo de 2024 (la fuente no indica el día).',
            ],

            // ---------- Otras facultades ----------
            [
                'codigo' => 'CONV-2026-120', 'tipo' => 'especifico', 'unidad' => 'FCV',
                'titulo' => 'Convenio de cooperación técnica con la Comisión de Fomento de Speluzzi',
                'objeto' => 'Fortalecer la atención clínica, sanitaria y quirúrgica de animales de compañía derivados desde Speluzzi al Hospital Escuela de Animales Pequeños.',
                'partes' => [['Comisión de Fomento de Speluzzi', 'organismo_publico', 'Martín Lisotti', 'Jefe comunal']],
                'firma' => '2026-06-25', 'notas' => 'Fuente: La Arena, 25/06/2026. Firmó el decano Ariel Castaldo.',
            ],
            [
                'codigo' => 'CONV-2022-121', 'tipo' => 'pasantia', 'unidad' => 'FCV',
                'titulo' => 'Convenio de pasantías con la Municipalidad de General Pico (Establecimiento Faenador de Aves)',
                'objeto' => 'Selección del personal técnico de los galpones de cría y del Establecimiento Faenador de Aves mediante pasantías.',
                'partes' => [['Municipalidad de General Pico', 'organismo_publico', 'Fernanda Alonso', 'Intendenta']],
                'notas' => 'Fuente: Maracó Digital, 01/11/2022 (inauguración del establecimiento). La nota no indica la fecha de firma.',
            ],
            [
                'codigo' => 'CONV-2024-130', 'tipo' => 'especifico', 'unidad' => 'FCS',
                'titulo' => 'Convenio particular con la Municipalidad de Victorica: Programa de Formación en Salud Comunitaria',
                'objeto' => 'Dictar el Programa Formativo en Salud Comunitaria entre mayo y noviembre de 2024. La Facultad coordina lo académico y la Municipalidad se hace cargo de los costos.',
                'partes' => [['Municipalidad de Victorica', 'organismo_publico']],
                'firma' => '2024-05-17', 'vence' => '2024-11-30', 'resolucion' => 'Res. Decanato 116/2024',
                'notas' => 'Fuente: salud.unlpam.edu.ar, 20/05/2024. El vencimiento es el fin del programa (noviembre de 2024).',
            ],
            [
                'codigo' => 'CONV-2026-131', 'tipo' => 'especifico', 'unidad' => 'FCS',
                'titulo' => 'Convenio con el Hogar Don Bosco para la formación en salud',
                'objeto' => 'Programas conjuntos de formación en salud. Vigencia inicial de tres años, renovable automáticamente.',
                'partes' => [['Hogar Don Bosco', 'asociacion']],
                'notas' => 'Fuente: publicación de Somos La Pampa en Facebook. La nota no indica la fecha de firma.',
            ],
            [
                'codigo' => 'CONV-2023-140', 'tipo' => 'especifico', 'unidad' => 'FCEyN',
                'titulo' => 'Convenio con la Secretaría de Recursos Hídricos: prácticas comunitarias',
                'objeto' => 'Que estudiantes realicen prácticas comunitarias en el programa "El agua va a tu escuela" y otras campañas de difusión de la Secretaría.',
                'partes' => [['Secretaría de Recursos Hídricos de La Pampa', 'organismo_publico', 'Néstor Lastiri', 'Secretario']],
                'firma' => '2023-05-05', 'notas' => 'Fuente: La Reforma, 05/05/2023. Firmó la decana Nora Ferreyra.',
            ],
            [
                'codigo' => 'CONV-2019-150', 'tipo' => 'especifico', 'unidad' => 'FCEyJ',
                'titulo' => 'Acuerdo de cooperación académica con el Centro de Empleados de Comercio',
                'objeto' => 'Curso gratuito de Derecho Laboral para empleados, delegados y dirigentes sindicales.',
                'partes' => [['Centro de Empleados de Comercio de Santa Rosa', 'asociacion', 'Rodrigo Genoni', 'Secretario adjunto']],
                'marco_legal' => 'Convenio marco vigente entre el Centro de Empleados de Comercio y la UNLPam.',
                'notas' => 'Fuente: eco.unlpam.edu.ar (noviembre de 2019). Firmó el decano Francisco Marull. La nota no indica el día de la firma.',
            ],
            [
                'codigo' => 'CONV-2026-160', 'tipo' => 'especifico', 'unidad' => 'FCH',
                'titulo' => 'Convenio con la Municipalidad de Luan Toro',
                'objeto' => 'Convenio de cooperación entre la Facultad de Ciencias Humanas y la Municipalidad de Luan Toro.',
                'partes' => [['Municipalidad de Luan Toro', 'organismo_publico', 'Mónica Valor', 'Intendenta']],
                'notas' => 'Fuente: publicación de la facultad en Instagram. Firmó el decano Eric Morales Schmuker. La publicación no indica la fecha de firma.',
            ],
            [
                'codigo' => 'CONV-2020-170', 'tipo' => 'marco', 'unidad' => 'FA',
                'titulo' => 'Convenio con el Ministerio de Desarrollo Social de La Pampa',
                'objeto' => 'Transferencia de conocimientos y tecnologías, proyectos de investigación y extensión, asistencia técnica e intercambio de docentes e investigadores.',
                'partes' => [['Ministerio de Desarrollo Social de La Pampa', 'organismo_publico', 'Diego Álvarez', 'Ministro']],
                'firma' => '2020-05-09', 'notas' => 'Fuente: Diario Sur Digital, 09/05/2020 (fecha de la nota). Firmaron el rector Oscar Alpa y la decana Ana Urioste.',
            ],

            // ---------- Rectorado ----------
            [
                'codigo' => 'CONV-2026-180', 'tipo' => 'especifico', 'unidad' => 'SIP',
                'titulo' => 'Modelo General de Costos del Sistema Eléctrico Pampeano (segunda etapa)',
                'objeto' => 'Estudiar la estructura de costos de las 29 cooperativas eléctricas de La Pampa para mejorar su eficiencia, transparencia y equidad tarifaria.',
                'partes' => [
                    ['Gobierno de la Provincia de La Pampa', 'organismo_publico', 'Sergio Ziliotto', 'Gobernador'],
                    ['FEPAMCO - Federación Pampeana de Cooperativas Eléctricas', 'asociacion'],
                ],
                'firma' => '2026-05-11', 'vence' => '2028-05-11',
                'notas' => 'Fuente: Maracó Digital (APN), 11/05/2026. Dura 24 meses. Lo ejecuta la Consultora de la UNLPam; la unidad asignada es una suposición.',
            ],
        ];

        $textoGenerico = 'Según el texto del convenio (no publicado en las fuentes consultadas).';
        $creados = [];

        foreach ($convenios as $c) {
            $firma = isset($c['firma']) ? now()->parse($c['firma']) : null;
            $vence = isset($c['vence']) ? now()->parse($c['vence']) : null;

            $convenio = Agreement::firstOrCreate(['codigo' => $c['codigo']], [
                'titulo' => $c['titulo'],
                'tipo' => $c['tipo'],
                'unidad_id' => Unidad::where('sigla', $c['unidad'])->value('id'),
                'objeto' => $c['objeto'],
                'alcance' => $textoGenerico,
                'obligaciones' => $textoGenerico,
                'condiciones_rescision' => $textoGenerico,
                'marco_legal' => $c['marco_legal'] ?? 'Estatuto de la UNLPam y normativa del Consejo Superior.',
                'resolucion' => $c['resolucion'] ?? null,
                'notas' => $c['notas'],
                // Con fecha de firma figura como firmado; si la fuente no la dice, como aprobado
                'estado' => $firma ? 'firmado' : 'aprobado',
                'fecha_firma' => $firma,
                'fecha_inicio' => $firma,
                'fecha_vencimiento' => $vence,
                'fecha_preaviso' => $vence?->copy()->subDays(60),
            ]);
            $creados[$c['codigo']] = $convenio;

            // Solo se vinculan las partes si el convenio es nuevo
            if ($convenio->wasRecentlyCreated) {
                $convenio->partes()->attach($unlpam->id, ['rol_parte' => 'UNLPam']);
                foreach ($c['partes'] ?? [] as $p) {
                    $parte = Party::firstOrCreate(
                        ['nombre' => $p[0]],
                        ['tipo' => $p[1], 'representante' => $p[2] ?? null, 'cargo_representante' => $p[3] ?? null],
                    );
                    $convenio->partes()->attach($parte->id, ['rol_parte' => 'contraparte']);
                }
            }
        }

        // Vínculos: origen = convenio nuevo, destino = antecedente
        $vinculos = [
            ['CONV-2024-112', 'CONV-2024-111', 'se_apoya_en'],
            ['CONV-2024-109', 'CONV-2024-108', 'se_apoya_en'],
        ];
        foreach ($vinculos as [$origen, $destino, $tipo]) {
            AgreementLink::firstOrCreate([
                'convenio_origen_id' => $creados[$origen]->id,
                'convenio_destino_id' => $creados[$destino]->id,
                'tipo_vinculo' => $tipo,
            ]);
        }
    }
}
