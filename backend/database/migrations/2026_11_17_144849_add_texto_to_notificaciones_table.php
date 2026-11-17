<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notificaciones', function (Blueprint $table) {
            // El enum original no tenía todos los disparadores; los tipos válidos están en App\Support\Avisos
            $table->string('tipo', 30)->change();
            // Lo que se le muestra al usuario, armado al momento del aviso
            $table->string('texto', 500)->after('tipo');
            // GET /alerts siempre busca los avisos de un usuario, los más nuevos primero
            $table->index(['usuario_id', 'leida', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::table('notificaciones', function (Blueprint $table) {
            $table->dropIndex(['usuario_id', 'leida', 'fecha']);
            $table->dropColumn('texto');
            $table->enum('tipo', ['por_vencer', 'observacion', 'cambio_estado', 'otro'])->change();
        });
    }
};
