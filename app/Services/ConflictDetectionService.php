<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ConflictDetectionService
{
    /**
     * Finds all conflicting horarios for the given reservation.
     * A conflict is any approved (deferida) horario that overlaps on the same agenda and date.
     * Returns a collection of conflict rows keyed by the checked horario ID.
     *
     * @return Collection<int, \stdClass>
     */
    public function findConflictsFor(int $reservaId): Collection
    {
        $rows = DB::select('
            SELECT
                h_checar.id AS horario_checado_id,
                r_conflito.titulo AS conflito_reserva_titulo
            FROM horarios AS h_checar
            JOIN horarios AS h_conflito
                ON  h_checar.reserva_id = ?
                AND h_conflito.reserva_id != h_checar.reserva_id
                AND h_conflito.situacao = \'deferida\'
                AND h_conflito.agenda_id = h_checar.agenda_id
                AND h_conflito.data = h_checar.data
                AND h_conflito.horario_inicio < h_checar.horario_fim
                AND h_conflito.horario_fim > h_checar.horario_inicio
            JOIN reservas AS r_conflito ON r_conflito.id = h_conflito.reserva_id
        ', [$reservaId]);

        return collect($rows)->keyBy('horario_checado_id');
    }
}
