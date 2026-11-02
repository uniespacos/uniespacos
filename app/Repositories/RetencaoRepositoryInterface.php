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
}
