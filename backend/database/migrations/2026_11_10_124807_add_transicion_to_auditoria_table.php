<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('auditoria', function (Blueprint $table) {
            $table->string('estado_anterior', 20)->nullable()->after('entidad_id');
            $table->string('estado_nuevo', 20)->nullable()->after('estado_anterior');
            $table->text('fundamento')->nullable()->after('estado_nuevo');
        });
    }

    public function down(): void
    {
        Schema::table('auditoria', function (Blueprint $table) {
            $table->dropColumn(['estado_anterior', 'estado_nuevo', 'fundamento']);
        });
    }
};