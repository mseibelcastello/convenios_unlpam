<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Identity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class IdentityController extends Controller
{
    // Extensión, tipo real del contenido y dimensiones (así un .txt renombrado a .png no pasa)
    private const REGLA_IMAGEN = [
        'file',
        'mimes:png,jpg,jpeg',
        'mimetypes:image/png,image/jpeg',
        'dimensions:min_width=50,min_height=50,max_width=4096,max_height=4096',
    ];

    public function show(Request $request): JsonResponse
    {
        return response()->json(Identity::estadoDe($request->user()->id));
    }

    public function store(Request $request): JsonResponse
    {
        $usuario = $request->user();

        $request->validate([
            'firma' => ['sometimes', ...self::REGLA_IMAGEN, 'max:2048'],   // 2 MB
            'rostro' => ['sometimes', ...self::REGLA_IMAGEN, 'max:5120'],  // 5 MB
            'huella' => ['sometimes', 'string', 'min:8', 'max:128', 'regex:/^[A-Za-z0-9._:\-]+$/'],
        ]);

        $hayArchivo = $request->hasFile('firma') || $request->hasFile('rostro');
        $hayHuella = $request->filled('huella');

        if (! $hayArchivo && ! $hayHuella) {
            throw ValidationException::withMessages([
                'identidad' => ['Mandá al menos uno: firma, rostro o huella'],
            ]);
        }

        $disco = Storage::disk('local'); // storage/app/private: fuera de public, sin URL de acceso directo
        $nuevas = [];
        $cambios = [];

        foreach (['firma', 'rostro'] as $campo) {
            if (! $request->hasFile($campo)) {
                continue;
            }

            $archivo = $request->file($campo);
            $extension = $archivo->extension() === 'png' ? 'png' : 'jpg';

            $ruta = $disco->putFileAs("identidad/{$usuario->id}", $archivo, $campo.'-'.Str::uuid().'.'.$extension);

            if ($ruta === false) {
                foreach ($nuevas as $guardada) {
                    $disco->delete($guardada);
                }
                abort(500, 'No se pudo guardar el archivo');
            }

            $nuevas[] = $ruta;
            $cambios[$campo.'_ruta'] = $ruta;
            $cambios[$campo.'_en'] = now();
        }

        if ($hayHuella) {
            // Solo se guarda el hash del identificador del dispositivo, nunca el valor
            $cambios['huella_hash'] = hash_hmac('sha256', $request->input('huella'), (string) config('app.key'));
            $cambios['huella_en'] = now();
        }

        $anteriores = [];

        try {
            DB::transaction(function () use ($usuario, $cambios, $hayArchivo, &$anteriores) {
                Identity::createOrFirst(['usuario_id' => $usuario->id]);

                // Bloquea la fila: dos pedidos a la vez de la misma persona no se pisan
                $identidad = Identity::where('usuario_id', $usuario->id)->lockForUpdate()->firstOrFail();

                foreach (['firma_ruta', 'rostro_ruta'] as $columna) {
                    if (isset($cambios[$columna]) && $identidad->{$columna}) {
                        $anteriores[] = $identidad->{$columna};
                    }
                }

                $identidad->update($cambios);

                AuditLog::create([
                    'usuario_id' => $usuario->id,
                    'accion' => $hayArchivo ? 'subir' : 'editar',
                    'entidad' => 'identidades',
                    'entidad_id' => $identidad->id,
                ]);
            });
        } catch (Throwable $e) {
            // Si falla la base, no quedan archivos huérfanos en el disco
            foreach ($nuevas as $guardada) {
                $disco->delete($guardada);
            }
            throw $e;
        }

        // Los archivos reemplazados se borran recién cuando el cambio ya quedó guardado
        foreach ($anteriores as $vieja) {
            $disco->delete($vieja);
        }

        return response()->json(Identity::estadoDe($usuario->id));
    }
}