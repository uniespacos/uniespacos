<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\HorarioRepositoryInterface;
use Illuminate\Support\Collection;

class ConflictDetectionService
{
    public function __construct(
        private HorarioRepositoryInterface $horarios,
    ) {}

    /**
     * Conflitos dos horarios da reserva com horarios deferidos de outras reservas.
     *
     * @return Collection<int, \stdClass> indexada pelo id do horario checado; um conflito por horario (o primeiro por data e horario_inicio).
     */
    public function findConflictsFor(int $reservaId): Collection
    {
        $linhas = $this->horarios->linhasDaReserva($reservaId);

        return $this->horarios->conflitosDeferidos($linhas->all(), $reservaId)
            ->mapWithKeys(function (array $conflito, int|string $horarioId): array {
                $linha = new \stdClass;
                $linha->horario_checado_id = (int) $horarioId;
                $linha->conflito_reserva_titulo = $conflito['conflito']['reserva_titulo'];

                return [(int) $horarioId => $linha];
            });
    }
}
