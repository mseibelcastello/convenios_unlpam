<?php

namespace App\Http\Controllers;

use App\Http\Requests\AgreementRequest;
use App\Models\Agreement;
use App\Models\Comment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;

/**
 * POST /sync: aplica los cambios que el cliente hizo sin conexión, en el orden en que llegan.
 *
 * Regla de conflictos:
 *  - "edicion" (datos del convenio): control optimista por versión. Se aplica solo si la versión
 *    que tenía el cliente es la actual y el convenio sigue en borrador. Si no, no se pisa nada:
 *    se devuelve el conflicto con la versión del servidor para que la persona decida.
 *  - "comentario": siempre se aplica. Solo agrega, no reemplaza nada de nadie, así que no hay conflicto.
 *
 * Cada cambio es independiente: uno en conflicto o rechazado no impide aplicar los demás.
 */
class SyncController extends Controller
{
    private const MAX_CAMBIOS = 50;

    // Quién puede hacer cada tipo de cambio (las mismas reglas que las rutas de cada acción)
    private const ROLES = [
        'edicion' => ['administracion', 'gestion'],
        'comentario' => ['administracion', 'gestion', 'revision'],
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'cambios' => ['required', 'array', 'min:1', 'max:'.self::MAX_CAMBIOS],
            'cambios.*' => ['required', 'array'],
            // Lo pone el cliente para reconocer cada cambio en la respuesta
            'cambios.*.id_cliente' => ['required', 'string', 'max:64', 'distinct'],
            'cambios.*.tipo' => ['required', 'in:edicion,comentario'],
            'cambios.*.convenio_id' => ['required', 'integer', 'min:1'],
            'cambios.*.version' => ['required_if:cambios.*.tipo,edicion', 'nullable', 'integer', 'min:1'],
            'cambios.*.datos' => ['required_if:cambios.*.tipo,edicion', 'array'],
            'cambios.*.contenido' => ['required_if:cambios.*.tipo,comentario', 'nullable', 'string', 'max:2000'],
        ]);

        $usuario = $request->user();

        $resultados = collect($request->input('cambios'))
            ->map(fn (array $cambio) => ['id_cliente' => $cambio['id_cliente'], 'tipo' => $cambio['tipo']]
                + $this->aplicar($usuario, $cambio));

        return response()->json([
            'resumen' => [
                'aplicados' => $resultados->where('estado', 'aplicado')->count(),
                'conflictos' => $resultados->where('estado', 'conflicto')->count(),
                'rechazados' => $resultados->where('estado', 'rechazado')->count(),
            ],
            'resultados' => $resultados->values(),
        ]);
    }

    private function aplicar(User $usuario, array $cambio): array
    {
        if (! in_array($usuario->rol, self::ROLES[$cambio['tipo']], true)) {
            return $this->rechazado('Tu rol no puede hacer este cambio');
        }

        // Un convenio fuera del alcance del usuario es como si no existiera
        $convenio = Agreement::visiblesPara($usuario)->find($cambio['convenio_id']);
        if (! $convenio) {
            return $this->rechazado('Convenio no encontrado');
        }

        return $cambio['tipo'] === 'comentario'
            ? $this->comentar($usuario, $convenio, $cambio['contenido'])
            : $this->editar($usuario, $convenio, $cambio);
    }

    private function comentar(User $usuario, Agreement $convenio, string $contenido): array
    {
        return [
            'estado' => 'aplicado',
            'comentario' => Comment::publicar($convenio, $usuario, $contenido)->paraApi(),
        ];
    }

    private function editar(User $usuario, Agreement $convenio, array $cambio): array
    {
        $versionCliente = (int) $cambio['version'];

        // Con la versión vieja ni se valida: el cliente editó sobre datos que ya cambiaron
        if ((int) $convenio->version !== $versionCliente || $convenio->estado !== 'borrador') {
            return $this->conflicto($convenio->load('unidad'), $versionCliente);
        }

        // El cliente puede mandar solo los campos que tocó; el resto queda como está
        $editables = array_keys(Arr::except(AgreementRequest::reglas($convenio->id, []), ['version']));
        $datos = Arr::only($cambio['datos'], $editables);
        // attributesToArray deja las fechas como texto, igual que las mandaría el cliente
        $completo = array_merge(Arr::only($convenio->attributesToArray(), $editables), $datos);

        $validador = Validator::make($completo, Arr::except(AgreementRequest::reglas($convenio->id, $completo), ['version']));
        if ($validador->fails()) {
            return $this->rechazado('Los datos no son válidos', $validador->errors()->toArray());
        }

        // Gestión no puede mover el convenio a otra unidad
        if (! $usuario->puedeAccederUnidad((int) $completo['unidad_id'])) {
            return $this->rechazado('No podés mover el convenio a esa unidad');
        }

        // El UPDATE vuelve a exigir la versión: si alguien editó entre la lectura y acá, también es conflicto
        [$resultado, $actual] = Agreement::editarConVersion($usuario, $convenio->id, $validador->validated(), $versionCliente);

        return match ($resultado) {
            'aplicado' => ['estado' => 'aplicado', 'convenio' => $actual],
            'no_encontrado' => $this->rechazado('Convenio no encontrado'),
            default => $this->conflicto($actual, $versionCliente),
        };
    }

    private function conflicto(Agreement $actual, int $versionCliente): array
    {
        return [
            'estado' => 'conflicto',
            'motivo' => $actual->estado !== 'borrador'
                ? 'El convenio ya no está en borrador'
                : "Editaste la versión {$versionCliente} pero el servidor ya tiene la {$actual->version}",
            'version_cliente' => $versionCliente,
            // Cómo está hoy en el servidor, para que la persona compare y decida
            'actual' => $actual,
        ];
    }

    private function rechazado(string $motivo, array $errores = []): array
    {
        return ['estado' => 'rechazado', 'motivo' => $motivo] + ($errores ? ['errores' => $errores] : []);
    }
}
