<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\AnonimizacaoDeBaseService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Troca os dados pessoais de uma base não produtiva por valores neutros. Irreversível.
 *
 * A guarda de ambiente depende de APP_ENV correto: com APP_ENV errado, o comando pode rodar em uma base
 * que não deveria. `php artisan app:check-env` ajuda a detectar essa configuração antes de rodar.
 * Produção é recusada explicitamente, independentemente da lista de ambientes permitidos.
 */
class BaseAnonimizarCommand extends Command
{
    public const PERGUNTA_CONFIRMACAO = 'Esta operação é irreversível e apaga dados pessoais desta base. Continuar?';

    private const TAMANHO_SENHA_GERADA = 20;

    /**
     * @var string
     */
    protected $signature = 'base:anonimizar
        {--dry-run : Conta, por tabela, o que seria alterado, sem gravar nada}
        {--force : Não pede confirmação interativa}
        {--senha= : Senha das contas anonimizadas. Se omitida, uma senha é gerada e mostrada uma vez}
        {--sem-arquivos : Não apaga o diretório de fotos de perfil no disco público}';

    /**
     * @var string
     */
    protected $description = 'Anonimiza dados pessoais de uma base não produtiva (irreversível). Recusa production e exige --force ou confirmação.';

    public function handle(AnonimizacaoDeBaseService $anonimizacao): int
    {
        $ambienteRecusado = $this->motivoDeAmbienteRecusado(app()->environment());

        if ($ambienteRecusado !== null) {
            $this->error($ambienteRecusado);

            return self::FAILURE;
        }

        $simular = (bool) $this->option('dry-run');
        $semArquivos = (bool) $this->option('sem-arquivos');

        if (! $simular && ! $this->confirmarExecucao()) {
            $this->warn('Nada foi alterado.');

            return self::FAILURE;
        }

        try {
            $relatorio = $simular
                ? $anonimizacao->simular($semArquivos)
                : $anonimizacao->anonimizar($this->hashDaSenha(), $semArquivos);
        } catch (Throwable $e) {
            $excecao = $e::class;

            Log::error('base.anonimizacao_falhou', ['excecao' => $excecao]);
            $this->error("Falhou ({$excecao}). A transação foi desfeita; nenhum dado do banco foi alterado.");

            return self::FAILURE;
        }

        $this->mostrarRelatorio($relatorio, $simular);
        $this->avisarRevisaoManual();

        Log::info('base.anonimizacao_concluida', [
            'simulacao' => $simular,
            'tabelas' => $relatorio['tabelas'],
            'arquivos' => $relatorio['arquivos'],
        ]);

        $this->line($simular ? 'Simulação concluída: nada foi gravado.' : 'Base anonimizada.');

        return self::SUCCESS;
    }

    private function motivoDeAmbienteRecusado(string $ambiente): ?string
    {
        if ($ambiente === 'production') {
            return 'Recusado: base:anonimizar não roda em production.';
        }

        $permitidos = config('anonimizacao.ambientes_permitidos', []);

        if (! is_array($permitidos) || ! in_array($ambiente, $permitidos, true)) {
            return "Recusado: o ambiente \"{$ambiente}\" não está em anonimizacao.ambientes_permitidos. Confira APP_ENV.";
        }

        return null;
    }

    private function confirmarExecucao(): bool
    {
        if ($this->option('force')) {
            return true;
        }

        if (! $this->input->isInteractive()) {
            $this->error('Operação irreversível sem terminal interativo: use --force para confirmar.');

            return false;
        }

        return $this->confirm(self::PERGUNTA_CONFIRMACAO, false);
    }

    private function hashDaSenha(): string
    {
        $senha = $this->option('senha');

        if (! is_string($senha) || $senha === '') {
            $senha = Str::password(self::TAMANHO_SENHA_GERADA, symbols: false);
            $this->warn("Senha gerada para as contas anonimizadas (mostrada uma vez): {$senha}");
        }

        return Hash::make($senha);
    }

    /**
     * @param  array{tabelas: list<array{tabela: string, operacao: string, quantidade: int}>, arquivos: ?int}  $relatorio
     */
    private function mostrarRelatorio(array $relatorio, bool $simular): void
    {
        $linhas = array_map(
            fn (array $item): array => [$item['tabela'], $item['operacao'], $item['quantidade']],
            $relatorio['tabelas'],
        );

        if ($relatorio['arquivos'] !== null) {
            $linhas[] = [Config::string('anonimizacao.arquivos.diretorio'), 'apagar arquivos', $relatorio['arquivos']];
        }

        $this->table(
            [$simular ? 'Tabela (simulação)' : 'Tabela', 'Operação', 'Registros'],
            $linhas,
        );
    }

    private function avisarRevisaoManual(): void
    {
        foreach ((array) config('anonimizacao.revisao_manual', []) as $caminho) {
            if (! is_string($caminho)) {
                continue;
            }

            $this->warn('Revisão manual necessária (podem existir dados pessoais, não são apagados por este comando): '.$caminho);
        }
    }
}
