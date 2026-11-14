<?php

declare(strict_types=1);

namespace App\Repositories;

interface AnonimizacaoDeBaseRepositoryInterface
{
    /**
     * @param  list<string>  $colunas
     * @return list<array<string, mixed>>
     */
    public function linhasAposId(string $tabela, array $colunas, int $aposId, int $tamanho): array;

    /**
     * @param  array<string, mixed>  $atributos
     */
    public function atualizar(string $tabela, int $id, array $atributos): int;

    public function tabelaExiste(string $tabela): bool;

    public function contar(string $tabela): int;

    public function apagarTudo(string $tabela, ?string $chave, int $tamanho): int;
}
