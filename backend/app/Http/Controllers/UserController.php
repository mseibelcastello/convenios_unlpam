<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Usuarios del sistema. Solo administración (lo controla la ruta).
 * El contrato usa nombre, correo y clave; en la base son name, email y password (con hash).
 */
class UserController extends Controller
{
    private const ROLES = ['administracion', 'gestion', 'revision', 'consulta'];

    // Lo que se devuelve de cada usuario: nunca la clave ni los datos del MFA
    private const CAMPOS = ['id', 'name', 'email', 'rol', 'unidad_id', 'mfa_activado', 'created_at'];

    public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'rol' => ['nullable', Rule::in(self::ROLES)],
            'unidad_id' => ['nullable', 'integer'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $consulta = User::with('unidad:id,nombre,sigla')->select(self::CAMPOS);

        if (filled($filtros['q'] ?? null)) {
            $texto = '%'.addcslashes($filtros['q'], '%_\\').'%';
            $consulta->where(fn ($q) => $q->where('name', 'like', $texto)->orWhere('email', 'like', $texto));
        }
        if (filled($filtros['rol'] ?? null)) {
            $consulta->where('rol', $filtros['rol']);
        }
        if (filled($filtros['unidad_id'] ?? null)) {
            $consulta->where('unidad_id', $filtros['unidad_id']);
        }

        return $this->lista($consulta->orderBy('name')->paginate(15));
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate($this->reglas(null) + [
            'nombre' => ['required', 'string', 'max:255'],
            'correo' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'clave' => ['required', 'string', Password::min(8)],
            'rol' => ['required', Rule::in(self::ROLES)],
        ]);

        $usuario = DB::transaction(function () use ($datos, $request) {
            $usuario = User::create([
                'name' => $datos['nombre'],
                'email' => Str::lower($datos['correo']),
                'password' => $datos['clave'], // el cast 'hashed' del modelo la guarda con bcrypt
                'rol' => $datos['rol'],
                'unidad_id' => $datos['unidad_id'] ?? null,
            ]);
            $this->auditar($request->user()->id, 'crear', $usuario->id);

            return $usuario;
        });

        return response()->json($this->elemento($usuario), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $usuario = User::findOrFail($id);
        $admin = $request->user();

        $datos = $request->validate($this->reglas($usuario) + [
            'nombre' => ['sometimes', 'required', 'string', 'max:255'],
            'correo' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($usuario->id)],
            'clave' => ['sometimes', 'required', 'string', Password::min(8)],
            'rol' => ['sometimes', 'required', Rule::in(self::ROLES)],
        ]);

        $rolNuevo = $datos['rol'] ?? $usuario->rol;

        // Nadie se saca a sí mismo el rol de administración (se quedaría sin poder deshacerlo)
        if ($usuario->id === $admin->id && $rolNuevo !== $usuario->rol) {
            throw ValidationException::withMessages(['rol' => ['No podés cambiar tu propio rol']]);
        }

        $cambios = array_filter([
            'name' => $datos['nombre'] ?? null,
            'email' => isset($datos['correo']) ? Str::lower($datos['correo']) : null,
            'password' => $datos['clave'] ?? null,
            'rol' => $datos['rol'] ?? null,
        ], fn ($v) => $v !== null);
        if (array_key_exists('unidad_id', $datos)) {
            $cambios['unidad_id'] = $datos['unidad_id'];
        }

        DB::transaction(function () use ($usuario, $cambios, $admin, $rolNuevo) {
            // El sistema no puede quedarse sin ningún administrador
            if ($usuario->rol === 'administracion' && $rolNuevo !== 'administracion') {
                $otros = User::where('rol', 'administracion')->where('id', '!=', $usuario->id)->lockForUpdate()->count();
                if ($otros === 0) {
                    throw ValidationException::withMessages(['rol' => ['Tiene que quedar al menos un usuario de administración']]);
                }
            }

            $usuario->update($cambios);

            // Con la clave cambiada se cierran sus sesiones abiertas (si se la habían robado, deja de servir)
            if (isset($cambios['password'])) {
                $usuario->tokens()->delete();
            }

            $this->auditar($admin->id, 'editar', $usuario->id);
        });

        return response()->json($this->elemento($usuario->fresh()));
    }

    /**
     * Unidad: gestión y revisión trabajan sobre una unidad, así que la exigen
     * (sin unidad verían todas). Administración y consulta pueden ser globales.
     */
    private function reglas(?User $actual): array
    {
        $exigeUnidad = fn (Request $r) => in_array($r->input('rol', $actual?->rol), ['gestion', 'revision'], true)
            && ($actual === null || $r->has('unidad_id') || $r->has('rol'));

        return [
            'unidad_id' => [
                Rule::requiredIf(fn () => $exigeUnidad(request())),
                'nullable', 'integer', 'exists:unidades,id',
            ],
        ];
    }

    private function elemento(User $usuario): array
    {
        $usuario->loadMissing('unidad:id,nombre,sigla');

        return $usuario->only(self::CAMPOS) + ['unidad' => $usuario->unidad];
    }

    private function auditar(int $adminId, string $accion, int $usuarioId): void
    {
        AuditLog::create([
            'usuario_id' => $adminId,
            'accion' => $accion,
            'entidad' => 'usuarios',
            'entidad_id' => $usuarioId,
        ]);
    }
}
