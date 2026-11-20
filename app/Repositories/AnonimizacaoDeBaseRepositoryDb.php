<?php

declare(strict_types=1);

namespace App\Repositories;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AnonimizacaoDeBaseRepositoryDb implements AnonimizacaoDeBaseRepositoryInterface
{
    public function linhasAposId(string $tabela, array $colunas, int $aposId, int $tamanho): array
    {
        $linhas = [];

        $consulta = DB::table($tabela)
            ->select($colunas)
            ->where('id', '>', $aposId)
            ->orderBy('id')
            ->limit($tamanho)
            ->get();

        foreach ($consulta as $linha) {
            $linhas[] = (array) $linha;
        }

        return $linhas;
    }

    public function atualizar(string $tabela, int $id, array $atributos): int
    {
        return DB::table($tabela)
            ->where('id', $id)
            ->update($atributos);
    }

    public function tabelaExiste(string $tabela): bool
    {
        return Schema::hasTable($tabela);
    }

    public function contar(string $tabela): int
    {
        return DB::table($tabela)->count();
    }

    /**
     * Sem chave, apaga com um único DELETE (chave composta). Com chave, apaga em lotes de `$tamanho`
     * linhas, sem TRUNCATE, para que o rollback da transação desfaça tudo.
     */
    public function apagarTudo(string $tabela, ?string $chave, int $tamanho): int
    {
        if ($chave === null) {
            return DB::table($tabela)->delete();
        }

        $apagadas = 0;
        $valores = $this->proximoLoteDeChaves($tabela, $chave, $tamanho);

        while ($valores !== []) {
            $apagadas += DB::table($tabela)->whereIn($chave, $valores)->delete();
            $valores = $this->proximoLoteDeChaves($tabela, $chave, $tamanho);
        }

        return $apagadas;
    }

    /**
     * @return array<int, mixed>
     */
    private function proximoLoteDeChaves(string $tabela, string $chave, int $tamanho): array
    {
        return DB::table($tabela)->orderBy($chave)->limit($tamanho)->pluck($chave)->values()->all();
    }
}
