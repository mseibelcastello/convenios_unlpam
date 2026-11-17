<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('observaciones', function (Blueprint $table) {
            $table->text('respuesta')->nullable()->after('contenido');
            $table->foreignId('respondida_por')->nullable()->after('respuesta')->constrained('users')->restrictOnDelete();
            $table->timestamp('respondida_en')->nullable()->after('respondida_por');
            $table->foreignId('resuelta_por')->nullable()->after('resuelta')->constrained('users')->restrictOnDelete();
            $table->timestamp('resuelta_en')->nullable()->after('resuelta_por');
        });
    }

    public function down(): void
    {
        Schema::table('observaciones', function (Blueprint $table) {
            $table->dropForeign(['respondida_por']);
            $table->dropForeign(['resuelta_por']);
            $table->dropColumn(['respuesta', 'respondida_por', 'respondida_en', 'resuelta_por', 'resuelta_en']);
        });
    }
};