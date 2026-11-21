<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\HorarioRepositoryInterface;
use Illuminate\Database\ConnectionResolverInterface;
use LogicException;

final class TravaDeHorarios
{
    public function __construct(
        private HorarioRepositoryInterface $horarios,
        private ConnectionResolverInterface $conexoes,
    ) {}

    /**
     * @param  array<array-key, int|string>  $agendaIds
     *
     * @throws LogicException quando chamada fora de transação: sem ela o lock é liberado na hora.
     */
    public function adquirir(array $agendaIds, string $dataInicial, string $dataFinal): void
    {
        if ($this->conexoes->connection()->transactionLevel() === 0) {
            throw new LogicException('TravaDeHorarios::adquirir precisa de uma transação aberta: o lock dura só até o commit.');
        }

        $ids = array_values(array_unique(array_filter(
            array_map(fn (int|string $id): int => (int) $id, $agendaIds),
        )));
        sort($ids);

        if ($ids === []) {
            return;
        }

        $this->horarios->bloquearPeriodo($ids, $dataInicial, $dataFinal);
    }
}
