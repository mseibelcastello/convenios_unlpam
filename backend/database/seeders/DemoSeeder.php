<?php

namespace Database\Seeders;

use App\Models\Agreement;
use App\Models\AgreementLink;
use App\Models\AuditLog;
use App\Models\Comment;
use App\Models\Document;
use App\Models\Notification;
use App\Models\Observation;
use App\Models\Party;
use App\Models\Person;
use App\Models\Signature;
use App\Models\Unidad;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

// Datos de demostración: convenios reales de la Facultad de Ingeniería (fuentes públicas), pocos pero completos.
// Los usuarios son ficticios. El estado de algunos convenios es de demostración, para mostrar todo el circuito.
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(UnidadesSeeder::class);
        $fi = Unidad::where('sigla', 'FI')->first();

        // Usuarios (contraseña "password"; el modelo la guarda con hash)
        $usuarios = [
            ['name' => 'Admin Demo',    'email' => 'admin@demo.test',    'rol' => 'administracion', 'unidad_id' => null],
            ['name' => 'Gestión Demo',  'email' => 'gestion@demo.test',  'rol' => 'gestion',        'unidad_id' => $fi->id],
            ['name' => 'Revisión Demo', 'email' => 'revision@demo.test', 'rol' => 'revision',       'unidad_id' => $fi->id],
            ['name' => 'Consulta Demo', 'email' => 'consulta@demo.test', 'rol' => 'consulta',       'unidad_id' => null],
        ];
        foreach ($usuarios as $usuario) {
            User::create($usuario + ['password' => 'password']);
        }
        $admin = User::where('email', 'admin@demo.test')->first();
        $gestion = User::where('email', 'gestion@demo.test')->first();
        $revision = User::where('email', 'revision@demo.test')->first();

        // Convenios reales de la Facultad de Ingeniería (informe de gestión 2024 y notas de prensa).
        // El estado de algunos es de demostración, para poder mostrar todo el circuito de trabajo.
        $unlpam = Party::create([
            'nombre' => 'Universidad Nacional de La Pampa', 'tipo' => 'universidad',
            'representante' => 'Francisco Gabriel Marull', 'cargo_representante' => 'Rector',
        ]);
        $texto = 'Según el texto del convenio (no publicado en las fuentes consultadas).';
        $fuente = 'Fuente: Informe de Gestión 2024 de la Facultad de Ingeniería (ing.unlpam.edu.ar).';

        // codigo => [tipo, estado, titulo, objeto, contraparte [nombre, tipo, representante, cargo], firma, resolucion, notas]
        $definiciones = [
            '101' => ['marco', 'firmado', 'Convenio marco de prácticas profesionales con EMPATEL',
                'Desarrollar prácticas profesionales asistidas y supervisadas para estudiantes de la Facultad de Ingeniería en la Empresa Pampeana de Telecomunicaciones.',
                ['EMPATEL - Empresa Pampeana de Telecomunicaciones', 'empresa', 'Andrés Zulueta', 'Presidente'],
                '2026-08-04', null, 'Fuente: nota de EMPATEL del 04/08/2026. Firmaron el presidente de EMPATEL y el decano Daniel Mandrile.'],
            '111' => ['marco', 'firmado', 'Convenio marco con la Universidad Nacional de Villa Mercedes',
                'Convenio marco de cooperación con la Escuela de Ingeniería y Ciencias Ambientales de la Universidad Nacional de Villa Mercedes.',
                ['Universidad Nacional de Villa Mercedes', 'universidad'],
                '2024-05-09', null, $fuente],
            '112' => ['especifico', 'firmado', 'Convenio específico con la Universidad Nacional de Villa Mercedes',
                'Aprovechar infraestructuras educativas existentes mediante el intercambio de docentes y el uso de instalaciones para dictar asignaturas a estudiantes de grado de ambas facultades.',
                ['Universidad Nacional de Villa Mercedes', 'universidad'],
                '2024-08-16', null, $fuente.' Se apoya en el convenio marco firmado el 9 de mayo de 2024.'],
            '110' => ['especifico', 'firmado', 'Convenio de colaboración con el Ministerio de la Producción de La Pampa',
                'Intercambio de información técnica y científica y de recursos humanos; investigación, capacitación, difusión y extensión; promoción tecnológica; proyectos y servicios a terceros.',
                ['Ministerio de la Producción de La Pampa', 'organismo_publico'],
                '2024-01-03', null, $fuente],
            '105' => ['marco', 'aprobado', 'Convenio marco de colaboración recíproca con Milenaria S.A.',
                'Colaboración recíproca entre la Facultad de Ingeniería y la empresa.',
                ['Milenaria S.A.', 'empresa'],
                null, 'CS 026/2024', $fuente.' La fuente no indica la fecha de firma; el estado es de demostración.'],
            '104' => ['pasantia', 'aprobado', 'Convenio marco de pasantías educativas con Milenaria S.A.',
                'Pasantías educativas de estudiantes de la Facultad de Ingeniería en la empresa.',
                ['Milenaria S.A.', 'empresa'],
                null, 'CS 007/2024', $fuente.' La fuente no indica la fecha de firma; el estado es de demostración.'],
            '106' => ['pasantia', 'revision', 'Convenio marco de pasantías educativas con Fedea S.A.',
                'Pasantías educativas de estudiantes de la Facultad de Ingeniería en la empresa.',
                ['Fedea S.A.', 'empresa'],
                null, 'CS 529/2023', $fuente.' El estado es de demostración.'],
            '113' => ['especifico', 'borrador', 'Convenio específico con la Facultad de Ingeniería de la Universidad Nacional de San Juan',
                'Desarrollo de asignaturas de la carrera Ingeniería Biomédica del plan de estudios vigente de la Facultad de Ingeniería de la UNLPam.',
                ['Universidad Nacional de San Juan - Facultad de Ingeniería', 'universidad'],
                null, null, $fuente.' Se firmó en noviembre de 2024; el estado es de demostración.'],
        ];

        $c = [];
        foreach ($definiciones as $num => [$tipo, $estado, $titulo, $objeto, $contraparte, $firma, $resolucion, $notas]) {
            $firma = $firma ? now()->parse($firma) : null;
            $convenio = Agreement::create([
                'codigo' => "CONV-2026-$num", 'titulo' => $titulo, 'tipo' => $tipo, 'unidad_id' => $fi->id,
                'estado' => $estado, 'objeto' => $objeto, 'alcance' => $texto, 'obligaciones' => $texto,
                'condiciones_rescision' => $texto, 'resolucion' => $resolucion, 'notas' => $notas,
                'marco_legal' => 'Estatuto de la UNLPam y normativa del Consejo Superior.',
                'fecha_firma' => $firma, 'fecha_inicio' => $firma,
            ]);
            $parte = Party::firstOrCreate(
                ['nombre' => $contraparte[0]],
                ['tipo' => $contraparte[1], 'representante' => $contraparte[2] ?? null, 'cargo_representante' => $contraparte[3] ?? null],
            );
            $convenio->partes()->attach($unlpam->id, ['rol_parte' => 'UNLPam']);
            $convenio->partes()->attach($parte->id, ['rol_parte' => 'contraparte']);
            $c[$num] = $convenio;
        }

        // Vínculos: origen = convenio nuevo, destino = antecedente
        foreach ([['112', '111', 'se_apoya_en'], ['104', '105', 'se_apoya_en']] as [$origen, $destino, $tipo]) {
            AgreementLink::create([
                'convenio_origen_id' => $c[$origen]->id, 'convenio_destino_id' => $c[$destino]->id, 'tipo_vinculo' => $tipo,
            ]);
        }

        // Personas reales que figuran en las fuentes
        $mandrile = Person::create(['nombre' => 'Daniel Mandrile (Decano Fac. de Ingeniería)']);
        $zulueta = Person::create(['nombre' => 'Andrés Zulueta (Presidente de EMPATEL)']);
        $garcia = Person::create(['nombre' => 'Néstor García (Secretario Académico Fac. de Ingeniería)']);
        $c['101']->personas()->attach([
            $mandrile->id => ['rol' => 'representante'],
            $zulueta->id => ['rol' => 'representante'],
            $garcia->id => ['rol' => 'responsable'],
        ]);

        // Documentos: un PDF simple por cada uno (el texto completo de los convenios no es público)
        $this->documento($c['101'], 'principal', 'convenio-marco-empatel.pdf', $admin);
        $this->documento($c['111'], 'principal', 'convenio-marco-unvm.pdf', $admin);
        $this->documento($c['112'], 'principal', 'convenio-especifico-unvm.pdf', $admin);
        $this->documento($c['105'], 'principal', 'convenio-marco-milenaria.pdf', $gestion);
        $this->documento($c['105'], 'resolucion', 'resolucion-cs-026-2024.pdf', $gestion);
        $this->documento($c['105'], 'dictamen', 'dictamen-legal-milenaria.pdf', $revision);
        $this->documento($c['106'], 'principal', 'convenio-pasantias-fedea-borrador.pdf', $gestion);

        // Firmas de los convenios firmados de la cadena y de EMPATEL (Santa Rosa, La Pampa)
        foreach (['101', '111', '112'] as $num) {
            Signature::create([
                'convenio_id' => $c[$num]->id, 'usuario_id' => $admin->id,
                'latitud' => -36.620300, 'longitud' => -64.290700,
            ]);
        }

        // Una observación y un comentario en el convenio que está en revisión
        Observation::create([
            'convenio_id' => $c['106']->id, 'autor_id' => $revision->id,
            'contenido' => 'Falta indicar la duración de las pasantías y la carga horaria máxima semanal.',
        ]);
        Comment::create([
            'convenio_id' => $c['106']->id, 'usuario_id' => $gestion->id,
            'contenido' => 'Lo consulto con la empresa y lo agrego al texto.',
        ]);

        // Historial de estados (alimenta "Últimos movimientos" de Inicio)
        $historial = [
            ['111', $gestion, 'borrador', 'revision', 9], ['111', $revision, 'revision', 'aprobado', 8], ['111', $admin, 'aprobado', 'firmado', 7],
            ['112', $gestion, 'borrador', 'revision', 6], ['112', $revision, 'revision', 'aprobado', 5], ['112', $admin, 'aprobado', 'firmado', 4],
            ['105', $gestion, 'borrador', 'revision', 4], ['105', $revision, 'revision', 'aprobado', 2],
            ['106', $gestion, 'borrador', 'revision', 1],
        ];
        foreach ($historial as [$num, $usuario, $de, $a, $dias]) {
            $registro = AuditLog::create([
                'usuario_id' => $usuario->id, 'accion' => 'cambiar estado', 'entidad' => 'convenios',
                'entidad_id' => $c[$num]->id, 'estado_anterior' => $de, 'estado_nuevo' => $a,
            ]);
            $registro->forceFill(['fecha' => now()->subDays($dias)])->save();
        }

        // Avisos
        Notification::create([
            'usuario_id' => $admin->id, 'convenio_id' => $c['105']->id, 'tipo' => 'cambio_estado',
            'texto' => "{$c['105']->codigo} fue aprobado y está listo para firmar.",
        ]);
        Notification::create([
            'usuario_id' => $admin->id, 'convenio_id' => $c['104']->id, 'tipo' => 'cambio_estado',
            'texto' => "{$c['104']->codigo} fue aprobado y está listo para firmar.",
        ]);
        Notification::create([
            'usuario_id' => $gestion->id, 'convenio_id' => $c['106']->id, 'tipo' => 'comentario',
            'texto' => "Revisión dejó una observación en {$c['106']->codigo}.",
        ]);
        Notification::create([
            'usuario_id' => $gestion->id, 'convenio_id' => $c['112']->id, 'tipo' => 'cambio_estado',
            'texto' => "{$c['112']->codigo} fue firmado.", 'leida' => true,
        ]);
    }

    // Crea un PDF de una página y lo guarda en el disco privado, igual que la subida de la API
    private function documento(Agreement $convenio, string $tipo, string $nombre, User $subio): void
    {
        $texto = "{$convenio->codigo} - {$convenio->titulo} ($tipo)";
        $pdf = $this->pdf($texto);
        $ruta = "convenios/{$convenio->id}/$tipo/".Str::uuid().'.pdf';
        Storage::disk('local')->put($ruta, $pdf);

        $documento = Document::create([
            'convenio_id' => $convenio->id, 'tipo' => $tipo, 'nombre_original' => $nombre, 'version' => 1,
            'ruta_privada' => $ruta, 'tamano_bytes' => strlen($pdf), 'sha256' => hash('sha256', $pdf),
            'subido_por' => $subio->id,
        ]);
        AuditLog::create([
            'usuario_id' => $subio->id, 'accion' => 'subir', 'entidad' => 'documentos', 'entidad_id' => $documento->id,
        ]);
    }

    // PDF mínimo (una página A4 con una línea de texto), escrito a mano para no depender de una librería
    private function pdf(string $texto): string
    {
        $texto = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], iconv('UTF-8', 'ASCII//TRANSLIT', $texto));
        $contenido = "BT /F1 16 Tf 60 780 Td ($texto) Tj ET";
        $objetos = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length '.strlen($contenido)." >>\nstream\n$contenido\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pdf = "%PDF-1.4\n";
        $posiciones = [];
        foreach ($objetos as $i => $objeto) {
            $posiciones[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n$objeto\nendobj\n";
        }
        $inicio = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objetos) + 1)."\n0000000000 65535 f \n";
        foreach ($posiciones as $p) {
            $pdf .= sprintf("%010d 00000 n \n", $p);
        }
        return $pdf."trailer\n<< /Size ".(count($objetos) + 1)." /Root 1 0 R >>\nstartxref\n$inicio\n%%EOF\n";
    }
}
