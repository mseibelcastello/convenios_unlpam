<?php

namespace App\Support;

use Illuminate\Support\Str;

class FiltroOfensivo
{
    public static function esOfensivo(string $texto): bool
    {
        $prohibidas = array_flip(array_filter(
            array_map(self::normalizar(...), config('moderacion.palabras_ofensivas', []))
        ));

        $palabras = preg_split('/[^a-z0-9]+/', self::normalizar($texto), -1, PREG_SPLIT_NO_EMPTY);

        foreach ($palabras as $palabra) {
            // La palabra tal cual, o sin la terminación de plural (idiotas, imbeciles)
            if (isset($prohibidas[$palabra]) || isset($prohibidas[preg_replace('/(es|s)$/', '', $palabra)])) {
                return true;
            }
        }

        return false;
    }

    private static function normalizar(string $texto): string
    {
        return Str::ascii(mb_strtolower($texto));
    }
}