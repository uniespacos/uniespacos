<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AnonimizacaoCoberturaDeTabelasTest extends TestCase
{
    public function test_toda_tabela_do_banco_esta_classificada_para_anonimizacao(): void
    {
        $tabelas = array_map(
            fn (array $tabela): string => (string) $tabela['name'],
            Schema::getTables(),
        );

        $semClassificacao = array_values(array_diff($tabelas, $this->tabelasClassificadas()));

        $this->assertSame([], $semClassificacao, $this->mensagemDeTabelasSemClassificacao($semClassificacao));
    }

    public function test_nenhuma_tabela_aparece_em_mais_de_um_grupo(): void
    {
        $contagem = array_count_values($this->tabelasClassificadas());
        $duplicadas = array_keys(array_filter($contagem, fn (int $quantidade): bool => $quantidade > 1));

        $this->assertSame([], $duplicadas, 'Tabela(s) classificada(s) em mais de um grupo de config/anonimizacao.php: '.implode(', ', $duplicadas));
    }

    /**
     * @return list<string>
     */
    private function tabelasClassificadas(): array
    {
        return array_values(array_map(
            strval(...),
            array_merge(
                array_keys((array) config('anonimizacao.tratadas', [])),
                array_keys((array) config('anonimizacao.apagar', [])),
                array_keys((array) config('anonimizacao.sem_dado_pessoal', [])),
            ),
        ));
    }

    /**
     * @param  list<string>  $semClassificacao
     */
    private function mensagemDeTabelasSemClassificacao(array $semClassificacao): string
    {
        return 'Tabela(s) sem classificação de privacidade: '.implode(', ', $semClassificacao).'. '
            .'Classifique cada uma em config/anonimizacao.php (grupos tratadas, apagar ou sem_dado_pessoal). '
            .'Se a tabela tiver dado pessoal ou texto livre, trate-a e registre a mudança para o inventário de dados (T-14 no backlog). '
            .'Marque o bloco Privacidade do template de PR (.github/pull_request_template.md).';
    }
}
