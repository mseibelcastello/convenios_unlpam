<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('firmas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('convenio_id')->unique()->constrained('convenios')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('users')->restrictOnDelete();
            $table->decimal('latitud', 9, 6);
            $table->decimal('longitud', 9, 6);
            $table->timestamp('firmado_en')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('firmas');
    }
};