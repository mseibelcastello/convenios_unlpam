<?php

use App\Http\Controllers\AgreementController;
use App\Http\Controllers\AgreementPartyController;
use App\Http\Controllers\AgreementPersonController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PartyController;
use App\Http\Controllers\PersonController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AgreementTransitionController;
use App\Http\Controllers\AgreementLinkController;
use App\Http\Controllers\AgreementDocumentController;

Route::get('/health', fn () => ['ok' => true]);

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'abilities:mfa'])
    ->post('/auth/mfa/verify', [AuthController::class, 'verificarMfa']);

Route::middleware(['auth:sanctum', 'abilities:acceso'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Convenios
    Route::get('/agreements', [AgreementController::class, 'index']);
    Route::get('/agreements/{id}', [AgreementController::class, 'show'])->whereNumber('id');

    Route::get('/agreements/{id}/documents', [AgreementDocumentController::class, 'index'])
    ->whereNumber('id');

    Route::post('/agreements/{id}/documents', [AgreementDocumentController::class, 'store'])
        ->whereNumber('id')
        ->middleware('role:administracion,gestion,revision');

    Route::get('/agreements/{id}/links', [AgreementLinkController::class, 'index'])->whereNumber('id');

    Route::post('/agreements/{id}/transition', AgreementTransitionController::class)
    ->whereNumber('id')
    ->middleware('role:gestion,revision,administracion');

    // Partes: todos leen
    Route::get('/parties', [PartyController::class, 'index']);
    Route::get('/parties/{id}', [PartyController::class, 'show'])->whereNumber('id');

    // Personas: Consulta no entra (datos personales)
    Route::middleware('role:administracion,gestion,revision')->group(function () {
        Route::get('/people', [PersonController::class, 'index']);
        Route::get('/agreements/{id}/people', [AgreementPersonController::class, 'index'])->whereNumber('id');
    });

    // Escritura: solo administración y gestión
    Route::middleware('role:gestion,administracion')->group(function () {
        Route::post('/agreements', [AgreementController::class, 'store']);
        Route::put('/agreements/{id}', [AgreementController::class, 'update'])->whereNumber('id');

        Route::post('/parties', [PartyController::class, 'store']);
        Route::put('/parties/{id}', [PartyController::class, 'update'])->whereNumber('id');
        Route::post('/agreements/{id}/parties', [AgreementPartyController::class, 'store'])->whereNumber('id');
        Route::delete('/agreements/{id}/parties/{parteId}', [AgreementPartyController::class, 'destroy'])
            ->whereNumber(['id', 'parteId']);

        Route::post('/people', [PersonController::class, 'store']);
        Route::post('/agreements/{id}/people', [AgreementPersonController::class, 'store'])->whereNumber('id');
        Route::delete('/agreements/{id}/people/{personaId}', [AgreementPersonController::class, 'destroy'])
            ->whereNumber(['id', 'personaId']);

        Route::post('/agreements/{id}/links', [AgreementLinkController::class, 'store'])->whereNumber('id');
        Route::delete('/agreements/{id}/links/{linkId}', [AgreementLinkController::class, 'destroy'])
        ->whereNumber(['id', 'linkId']);
        });
});