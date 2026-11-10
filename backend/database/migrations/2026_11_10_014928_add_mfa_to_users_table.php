<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('mfa_codigo_hash')->nullable()->after('remember_token');
            $table->timestamp('mfa_expira_en')->nullable()->after('mfa_codigo_hash');
            $table->unsignedTinyInteger('mfa_intentos')->default(0)->after('mfa_expira_en');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['mfa_codigo_hash', 'mfa_expira_en', 'mfa_intentos']);
        });
    }
};