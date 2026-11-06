<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Console\AgendadorLoop;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

/**
 * Substitui o `schedule:work` no serviço `scheduler` do compose.prod.yml.
 *
 * Diagnóstico (T-19d): o entrypoint faz `exec "$@"`, então o PHP vira PID 1 do container.
 * Processo PID 1 no Linux não recebe o handler default de SIGTERM, e o `schedule:work` não
 * instala nenhum handler. Por isso o `docker stop` ignora o sinal, o Docker espera o
 * stop_grace_period e mata com SIGKILL (exit 137). Se isso cair no meio da rodada
 * `retencao:aplicar` (03:30 UTC), a retenção fica cortada e a trava `withoutOverlapping`
 * pode ficar presa, pulando a rodada seguinte.
 *
 * `init: true` só troca quem recebe o sinal e continua matando à força depois do prazo.
 * `stop_grace_period` sozinho só atrasa o SIGKILL. Este comando instala o handler:
 * SIGTERM/SIGINT apenas marcam a parada, as rodadas em curso terminam dentro de
 * --teto-parada segundos e o processo sai com 0.
 */
class AgendadorExecutarCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'agendador:executar
        {--teto-parada=100 : Segundos de espera pelas rodadas em curso após SIGTERM/SIGINT}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Executa o agendador (schedule:run a cada minuto) com parada limpa em SIGTERM';

    private bool $paradaSolicitada = false;

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        pcntl_async_signals(true);

        $marcarParada = function (): void {
            $this->paradaSolicitada = true;
        };
        pcntl_signal(SIGTERM, $marcarParada);
        pcntl_signal(SIGINT, $marcarParada);

        $loop = new AgendadorLoop(
            relogio: fn (): CarbonImmutable => CarbonImmutable::now(),
            iniciarProcesso: fn (): Process => $this->iniciarScheduleRun(),
            paradaSolicitada: fn (): bool => $this->paradaSolicitada,
            dormir: function (int $microssegundos): void {
                usleep($microssegundos);
            },
            saida: function (string $trecho): void {
                $this->output->write($trecho);
            },
            tetoParadaSegundos: max(1, (int) $this->option('teto-parada')),
        );

        return $loop->executar();
    }

    private function iniciarScheduleRun(): Process
    {
        // Forma de array: o Symfony prefixa `exec`, então o filho é o próprio PHP (sem `sh`
        // intermediário) e o `stop()` no teto alcança o `schedule:run`, não só o shell.
        $processo = new Process([PHP_BINARY, 'artisan', 'schedule:run'], base_path());
        $processo->start();

        return $processo;
    }
}
