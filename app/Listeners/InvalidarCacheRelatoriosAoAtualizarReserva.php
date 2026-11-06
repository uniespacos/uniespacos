<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Events\ReservaAlterada;
use App\Services\Relatorio\RelatorioService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\SerializesModels;

class InvalidarCacheRelatoriosAoAtualizarReserva implements ShouldQueue
{
    use SerializesModels;

    public function __construct(
        private RelatorioService $relatorioService,
    ) {}

    /**
     * Regra inviolável: ShouldQueue obrigatório (envio síncrono trava a request).
     */
    public function handle(ReservaAlterada $event): void
    {
        if (in_array($event->acao, ReservaAlterada::ACOES_QUE_ALTERAM_RELATORIOS, true)) {
            $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::RESERVAS_PERIODO);
            $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::OCUPACAO_ESPACOS);
            $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::INDICADORES_CONSOLIDADOS);
        }
    }
}
