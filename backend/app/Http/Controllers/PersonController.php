<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Person;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $usuario = $request->user();

        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            // Solo las vinculadas a convenios del alcance del usuario, con esos convenios (es lo que cuenta el panel)
            'vinculadas' => ['nullable', 'boolean'],
        ]);

        $consulta = Person::query();
        $vinculadas = $request->boolean('vinculadas');

        // Con unidad asignada, solo las personas vinculadas a convenios de su unidad
        if ($vinculadas || $usuario->unidadesAccesibles() !== null) {
            $consulta->whereHas('convenios', fn ($q) => $q->visiblesPara($usuario));
        }

        if ($vinculadas) {
            $consulta->with(['convenios' => fn ($q) => $q->visiblesPara($usuario)->select('convenios.id', 'convenios.codigo', 'convenios.titulo')]);
        }

        if (filled($filtros['q'] ?? null)) {
            $texto = '%'.addcslashes($filtros['q'], '%_\\').'%';
            $consulta->where(fn ($q) => $q->where('nombre', 'like', $texto)->orWhere('legajo', 'like', $texto));
        }

        $pagina = $consulta->orderBy('nombre')->paginate(15);

        // No es una fila puntual, por eso entidad_id queda en 0
        AuditLog::create([
            'usuario_id' => $usuario->id,
            'accion' => 'consultar datos personales',
            'entidad' => 'personas',
            'entidad_id' => 0,
        ]);

        return $this->lista($pagina);
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:120'],
            'legajo' => ['nullable', 'regex:/^LEG-\d{4}$/', 'unique:personas,legajo'],
        ]);

        return response()->json(Person::create($datos), 201);
    }
}