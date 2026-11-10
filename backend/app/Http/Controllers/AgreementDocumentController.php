<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AuditLog;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AgreementDocumentController extends Controller
{
    private const TIPOS = ['principal', 'anexo', 'dictamen', 'resolucion', 'otro'];

    public function index(Request $request, int $id): JsonResponse
    {
        // Convenio fuera del alcance del usuario = 404
        $convenio = Agreement::visiblesPara($request->user())->findOrFail($id);

        $documentos = Document::where('convenio_id', $convenio->id)
            ->orderBy('tipo')
            ->orderBy('version')
            ->get();

        return response()->json([
            'data' => $documentos,
            'meta' => ['page' => 1, 'total' => $documentos->count()],
        ]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);

        $tipo = $request->validate([
            'tipo' => ['required', Rule::in(self::TIPOS)],
        ])['tipo'];

        // Revisión solo sube dictámenes
        if ($usuario->rol === 'revision' && $tipo !== 'dictamen') {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        $request->validate([
            'archivo' => [
                'required',
                'file',
                'extensions:pdf',
                'mimetypes:application/pdf',
                'max:20480', // 20 MB = 20.971.520 bytes
            ],
        ]);

        $archivo = $request->file('archivo');
        $ruta = $archivo->getRealPath();

        // Tipo real: un PDF empieza con %PDF-, sin importar el nombre ni lo que diga el cliente
        if (file_get_contents($ruta, false, null, 0, 5) !== '%PDF-') {
            throw ValidationException::withMessages([
                'archivo' => ['El archivo no es un PDF válido'],
            ]);
        }

        $sha256 = hash_file('sha256', $ruta);

        $documento = DB::transaction(function () use ($convenio, $tipo, $archivo, $sha256, $usuario) {
            // Bloquea la fila del convenio: dos subidas a la vez no pueden tomar la misma versión
            Agreement::whereKey($convenio->id)->lockForUpdate()->first();

            $version = (int) Document::where('convenio_id', $convenio->id)
                ->where('tipo', $tipo)
                ->max('version') + 1;

            // Disco "local" = storage/app/private: fuera de public, sin URL de acceso directo
            $rutaPrivada = Storage::disk('local')->putFileAs(
                "convenios/{$convenio->id}/{$tipo}",
                $archivo,
                Str::uuid()->toString().'.pdf'
            );

            if ($rutaPrivada === false) {
                abort(500, 'No se pudo guardar el archivo');
            }

            try {
                $documento = Document::create([
                    'convenio_id' => $convenio->id,
                    'tipo' => $tipo,
                    'nombre_original' => mb_substr($archivo->getClientOriginalName(), 0, 255),
                    'version' => $version,
                    'ruta_privada' => $rutaPrivada,
                    'tamano_bytes' => $archivo->getSize(),
                    'sha256' => $sha256,
                    'subido_por' => $usuario->id,
                ]);

                AuditLog::create([
                    'usuario_id' => $usuario->id,
                    'accion' => 'subir',
                    'entidad' => 'documentos',
                    'entidad_id' => $documento->id,
                ]);
            } catch (\Throwable $e) {
                // Si falla la base, no queda un archivo huérfano en el disco
                Storage::disk('local')->delete($rutaPrivada);
                throw $e;
            }

            return $documento;
        });

        return response()->json($documento->fresh(), 201);
    }
}