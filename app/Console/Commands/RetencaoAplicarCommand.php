<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\RetencaoService;
use Closure;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class RetencaoAplicarCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'retencao:aplicar {--dry-run : Apenas conta o que seria apagado, sem remover nada}';

    /**
     * @var string
     */
    protected $description = 'Aplica os prazos de retenção de jobs, lotes, notificações lidas, cache, sessões e logs diários.';

    public function handle(RetencaoService $retencao): int
    {
        $simular = (bool) $this->option('dry-run');

        $this->info($simular ? 'Simulação: nada será apagado.' : 'Aplicando a retenção de dados.');

        $resultados = [
            $this->rotina('notificacoes_lidas', fn (): ?int => $retencao->notificacoesLidas($simular), $simular),
            $this->rotina('cache', fn (): ?int => $retencao->cache($simular), $simular),
            $this->rotina('sessoes', fn (): ?int => $retencao->sessoes($simular), $simular),
            $this->rotina('logs_diarios', fn (): ?int => $retencao->logs($simular), $simular),
            $this->podarFilas($retencao, $simular),
        ];

        return in_array(false, $resultados, true) ? self::FAILURE : self::SUCCESS;
    }

    private function rotina(string $nome, Closure $acao, bool $simular): bool
    {
        try {
            $quantidade = $acao();
        } catch (Throwable $e) {
            return $this->registrarFalha($nome, $e);
        }

        if ($quantidade === null) {
            $this->warn("[{$nome}] pulada: prazo inválido.");

            return true;
        }

        $this->line("[{$nome}] {$quantidade} ".($simular ? 'seriam removidos.' : 'removidos.'));
        Log::info('retencao.rotina_aplicada', ['rotina' => $nome, 'quantidade' => $quantidade, 'simulacao' => $simular]);

        return true;
    }

    private function podarFilas(RetencaoService $retencao, bool $simular): bool
    {
        try {
            $horasJobs = $retencao->horasDeRetencao('jobs_falhos_dias');
        } catch (Throwable $e) {
            return $this->registrarFalha('jobs_falhos', $e);
        }

        if ($horasJobs === null) {
            $this->warn('[jobs_falhos] pulada: prazo inválido.');
            $this->warn('[lotes_jobs] pulada: prazo inválido.');

            return true;
        }

        return $this->comandoDeFila('queue:prune-failed', ['--hours' => $horasJobs], $simular)
            && $this->comandoDeFila('queue:prune-batches', [
                '--hours' => $horasJobs,
                '--unfinished' => $horasJobs,
                '--cancelled' => $horasJobs,
            ], $simular);
    }

    /**
     * @param  array<string, int>  $opcoes
     */
    private function comandoDeFila(string $comando, array $opcoes, bool $simular): bool
    {
        if ($simular) {
            $this->line("[{$comando}] seria executado.");

            return true;
        }

        try {
            $codigo = $this->call($comando, $opcoes);
        } catch (Throwable $e) {
            return $this->registrarFalha($comando, $e);
        }

        if ($codigo !== self::SUCCESS) {
            Log::error('retencao.comando_falhou', ['comando' => $comando, 'codigo' => $codigo]);
            $this->error("[{$comando}] terminou com código {$codigo}.");

            return false;
        }

        Log::info('retencao.comando_executado', ['comando' => $comando, 'simulacao' => false]);

        return true;
    }

    private function registrarFalha(string $rotina, Throwable $e): bool
    {
        $excecao = $e::class;

        Log::error('retencao.rotina_falhou', ['rotina' => $rotina, 'excecao' => $excecao]);
        $this->error("[{$rotina}] falhou ({$excecao}).");

        return false;
    }
}
