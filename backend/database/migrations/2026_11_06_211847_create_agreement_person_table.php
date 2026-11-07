<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('convenio_persona', function (Blueprint $table) {
            $table->foreignId('convenio_id')->constrained('convenios')->cascadeOnDelete();
            $table->foreignId('persona_id')->constrained('personas')->restrictOnDelete();
            $table->enum('rol', ['representante', 'responsable', 'docente_guia', 'tutor', 'pasante']);
            $table->date('desde')->nullable();
            $table->date('hasta')->nullable();
            // Campos solo para pasantías
            $table->string('carrera', 100)->nullable();
            $table->string('tutor', 120)->nullable();
            $table->unsignedTinyInteger('carga_horaria')->nullable();
            $table->decimal('asignacion', 10, 2)->nullable();
            $table->string('seguro', 80)->nullable();
            $table->primary(['convenio_id', 'persona_id', 'rol']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('convenio_persona');
    }
};