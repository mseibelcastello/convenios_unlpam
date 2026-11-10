<?php

use App\Http\Controllers\AgreementController;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true]);

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'abilities:mfa'])
    ->post('/auth/mfa/verify', [AuthController::class, 'verificarMfa']);

Route::middleware(['auth:sanctum', 'abilities:acceso'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/agreements', [AgreementController::class, 'index']);
    Route::get('/agreements/{id}', [AgreementController::class, 'show'])->whereNumber('id');
    Route::post('/agreements', [AgreementController::class, 'store'])
        ->middleware('role:gestion,administracion');
});