<?php

declare(strict_types=1);

namespace Tests\Concerns;

use Carbon\Carbon;

/**
 * Fixa o relogio do teste para que `now()`, `today()` e `Carbon::now()` nao
 * dependam do dia em que a suite roda.
 *
 * A data padrao e uma quarta-feira no meio do mes, longe das viradas de mes e
 * de ano. Com `TESTE_RELOGIO` definida no ambiente,
 * a suite inteira roda na data informada, o que permite exercitar as viradas
 * de mes e de ano sem alterar o codigo dos testes.
 */
trait CongelaRelogio
{
    protected function congelarRelogio(?string $iso = null): void
    {
        $instante = $iso ?? (getenv('TESTE_RELOGIO') ?: '2026-11-18 10:00:00');

        Carbon::setTestNow(Carbon::parse($instante, 'America/Bahia'));
    }

    protected function setUpCongelaRelogio(): void
    {
        $this->congelarRelogio();
    }

    protected function tearDownCongelaRelogio(): void
    {
        Carbon::setTestNow();
    }
}
