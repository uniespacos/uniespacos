<?php

declare(strict_types=1);

namespace App\Console;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

final class AgendadorLoop
{
    private const INTERVALO_MICROSSEGUNDOS = 100_000;

    /** @var array<int, Process> */
    private array $execucoes = [];

    private ?CarbonImmutable $ultimoDisparo = null;

    /**
     * @param  Closure(): CarbonImmutable  $relogio
     * @param  Closure(): Process  $iniciarProcesso  Devolve o processo já iniciado.
     * @param  Closure(): bool  $paradaSolicitada
     * @param  Closure(int): void  $dormir  Recebe microssegundos.
     * @param  Closure(string): void  $saida
     */
    public function __construct(
        private readonly Closure $relogio,
        private readonly Closure $iniciarProcesso,
        private readonly Closure $paradaSolicitada,
        private readonly Closure $dormir,
        private readonly Closure $saida,
        private readonly int $tetoParadaSegundos = 100,
    ) {}

    public function executar(): int
    {
        while (! ($this->paradaSolicitada)()) {
            $this->ciclo();
            ($this->dormir)(self::INTERVALO_MICROSSEGUNDOS);
        }

        return $this->encerrar();
    }

    public function ciclo(): void
    {
        $agora = ($this->relogio)();

        if ($agora->second === 0 && ! ($this->paradaSolicitada)() && ! $this->jaDisparouNoMinuto($agora)) {
            $this->execucoes[] = ($this->iniciarProcesso)();
            $this->ultimoDisparo = $agora->startOfMinute();
        }

        $this->drenarExecucoes();
    }

    private function jaDisparouNoMinuto(CarbonImmutable $agora): bool
    {
        return $this->ultimoDisparo?->equalTo($agora->startOfMinute()) === true;
    }

    private function drenarExecucoes(): void
    {
        foreach ($this->execucoes as $chave => $execucao) {
            $emExecucao = $execucao->isRunning();

            $trecho = ltrim($execucao->getIncrementalOutput().$execucao->getIncrementalErrorOutput(), "\n");
            if ($trecho !== '') {
                ($this->saida)($trecho);
            }

            if (! $emExecucao) {
                unset($this->execucoes[$chave]);
            }
        }
    }

    private function encerrar(): int
    {
        $emCursoNaParada = count($this->execucoes);

        Log::info('agendador.parada_solicitada', ['execucoes_em_curso' => $emCursoNaParada]);

        $inicio = ($this->relogio)()->getTimestamp();

        while ($this->execucoes !== [] && ($this->relogio)()->getTimestamp() - $inicio < $this->tetoParadaSegundos) {
            $this->drenarExecucoes();
            ($this->dormir)(self::INTERVALO_MICROSSEGUNDOS);
        }

        $forcadas = count($this->execucoes);

        foreach ($this->execucoes as $execucao) {
            $execucao->stop();
        }
        $this->execucoes = [];

        Log::info('agendador.parada_concluida', [
            'execucoes_no_prazo' => $emCursoNaParada - $forcadas,
            'execucoes_forcadas' => $forcadas,
        ]);

        return 0;
    }
}
