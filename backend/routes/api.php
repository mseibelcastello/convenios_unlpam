<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true]);

Route::post('/auth/login', [AuthController::class, 'login']);

// Solo el token limitado (habilidad "mfa") entra acá
Route::middleware(['auth:sanctum', 'abilities:mfa'])
    ->post('/auth/mfa/verify', [AuthController::class, 'verificarMfa']);

// Solo el token completo (habilidad "acceso") entra acá
Route::middleware(['auth:sanctum', 'abilities:acceso'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});