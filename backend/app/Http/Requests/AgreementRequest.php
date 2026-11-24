<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AgreementRequest extends FormRequest
{
    public function authorize(): bool
    {
        // El rol se controla en las rutas y la unidad en el controlador
        return true;
    }

    public function rules(): array
    {
        return self::reglas($this->isMethod('PUT') ? (int) $this->route('id') : null, $this->all());
    }

    /**
     * Reglas de un convenio. $editandoId es el convenio que se edita (null al crear) y $datos lo que llegó.
     * Las usa también POST /sync para validar las ediciones hechas sin conexión.
     */
    public static function reglas(?int $editandoId, array $datos): array
    {
        $esEdicion = $editandoId !== null;
        $lleno = fn (string $campo) => isset($datos[$campo]) && trim((string) $datos[$campo]) !== '';

        $codigoUnico = Rule::unique('convenios', 'codigo');
        if ($esEdicion) {
            $codigoUnico = $codigoUnico->ignore($editandoId);
        }

        $reglas = [
            'codigo' => ['required', 'regex:/^CONV-\d{4}-\d{3}$/', $codigoUnico],
            'titulo' => ['required', 'string', 'max:200'],
            'tipo' => ['required', Rule::in(['marco', 'especifico', 'pasantia', 'adenda', 'renovacion', 'sustitucion'])],
            'unidad_id' => ['required', 'integer', 'exists:unidades,id'],
            // Opcionales: si el convenio se carga con su PDF, este texto está en el PDF
            'objeto' => ['nullable', 'string'],
            'alcance' => ['nullable', 'string'],
            'obligaciones' => ['nullable', 'string'],
            'condiciones_rescision' => ['nullable', 'string'],
            'marco_legal' => ['nullable', 'string'],
            'resolucion' => ['nullable', 'string', 'max:60'],
            'expediente' => ['nullable', 'string', 'max:60'],
            'condiciones_renovacion' => ['nullable', 'string'],
            'confidencialidad' => ['nullable', 'string'],
            'notas' => ['nullable', 'string'],

            // Fechas coherentes: firma <= inicio < vencimiento, y preaviso <= vencimiento
            'fecha_firma' => ['nullable', 'date_format:Y-m-d'],
            'fecha_inicio' => ['nullable', 'date_format:Y-m-d',
                Rule::when($lleno('fecha_firma'), 'after_or_equal:fecha_firma')],
            'fecha_vencimiento' => ['nullable', 'date_format:Y-m-d',
                Rule::when($lleno('fecha_inicio'), 'after:fecha_inicio')],
            'fecha_preaviso' => ['nullable', 'date_format:Y-m-d',
                Rule::when($lleno('fecha_vencimiento'), 'before_or_equal:fecha_vencimiento')],
        ];

        // Al editar, el cliente manda la versión que leyó
        if ($esEdicion) {
            $reglas['version'] = ['required', 'integer', 'min:1'];
        } else {
            // Al crear, el específico, la pasantía y la adenda traen el convenio del que dependen
            $necesita = in_array($datos['tipo'] ?? null, ['especifico', 'pasantia', 'adenda'], true);
            $reglas['antecedente_id'] = [$necesita ? 'required' : 'nullable', 'integer'];
        }

        return $reglas;
    }
}