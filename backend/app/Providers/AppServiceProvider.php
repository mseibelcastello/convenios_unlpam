<?php

namespace App\Providers;

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // En desarrollo, todos los mails pueden ir a una sola casilla (MAIL_REDIRIGIR_A en el .env)
        if (config('mail.redirigir_a')) {
            Mail::alwaysTo(config('mail.redirigir_a'));
        }
    }
}
