<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('firmas', function (Blueprint $table) {
            // La firma dibujada a mano, como imagen PNG en texto base64 (data:image/png;base64,...)
            $table->mediumText('imagen')->nullable()->after('longitud');
        });
    }

    public function down(): void
    {
        Schema::table('firmas', function (Blueprint $table) {
            $table->dropColumn('imagen');
        });
    }
};
