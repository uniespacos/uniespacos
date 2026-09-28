<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Events\ReservaEvent;
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
     * Listener enfileirado para invalidar cache de relatórios
     * quando uma reserva é criada, atualizada, avaliada ou cancelada.
     *
     * Regra inviolável: ShouldQueue obrigatório (envio síncrono trava a request).
     */
    public function handle(ReservaEvent $event): void
    {
        if (in_array($event->action, ['created', 'updated', 'evaluated', 'canceled'], true)) {
            $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::RESERVAS_PERIODO);
            $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::OCUPACAO_ESPACOS);
            $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::INDICADORES_CONSOLIDADOS);
        }
    }
}
