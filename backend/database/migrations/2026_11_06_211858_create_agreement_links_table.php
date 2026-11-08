<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vinculos_convenio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('convenio_origen_id')->constrained('convenios')->cascadeOnDelete();
            $table->foreignId('convenio_destino_id')->constrained('convenios')->cascadeOnDelete();
            $table->enum('tipo_vinculo', ['se_apoya_en', 'adenda', 'renovacion', 'sustitucion']);
            $table->timestamps();
            $table->unique(['convenio_origen_id', 'convenio_destino_id', 'tipo_vinculo'], 'vinculo_unico');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vinculos_convenio');
    }
};