<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Setor;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface SetorRepositoryInterface
{
    public function __construct(Setor $setor);

    /**
     * Stores a new instance of Setor in the database
     */
    public function store(array $data): Setor;

    /**
     * Returns all instances of Setor from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Setor>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection;

    /**
     * Returns all Setor records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Setor>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection;

    /**
     * Returns a paginated list of Setor belonging to the given Instituicao
     *
     * @return LengthAwarePaginator<int, Setor>
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null, ?int $unidadeId = null): LengthAwarePaginator;

    /**
     * Returns an instance of Setor from the given id
     */
    public function get(int|string $id): ?Setor;

    /**
     * Updates the data of an instance of Setor
     */
    public function update(array $data, int|string $id): Setor;

    /**
     * Removes an instance of Setor from the database
     */
    public function destroy(int|string $id): bool;
}
