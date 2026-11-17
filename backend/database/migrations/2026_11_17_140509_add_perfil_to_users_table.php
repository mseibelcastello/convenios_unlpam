<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('tamano_letra', ['chica', 'mediana', 'grande'])->default('mediana');
            $table->enum('modo', ['claro', 'oscuro'])->default('claro');
            $table->string('foto_ruta')->nullable();
            $table->string('miniatura_ruta')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['tamano_letra', 'modo', 'foto_ruta', 'miniatura_ruta']);
        });
    }
};
