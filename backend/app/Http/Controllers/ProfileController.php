<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Throwable;

class ProfileController extends Controller
{
    private const LADO_MINIATURA = 150;

    public function preferences(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'tamano_letra' => ['required', 'in:chica,mediana,grande'],
            'modo' => ['required', 'in:claro,oscuro'],
        ]);

        $usuario = $request->user();
        $usuario->update($datos);

        return response()->json([
            'tamano_letra' => $usuario->tamano_letra,
            'modo' => $usuario->modo,
        ]);
    }

    public function photo(Request $request): JsonResponse
    {
        // Extensión, tipo real del contenido y dimensiones (un archivo renombrado no pasa)
        $request->validate([
            'foto' => [
                'required', 'file',
                'mimes:png,jpg,jpeg',
                'mimetypes:image/png,image/jpeg',
                'dimensions:min_width=100,min_height=100,max_width=4096,max_height=4096',
                'max:5120', // 5 MB
            ],
        ]);

        $usuario = $request->user();
        $disco = Storage::disk('public'); // la consigna pide una URL; los nombres con UUID no se pueden adivinar
        $carpeta = "perfil/{$usuario->id}";
        $id = Str::uuid();

        $rutaFoto = "{$carpeta}/foto-{$id}.jpg";
        $rutaMini = "{$carpeta}/mini-{$id}.jpg";

        try {
            // Se re-codifica la imagen: así no se guardan metadatos (EXIF, ubicación) ni contenido extra
            $imagen = (new ImageManager(new Driver()))->read($request->file('foto')->getRealPath());

            $disco->put($rutaFoto, (string) $imagen->toJpeg(85));
            $disco->put($rutaMini, (string) $imagen->cover(self::LADO_MINIATURA, self::LADO_MINIATURA)->toJpeg(80));
        } catch (Throwable $e) {
            $disco->delete([$rutaFoto, $rutaMini]);
            throw $e;
        }

        $anteriores = array_filter([$usuario->foto_ruta, $usuario->miniatura_ruta]);

        $usuario->forceFill(['foto_ruta' => $rutaFoto, 'miniatura_ruta' => $rutaMini])->save();

        // La foto anterior se borra recién cuando la nueva ya quedó guardada
        if ($anteriores) {
            $disco->delete($anteriores);
        }

        return response()->json(['miniatura_url' => $usuario->miniatura_url]);
    }
}
