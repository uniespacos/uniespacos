<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Reserva;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

/**
 * @extends CrudRepositoryInterface<Reserva>
 */
interface ReservaRepositoryInterface extends CrudRepositoryInterface
{
    public function __construct(Reserva $reserva);

    /**
     * Returns a paginated list of Reserva for a specific user, with optional filters
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForUser(int $userId, array $filters = [], int $perPage = 10): LengthAwarePaginator;

    /**
     * Returns a Reserva with its week-filtered horarios for the detail modal
     */
    public function findWithWeekSlots(int $reservaId, string $weekStart, string $weekEnd): ?Reserva;

    /**
     * Returns a paginated list of Reserva visible to the given gestor agendas, with optional filters
     *
     * @param  array<int>  $agendaIds
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForGestor(array $agendaIds, array $filters = [], int $perPage = 10): LengthAwarePaginator;

    /**
     * Returns a Reserva with horarios filtered to the gestor's agendas and the given week
     *
     * @param  array<int>  $agendaIds
     */
    public function findForGestorModal(int $reservaId, array $agendaIds, string $weekStart, string $weekEnd): ?Reserva;

    /**
     * Insere em lote horarios ja montados; cada linha traz o reserva_id.
     *
     * @param  array<int, array<string, mixed>>  $linhas
     */
    public function inserirHorarios(array $linhas): void;

    /**
     * Returns the reservas of the given requester still awaiting evaluation, locked for update
     *
     * @return Collection<int, Reserva>
     */
    public function getPendentesDoSolicitante(int $userId): Collection;

    public function contarDaInstituicao(?int $instituicaoId, ?CarbonInterface $inicio, ?CarbonInterface $fim): int;

    /**
     * @return array<string, int>
     */
    public function contarPorSituacaoDaInstituicao(?int $instituicaoId, ?CarbonInterface $inicio, ?CarbonInterface $fim): array;

    /**
     * @return array<int, array{nome: string|null, count: int}>
     */
    public function rankingSetoresDaInstituicao(?int $instituicaoId, int $limite): array;

    /**
     * @param  array<mixed>|null  $situacoes
     * @param  array<mixed>|null  $agendaIds
     * @param  array<mixed>|null  $turnos
     * @return Collection<int, Reserva>
     */
    public function listarParaRelatorioDePeriodo(?CarbonInterface $inicio, ?CarbonInterface $fim, ?array $situacoes, ?array $agendaIds, ?array $turnos, ?int $instituicaoId): Collection;

    /**
     * @param  SupportCollection<int, array{data: string, agenda_id: int}>  $slotsOcupados
     * @return Collection<int, Reserva>
     */
    public function reservasParaRevalidarAposAprovacao(int $reservaId, SupportCollection $slotsOcupados): Collection;

    /**
     * @param  SupportCollection<int, array{data: string, agenda_id: int}>  $slotsLiberados
     * @return Collection<int, Reserva>
     */
    public function reservasParaRevalidarAposLiberacao(SupportCollection $slotsLiberados): Collection;
}
