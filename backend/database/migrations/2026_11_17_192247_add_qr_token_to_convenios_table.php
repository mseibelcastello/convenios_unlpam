<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('convenios', function (Blueprint $table) {
            // Referencia aleatoria que va en el QR de la ficha (no lleva datos del convenio)
            $table->char('qr_token', 32)->nullable()->unique()->after('version');
        });
    }

    public function down(): void
    {
        Schema::table('convenios', function (Blueprint $table) {
            $table->dropUnique(['qr_token']);
            $table->dropColumn('qr_token');
        });
    }
};
