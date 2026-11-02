<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\RetencaoService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class RetencaoNeutralizarJustificativasCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'retencao:neutralizar-justificativas {--dry-run : Apenas conta as justificativas que seriam trocadas, sem alterar nada}';

    /**
     * @var string
     */
    protected $description = 'Troca as justificativas de conflito antigas (com título e nome de terceiros) pelo texto neutro. Execução única.';

    public function handle(RetencaoService $retencao): int
    {
        $simular = (bool) $this->option('dry-run');

        $this->info($simular ? 'Simulação: nenhuma justificativa será alterada.' : 'Neutralizando justificativas de conflito antigas.');

        try {
            $quantidade = $retencao->neutralizarJustificativasDeConflito(
                (string) __('Conflict with another approved reservation at this time.', [], 'pt_BR'),
                $simular,
            );
        } catch (Throwable $e) {
            $excecao = $e::class;

            Log::error('retencao.justificativas_falhou', ['excecao' => $excecao]);
            $this->error("Falhou ({$excecao}).");

            return self::FAILURE;
        }

        $this->line("[justificativas_conflito] {$quantidade} ".($simular ? 'seriam neutralizadas.' : 'neutralizadas.'));
        Log::info('retencao.justificativas_neutralizadas', ['quantidade' => $quantidade, 'simulacao' => $simular]);

        return self::SUCCESS;
    }
}
