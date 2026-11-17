<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('identidades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('firma_ruta')->nullable();
            $table->timestamp('firma_en')->nullable();
            $table->string('rostro_ruta')->nullable();
            $table->timestamp('rostro_en')->nullable();
            $table->char('huella_hash', 64)->nullable();
            $table->timestamp('huella_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('identidades');
    }
};