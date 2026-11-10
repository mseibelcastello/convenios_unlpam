<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\AgreementLink;
use App\Support\ReglasVinculos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AgreementLinkController extends Controller
{
    public function index(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();
        $convenio = Agreement::visiblesPara($usuario)->findOrFail($id);

        // Antecedentes: los convenios en los que este se apoya
        $antecedentes = AgreementLink::with('destino')
            ->where('convenio_origen_id', $convenio->id)
            ->whereHas('destino', fn ($q) => $q->visiblesPara($usuario))
            ->orderBy('id')->get()
            ->map(fn ($v) => $this->elemento($v, $v->destino));

        // Derivados: los convenios que se apoyan en este
        $derivados = AgreementLink::with('origen')
            ->where('convenio_destino_id', $convenio->id)
            ->whereHas('origen', fn ($q) => $q->visiblesPara($usuario))
            ->orderBy('id')->get()
            ->map(fn ($v) => $this->elemento($v, $v->origen));

        return response()->json([
            'antecedentes' => $antecedentes->values(),
            'derivados' => $derivados->values(),
        ]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();

        // Convenio fuera del alcance del usuario = 404
        $origen = Agreement::visiblesPara($usuario)->findOrFail($id);

        $datos = $request->validate([
            'convenio_destino_id' => ['required', 'integer'],
            'tipo_vinculo' => ['required', Rule::in(ReglasVinculos::tipos())],
        ]);

        $this->exigirBorrador($origen);

        if ((int) $datos['convenio_destino_id'] === $origen->id) {
            throw ValidationException::withMessages([
                'convenio_destino_id' => ['Un convenio no puede vincularse consigo mismo'],
            ]);
        }

        $destino = Agreement::visiblesPara($usuario)->find($datos['convenio_destino_id']);
        if (! $destino) {
            throw ValidationException::withMessages([
                'convenio_destino_id' => ['El convenio no existe o no tenés acceso'],
            ]);
        }

        $motivo = ReglasVinculos::incompatibilidad($datos['tipo_vinculo'], $origen->tipo, $destino->tipo);
        if ($motivo) {
            throw ValidationException::withMessages(['tipo_vinculo' => [$motivo]]);
        }

        $enSentidoContrario = AgreementLink::where('convenio_origen_id', $destino->id)
            ->where('convenio_destino_id', $origen->id)
            ->exists();
        if ($enSentidoContrario) {
            throw ValidationException::withMessages([
                'convenio_destino_id' => ['Ya existe un vínculo en sentido contrario'],
            ]);
        }

        $repetido = AgreementLink::where('convenio_origen_id', $origen->id)
            ->where('convenio_destino_id', $destino->id)
            ->where('tipo_vinculo', $datos['tipo_vinculo'])
            ->exists();
        if ($repetido) {
            return response()->json(['message' => 'El vínculo ya existe'], 409);
        }

        // Solo se inserta el vínculo: ninguno de los dos convenios se modifica
        $vinculo = AgreementLink::create([
            'convenio_origen_id' => $origen->id,
            'convenio_destino_id' => $destino->id,
            'tipo_vinculo' => $datos['tipo_vinculo'],
        ]);

        return response()->json($vinculo, 201);
    }

    public function destroy(Request $request, int $id, int $linkId): JsonResponse
    {
        $origen = Agreement::visiblesPara($request->user())->findOrFail($id);

        // El vínculo tiene que ser de este convenio; si es de otro, 404
        $vinculo = AgreementLink::where('convenio_origen_id', $origen->id)->findOrFail($linkId);

        $this->exigirBorrador($origen);

        $vinculo->delete();

        return response()->json(['message' => 'Vínculo eliminado']);
    }

    private function exigirBorrador(Agreement $convenio): void
    {
        if ($convenio->estado !== 'borrador') {
            throw ValidationException::withMessages([
                'estado' => ['Solo se pueden cambiar los vínculos de un convenio en borrador'],
            ]);
        }
    }

    /** Formato del contrato, más vinculo_id para poder borrarlo */
    private function elemento(AgreementLink $vinculo, Agreement $convenio): array
    {
        return [
            'vinculo_id' => $vinculo->id,
            'id' => $convenio->id,
            'codigo' => $convenio->codigo,
            'titulo' => $convenio->titulo,
            'tipo' => $convenio->tipo,
            'estado' => $convenio->estado,
            'tipo_vinculo' => $vinculo->tipo_vinculo,
        ];
    }
}