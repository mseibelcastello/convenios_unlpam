<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

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

        // Login: 5 intentos por minuto para cada correo desde cada IP (frena el probar claves a la fuerza).
        // Se cuenta por correo + IP para que nadie pueda dejar sin acceso a otra persona desde otra compu.
        RateLimiter::for('login', function (Request $request) {
            $clave = Str::lower((string) $request->input('email')).'|'.$request->ip();

            return Limit::perMinute(5)->by($clave)->response(fn (Request $request, array $headers) => response()->json(
                ['message' => 'Demasiados intentos. Esperá un minuto y volvé a probar.'],
                429,
                $headers,
            ));
        });
    }
}
