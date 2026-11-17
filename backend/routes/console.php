<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Preaviso y vencimientos: una vez por día, a la medianoche de Argentina (App\Console\Commands\CheckDeadlines)
Schedule::command('deadlines:check')->daily()->timezone('America/Argentina/Buenos_Aires')->withoutOverlapping();
