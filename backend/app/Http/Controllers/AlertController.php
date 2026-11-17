<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    private const POR_PAGINA = 20;

    /** Los avisos del usuario, los más nuevos primero. ?no_leidas=1 trae solo los pendientes. */
    public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'no_leidas' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $usuarioId = $request->user()->id;

        $pagina = Notification::with('convenio:id,codigo,titulo,estado,fecha_vencimiento')
            ->where('usuario_id', $usuarioId)
            ->when($filtros['no_leidas'] ?? false, fn ($q) => $q->where('leida', false))
            ->orderByDesc('fecha')->orderByDesc('id')
            ->paginate(self::POR_PAGINA);

        return response()->json([
            'data' => collect($pagina->items())->map(fn (Notification $n) => $n->paraApi()),
            'meta' => [
                'page' => $pagina->currentPage(),
                'last_page' => $pagina->lastPage(),
                'total' => $pagina->total(),
                // Para el número de la campanita
                'no_leidas' => Notification::where('usuario_id', $usuarioId)->where('leida', false)->count(),
            ],
        ]);
    }

    public function read(Request $request, int $id): JsonResponse
    {
        // Un aviso de otro usuario es como si no existiera
        $aviso = Notification::where('usuario_id', $request->user()->id)->findOrFail($id);

        if (! $aviso->leida) {
            $aviso->update(['leida' => true]);
        }

        return response()->json($aviso->load('convenio:id,codigo,titulo,estado,fecha_vencimiento')->paraApi());
    }
}
