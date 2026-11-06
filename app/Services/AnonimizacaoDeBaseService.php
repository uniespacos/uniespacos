<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Repositories\AnonimizacaoDeBaseRepositoryInterface;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AnonimizacaoDeBaseService
{
    private const TAMANHO_LOTE = 500;

    private const FORMATO_NOME_USUARIO = 'Usuário %d';

    private const FORMATO_EMAIL_USUARIO = 'usuario%d@anonimizado.test';

    private const FORMATO_TITULO_RESERVA = 'Reserva %d';

    public function __construct(
        protected AnonimizacaoDeBaseRepositoryInterface $repo,
    ) {}

    /**
     * @return array{tabelas: list<array{tabela: string, operacao: string, quantidade: int}>, arquivos: ?int}
     */
    public function simular(bool $semArquivos): array
    {
        return [
            'tabelas' => $this->processar('', true),
            'arquivos' => $semArquivos ? null : $this->apagarAvatars(true),
        ];
    }

    /**
     * Banco em uma transação só: se qualquer tabela falhar, nada é gravado. Os arquivos são apagados
     * depois do commit, porque não voltam com rollback.
     *
     * @return array{tabelas: list<array{tabela: string, operacao: string, quantidade: int}>, arquivos: ?int}
     */
    public function anonimizar(string $hashSenha, bool $semArquivos): array
    {
        $tabelas = DB::transaction(fn (): array => $this->processar($hashSenha, false));

        return [
            'tabelas' => $tabelas,
            'arquivos' => $semArquivos ? null : $this->apagarAvatars(false),
        ];
    }

    /**
     * @return list<array{tabela: string, operacao: string, quantidade: int}>
     */
    private function processar(string $hashSenha, bool $simular): array
    {
        $relatorio = [
            [
                'tabela' => 'users',
                'operacao' => 'anonimizar',
                'quantidade' => $this->anonimizarTabela(
                    'users',
                    ['id', 'name', 'email'],
                    fn (array $linha): array => $this->atributosDoUsuario($linha, $hashSenha),
                    $simular,
                ),
            ],
            [
                'tabela' => 'reservas',
                'operacao' => 'anonimizar',
                'quantidade' => $this->anonimizarTabela(
                    'reservas',
                    ['id', 'titulo', 'descricao', 'observacao', 'conflict_cache'],
                    fn (array $linha): array => $this->atributosDaReserva($linha),
                    $simular,
                ),
            ],
            [
                'tabela' => 'horarios',
                'operacao' => 'anonimizar',
                'quantidade' => $this->anonimizarTabela(
                    'horarios',
                    ['id', 'justificativa'],
                    fn (array $linha): array => $this->textosNeutros($linha, ['justificativa']),
                    $simular,
                ),
            ],
        ];

        foreach ((array) config('anonimizacao.apagar', []) as $tabela => $chave) {
            $tabela = (string) $tabela;

            if (! $this->repo->tabelaExiste($tabela)) {
                continue;
            }

            $relatorio[] = [
                'tabela' => $tabela,
                'operacao' => 'apagar',
                'quantidade' => $simular
                    ? $this->repo->contar($tabela)
                    : $this->repo->apagarTudo($tabela, is_string($chave) ? $chave : null, self::TAMANHO_LOTE),
            ];
        }

        return $relatorio;
    }

    /**
     * Percorre a tabela por id em lotes. Só conta ou grava as linhas cujos atributos mudam, então rodar de novo não altera nada.
     *
     * @param  list<string>  $colunas
     * @param  callable(array<string, mixed>): array<string, mixed>  $atributos
     */
    private function anonimizarTabela(string $tabela, array $colunas, callable $atributos, bool $simular): int
    {
        $alteradas = 0;
        $aposId = 0;

        do {
            $linhas = $this->repo->linhasAposId($tabela, $colunas, $aposId, self::TAMANHO_LOTE);

            foreach ($linhas as $linha) {
                $aposId = Arr::integer($linha, 'id');
                $novos = $atributos($linha);

                if ($novos === []) {
                    continue;
                }

                if (! $simular) {
                    $this->repo->atualizar($tabela, $aposId, $novos);
                }

                $alteradas++;
            }
        } while ($linhas !== []);

        return $alteradas;
    }

    /**
     * @param  array<string, mixed>  $linha
     * @return array<string, mixed>
     */
    private function atributosDoUsuario(array $linha, string $hashSenha): array
    {
        $id = Arr::integer($linha, 'id');
        $emailAtual = Arr::string($linha, 'email');
        $emailNovo = sprintf(self::FORMATO_EMAIL_USUARIO, $id);

        if ((new User(['email' => $emailAtual]))->estaAnonimizado()) {
            return [];
        }

        if ($emailAtual === $emailNovo) {
            return [];
        }

        return [
            'name' => sprintf(self::FORMATO_NOME_USUARIO, $id),
            'email' => $emailNovo,
            'telefone' => Config::string('anonimizacao.textos.telefone'),
            'profile_pic' => '',
            'password' => $hashSenha,
            'remember_token' => null,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $linha
     * @return array<string, mixed>
     */
    private function atributosDaReserva(array $linha): array
    {
        $atributos = $this->textosNeutros($linha, ['descricao', 'observacao']);
        $titulo = sprintf(self::FORMATO_TITULO_RESERVA, Arr::integer($linha, 'id'));

        if (Arr::string($linha, 'titulo') !== $titulo) {
            $atributos['titulo'] = $titulo;
        }

        if ($linha['conflict_cache'] !== null) {
            $atributos['conflict_cache'] = null;
        }

        return $atributos;
    }

    /**
     * @param  array<string, mixed>  $linha
     * @param  list<string>  $colunas
     * @return array<string, mixed>
     */
    private function textosNeutros(array $linha, array $colunas): array
    {
        $neutro = Config::string('anonimizacao.textos.neutro');
        $atributos = [];

        foreach ($colunas as $coluna) {
            if ($linha[$coluna] !== null && $linha[$coluna] !== $neutro) {
                $atributos[$coluna] = $neutro;
            }
        }

        return $atributos;
    }

    private function apagarAvatars(bool $simular): int
    {
        $disco = Storage::disk(Config::string('anonimizacao.arquivos.disco'));
        $diretorio = Config::string('anonimizacao.arquivos.diretorio');

        $quantidade = count($disco->allFiles($diretorio));

        if (! $simular) {
            $disco->deleteDirectory($diretorio);
        }

        return $quantidade;
    }
}
