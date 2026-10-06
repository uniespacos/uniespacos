<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Reserva;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface ReservaRepositoryInterface
{
    public function __construct(Reserva $reserva);

    /**
     * Stores a new instance of Reserva in the database
     */
    public function store(array $data): Reserva;

    /**
     * Returns all instances of Reserva from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Reserva>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection;

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
     * Returns an instance of Reserva from the given id
     */
    public function get(int|string $id): ?Reserva;

    /**
     * Updates the data of an instance of Reserva
     */
    public function update(array $data, int|string $id): Reserva;

    /**
     * Removes an instance of Reserva from the database
     */
    public function destroy(int|string $id): bool;
}
