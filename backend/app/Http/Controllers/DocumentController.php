<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AuditLog;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class DocumentController extends Controller
{
    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->documentoAccesible($request, $id));
    }

    public function download(Request $request, int $id): Response
    {
        $usuario = $request->user();

        // Documento de un convenio fuera del alcance del usuario = 404
        $documento = $this->documentoAccesible($request, $id);

        // Consulta solo descarga convenios firmados
        if ($usuario->rol === 'consulta' && $documento->convenio->estado !== 'firmado') {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        $disco = Storage::disk('local');

        if (! $disco->exists($documento->ruta_privada)) {
            return response()->json(['message' => 'Archivo no disponible'], 404);
        }

        // Integridad: el hash de hoy tiene que ser el que se guardó al subirlo
        $hashActual = hash_file('sha256', $disco->path($documento->ruta_privada));

        if (! hash_equals($documento->sha256, $hashActual)) {
            return response()->json([
                'message' => 'Archivo alterado',
                'errors' => ['archivo' => ['El archivo no coincide con su código de control']],
            ], 422);
        }

        AuditLog::create([
            'usuario_id' => $usuario->id,
            'accion' => 'descargar',
            'entidad' => 'documentos',
            'entidad_id' => $documento->id,
        ]);

        return $disco->download($documento->ruta_privada, $documento->nombre_original, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private function documentoAccesible(Request $request, int $id): Document
    {
        $documento = Document::with('convenio')->findOrFail($id);

        // Si el convenio no es visible para este usuario, es como si no existiera
        Agreement::visiblesPara($request->user())->findOrFail($documento->convenio_id);

        return $documento;
    }
}