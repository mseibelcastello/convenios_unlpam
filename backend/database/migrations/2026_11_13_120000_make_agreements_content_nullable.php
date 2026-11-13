<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Si el convenio se carga con su PDF, el texto (objeto, alcance, etc.) está en el PDF,
// así que estos campos ya no son obligatorios.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('convenios', function (Blueprint $table) {
            $table->text('objeto')->nullable()->change();
            $table->text('alcance')->nullable()->change();
            $table->text('obligaciones')->nullable()->change();
            $table->text('condiciones_rescision')->nullable()->change();
            $table->text('marco_legal')->nullable()->change();
        });
    }

    // Solo se puede volver atrás si ningún convenio tiene estos campos vacíos
    public function down(): void
    {
        Schema::table('convenios', function (Blueprint $table) {
            $table->text('objeto')->nullable(false)->change();
            $table->text('alcance')->nullable(false)->change();
            $table->text('obligaciones')->nullable(false)->change();
            $table->text('condiciones_rescision')->nullable(false)->change();
            $table->text('marco_legal')->nullable(false)->change();
        });
    }
};
