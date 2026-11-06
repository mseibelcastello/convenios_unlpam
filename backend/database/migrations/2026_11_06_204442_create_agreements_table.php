<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('convenios', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('titulo', 200);
            $table->enum('tipo', ['marco', 'especifico', 'pasantia', 'adenda', 'renovacion', 'sustitucion']);
            $table->foreignId('unidad_id')->constrained('unidades')->restrictOnDelete();
            $table->text('objeto');
            $table->text('alcance');
            $table->text('obligaciones');
            $table->text('condiciones_rescision');
            $table->text('marco_legal');
            $table->string('resolucion', 60)->nullable();
            $table->string('expediente', 60)->nullable();
            $table->text('condiciones_renovacion')->nullable();
            $table->text('confidencialidad')->nullable();
            $table->text('notas')->nullable();
            $table->date('fecha_firma')->nullable();
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_vencimiento')->nullable();
            $table->date('fecha_preaviso')->nullable();
            $table->enum('estado', ['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'])->default('borrador');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('convenios');
    }
};