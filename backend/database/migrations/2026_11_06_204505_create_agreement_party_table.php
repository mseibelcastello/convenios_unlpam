<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('convenio_parte', function (Blueprint $table) {
            $table->foreignId('convenio_id')->constrained('convenios')->cascadeOnDelete();
            $table->foreignId('parte_id')->constrained('partes')->restrictOnDelete();
            $table->string('rol_parte', 40);
            $table->primary(['convenio_id', 'parte_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('convenio_parte');
    }
};