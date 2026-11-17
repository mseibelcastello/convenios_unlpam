<?php

use App\Models\Agreement;
use App\Support\Avisos;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Avisa una sola vez por convenio cuando un firmado entra en el período de preaviso
Artisan::command('avisos:preaviso', function () {
    $hoy = now('America/Argentina/Buenos_Aires')->toDateString();

    $convenios = Agreement::where('estado', 'firmado')
        ->whereNotNull('fecha_preaviso')
        ->whereDate('fecha_preaviso', '<=', $hoy)
        ->whereDate('fecha_vencimiento', '>=', $hoy)
        ->whereNotExists(fn ($q) => $q->from('notificaciones')
            ->whereColumn('notificaciones.convenio_id', 'convenios.id')
            ->where('notificaciones.tipo', 'preaviso'))
        ->get();

    $avisos = $convenios->sum(fn (Agreement $c) => Avisos::preaviso($c));

    $this->info("{$convenios->count()} convenio(s) en preaviso, {$avisos} aviso(s) creados");
})->purpose('Avisa los convenios que entraron en período de preaviso');

Schedule::command('avisos:preaviso')->dailyAt('08:00')->timezone('America/Argentina/Buenos_Aires');
