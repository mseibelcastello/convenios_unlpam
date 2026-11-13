<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Secreto para Google Authenticator (o cualquier app de códigos TOTP)
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Se guarda cifrado (ver el modelo User)
            $table->text('mfa_secreto')->nullable();
            // Pasa a true cuando el usuario ingresa por primera vez un código correcto de la app
            $table->boolean('mfa_activado')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['mfa_secreto', 'mfa_activado']);
        });
    }
};
