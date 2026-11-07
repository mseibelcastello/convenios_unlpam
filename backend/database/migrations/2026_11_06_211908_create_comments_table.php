<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comentarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('convenio_id')->constrained('convenios')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('users')->restrictOnDelete();
            $table->text('contenido');
            $table->timestamp('fecha')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comentarios');
    }
};