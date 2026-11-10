<?php

namespace App\Support;

class CircuitoEstados
{
    /**
     * desde => hasta => quién puede hacerlo y si exige fundamento escrito.
     * Es la tabla "Estados y flujos principales" del diccionario.
     */
    private const TRANSICIONES = [
        'borrador' => [
            'revision' => ['roles' => ['gestion'], 'fundamento' => false],
        ],
        'revision' => [
            'borrador' => ['roles' => ['revision'], 'fundamento' => true],
            'aprobado' => ['roles' => ['revision'], 'fundamento' => false],
        ],
        'aprobado' => [
            'firmado' => ['roles' => ['administracion'], 'fundamento' => false],
        ],
        'firmado' => [
            'rescindido' => ['roles' => ['administracion'], 'fundamento' => true],
            'archivado' => ['roles' => ['administracion'], 'fundamento' => false],
        ],
        'rescindido' => [
            'archivado' => ['roles' => ['administracion'], 'fundamento' => false],
        ],
    ];

    /** null si el paso no está permitido desde ese estado */
    public static function regla(string $desde, string $hasta): ?array
    {
        return self::TRANSICIONES[$desde][$hasta] ?? null;
    }
}