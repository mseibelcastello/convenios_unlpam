<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

//Esta lista son los campos que Laravel permite guardar cuando creás un usuario
#[Fillable(['name', 'email', 'password','rol', 'unidad_id', 'tamano_letra', 'modo'])]
#[Hidden(['password', 'remember_token', 'mfa_codigo_hash', 'mfa_secreto', 'foto_ruta', 'miniatura_ruta'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    // Sale en /auth/me junto con tamano_letra y modo
    protected $appends = ['miniatura_url'];

    protected function miniaturaUrl(): Attribute
    {
        return Attribute::get(fn () => $this->miniatura_ruta
            ? Storage::disk('public')->url($this->miniatura_ruta)
            : null);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'mfa_expira_en' => 'datetime',
            'mfa_secreto' => 'encrypted',
            'mfa_activado' => 'boolean',
        ];
    }

    public function unidad(): BelongsTo
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }

        /** null = todas las unidades; si no, la lista de unidades permitidas */
    public function unidadesAccesibles(): ?array
    {
        return $this->unidad_id === null ? null : [(int) $this->unidad_id];
    }

    public function puedeAccederUnidad(int $unidadId): bool
    {
        $unidades = $this->unidadesAccesibles();

        return $unidades === null || in_array($unidadId, $unidades, true);
    }
}
