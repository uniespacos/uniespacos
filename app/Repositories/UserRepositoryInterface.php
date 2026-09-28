<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface UserRepositoryInterface
{
    public function __construct(User $user);

    /**
     * Stores a new instance of User in the database
     */
    public function store(array $data): User;

    /**
     * Returns all instances of User from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, User>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection;

    /**
     * Returns all User records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, User>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection;

    /**
     * Returns all User records belonging to the given Instituicao including their agendas
     *
     * @return Collection<int, User>
     */
    public function getAllWithAgendasByInstituicao(int $instituicaoId): Collection;

    /**
     * Returns a paginated list of User records for the admin index page,
     * carrying only the columns and the role relation the listing renders.
     */
    public function getPaginatedForAdminByInstituicao(int $instituicaoId, ?string $search, ?int $setorId, int $perPage = 10): LengthAwarePaginator;

    /**
     * Returns a single User with the agendas and permission sets the permission modal needs.
     */
    public function getWithPermissionContext(int|string $id): ?User;

    /**
     * Returns an instance of User from the given id
     */
    public function get(int|string $id): ?User;

    /**
     * Updates the data of an instance of User
     */
    public function update(array $data, int|string $id): User;

    /**
     * Removes an instance of User from the database
     */
    public function destroy(int|string $id): bool;
}
