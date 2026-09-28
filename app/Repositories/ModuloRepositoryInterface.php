<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Modulo;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface ModuloRepositoryInterface
{
    public function __construct(Modulo $modulo);

    /**
     * Stores a new instance of Modulo in the database
     */
    public function store(array $data): Modulo;

    /**
     * Returns all instances of Modulo from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Modulo>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection;

    /**
     * Returns a paginated list of Modulo belonging to the given Instituicao
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null, ?string $unidadeNome = null): LengthAwarePaginator;

    /**
     * Returns all Modulo records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Modulo>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection;

    /**
     * Returns an instance of Modulo from the given id
     */
    public function get(int|string $id): ?Modulo;

    /**
     * Updates the data of an instance of Modulo
     */
    public function update(array $data, int|string $id): Modulo;

    /**
     * Removes an instance of Modulo from the database
     */
    public function destroy(int|string $id): bool;
}
