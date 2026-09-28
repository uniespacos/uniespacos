<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Unidade;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface UnidadeRepositoryInterface
{
    public function __construct(Unidade $unidade);

    /**
     * Stores a new instance of Unidade in the database
     */
    public function store(array $data): Unidade;

    /**
     * Returns all instances of Unidade from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Unidade>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection;

    /**
     * Returns all Unidade records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Unidade>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection;

    /**
     * Returns a paginated list of Unidade belonging to the given Instituicao
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null): LengthAwarePaginator;

    /**
     * Returns an instance of Unidade from the given id
     */
    public function get(int|string $id): ?Unidade;

    /**
     * Updates the data of an instance of Unidade
     */
    public function update(array $data, int|string $id): Unidade;

    /**
     * Removes an instance of Unidade from the database
     */
    public function destroy(int|string $id): bool;
}
