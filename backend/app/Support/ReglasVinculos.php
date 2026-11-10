<?php

namespace App\Support;

class ReglasVinculos
{
    private const INSTRUMENTOS = ['marco', 'especifico', 'pasantia', 'renovacion', 'sustitucion'];

    /** tipo_vinculo => tipos permitidos del convenio nuevo (origen) y del antecedente (destino) */
    private const REGLAS = [
        'se_apoya_en' => ['origen' => ['especifico', 'pasantia'], 'destino' => ['marco']],
        'adenda' => ['origen' => ['adenda'], 'destino' => self::INSTRUMENTOS],
        'renovacion' => ['origen' => ['renovacion'], 'destino' => self::INSTRUMENTOS],
        'sustitucion' => ['origen' => ['sustitucion'], 'destino' => self::INSTRUMENTOS],
    ];

    public static function tipos(): array
    {
        return array_keys(self::REGLAS);
    }

    /** null si la unión es válida; si no, el motivo */
    public static function incompatibilidad(string $vinculo, string $tipoOrigen, string $tipoDestino): ?string
    {
        $regla = self::REGLAS[$vinculo];

        if (! in_array($tipoOrigen, $regla['origen'], true)) {
            return "Un convenio de tipo $tipoOrigen no puede usar el vínculo $vinculo";
        }

        if (! in_array($tipoDestino, $regla['destino'], true)) {
            return "El vínculo $vinculo no puede apuntar a un convenio de tipo $tipoDestino";
        }

        return null;
    }
}