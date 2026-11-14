<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\VerificacaoDeAmbienteService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class CheckEnvCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'app:check-env {--estrito : Sai com código 1 se houver alguma FALHA}';

    /**
     * @var string
     */
    protected $description = 'Audita a configuração efetiva do ambiente e mostra OK, AVISO ou FALHA por checagem, sem expor valores.';

    public function handle(VerificacaoDeAmbienteService $verificacao): int
    {
        $estrito = (bool) $this->option('estrito');

        try {
            $resultados = $verificacao->executar();
        } catch (Throwable $e) {
            $excecao = $e::class;

            Log::error('ambiente.verificacao_falhou', ['excecao' => $excecao]);
            $this->error("Verificação interrompida ({$excecao}).");

            return $estrito ? self::FAILURE : self::SUCCESS;
        }

        $this->table(
            ['Nível', 'Checagem', 'Motivo'],
            array_map(
                fn (array $resultado): array => [$resultado['status'], $resultado['checagem'], $resultado['motivo']],
                $resultados,
            ),
        );

        $falhas = count(array_filter($resultados, fn (array $resultado): bool => $resultado['status'] === VerificacaoDeAmbienteService::FALHA));
        $avisos = count(array_filter($resultados, fn (array $resultado): bool => $resultado['status'] === VerificacaoDeAmbienteService::AVISO));

        $this->line("Resumo: {$falhas} falha(s), {$avisos} aviso(s).");

        return $estrito && $falhas > 0 ? self::FAILURE : self::SUCCESS;
    }
}
