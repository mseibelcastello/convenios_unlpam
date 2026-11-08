<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('convenio_id')->constrained('convenios')->cascadeOnDelete();
            $table->enum('tipo', ['principal', 'anexo', 'dictamen', 'resolucion', 'otro']);
            $table->string('nombre_original', 255);
            $table->unsignedInteger('version')->default(1);
            $table->string('ruta_privada', 255);
            $table->unsignedBigInteger('tamano_bytes');
            $table->char('sha256', 64);
            $table->foreignId('subido_por')->constrained('users')->restrictOnDelete();
            $table->timestamp('subido_en')->useCurrent();
            $table->unique(['convenio_id', 'tipo', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos');
    }
};