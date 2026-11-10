<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

abstract class Controller
{
    protected function lista(LengthAwarePaginator $pagina): JsonResponse
    {
        return response()->json([
            'data' => $pagina->items(),
            'meta' => [
                'page' => $pagina->currentPage(),
                'total' => $pagina->total(),
                'per_page' => $pagina->perPage(),
                'last_page' => $pagina->lastPage(),
            ],
        ]);
    }
}