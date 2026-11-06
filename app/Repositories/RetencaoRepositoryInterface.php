<?php

declare(strict_types=1);

namespace App\Repositories;

use Carbon\CarbonInterface;

interface RetencaoRepositoryInterface
{
    public function contarNotificacoesLidasAntesDe(CarbonInterface $corte): int;

    public function apagarNotificacoesLidasAntesDe(CarbonInterface $corte): int;

    public function contarCacheExpiradoAntesDe(int $corteUnix): int;

    public function apagarCacheExpiradoAntesDe(int $corteUnix): int;

    public function contarSessoesInativasAntesDe(int $corteUnix): int;

    public function apagarSessoesInativasAntesDe(int $corteUnix): int;

    public function contarTokensRedefinicaoAntesDe(CarbonInterface $corte): int;

    public function apagarTokensRedefinicaoAntesDe(CarbonInterface $corte): int;

    public function contarTokensRedefinicaoSemData(): int;

    public function contarJobsPendentesAntesDe(int $corteUnix): int;

    /**
     * @return list<array{id: int, justificativa: string}>
     */
    public function justificativasDeConflitoAposId(int $aposId, int $tamanho): array;

    /**
     * @param  list<int>  $ids
     */
    public function substituirJustificativas(array $ids, string $texto): int;
}
