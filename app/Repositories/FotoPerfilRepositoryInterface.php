<?php

declare(strict_types=1);

namespace App\Repositories;

interface FotoPerfilRepositoryInterface
{
    /**
     * @param  callable(list<array{id: int, caminho: string}>): void  $porLote
     */
    public function percorrerFotosDeUsuarios(int $tamanhoLote, callable $porLote): void;

    /**
     * @return list<string>
     */
    public function caminhosReferenciados(): array;

    public function trocarFoto(int $id, string $caminhoAtual, string $novoCaminho): bool;
}
