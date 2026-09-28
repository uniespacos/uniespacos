<?php

declare(strict_types=1);

namespace App\Http\Controllers\Gestor;

use App\Enums\Relatorio\FormatoRelatorioEnum;
use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Http\Controllers\Controller;
use App\Http\Requests\Relatorio\DadosRelatorioRequest;
use App\Http\Requests\Relatorio\GerarRelatorioRequest;
use App\Services\Relatorio\Data\FiltrosRelatorio;
use App\Services\Relatorio\RelatorioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class GestorRelatorioController extends Controller
{
    public function __construct(
        private RelatorioService $service,
    ) {}

    public function index(): Response
    {
        $tipos = TipoRelatorioEnum::disponiveisPara(Auth::user());
        $tiposDisponiveis = array_map(fn (TipoRelatorioEnum $tipo) => [
            'value' => $tipo->value,
            'label' => $tipo->tituloCurto(),
        ], $tipos);

        return Inertia::render('Gestor/Relatorios/RelatoriosGestorPage', [
            'tipos_disponiveis' => $tiposDisponiveis,
            'opcoes_inventario' => $this->service->opcoesInventario(Auth::user()),
        ]);
    }

    public function gerar(GerarRelatorioRequest $request): BinaryFileResponse|StreamedResponse
    {
        return $this->service->gerar(
            Auth::user(),
            TipoRelatorioEnum::from($request->string('tipo')->toString()),
            FormatoRelatorioEnum::from($request->string('formato')->toString()),
            FiltrosRelatorio::fromArray($request->validated()),
        );
    }

    public function dados(DadosRelatorioRequest $request): JsonResponse
    {
        $dados = $this->service->agregarComCache(
            Auth::user(),
            TipoRelatorioEnum::from($request->string('tipo')->toString()),
            FiltrosRelatorio::fromArray($request->validated()),
        );

        return response()->json($dados);
    }
}
