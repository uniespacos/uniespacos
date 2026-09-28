<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Unidade;
use App\Repositories\UnidadeRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class UnidadeService
{
    public function __construct(
        protected UnidadeRepositoryInterface $repoUnidade,
    ) {}

    /**
     * Returns a paginated list of units belonging to the given institution.
     */
    public function paginate(int $instituicaoId, int $perPage = 10, ?string $search = null): LengthAwarePaginator
    {
        return $this->repoUnidade->getPaginatedByInstituicao($instituicaoId, $perPage, $search);
    }

    /**
     * Returns all units belonging to the given institution.
     *
     * @return Collection<int, Unidade>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection
    {
        return $this->repoUnidade->getAllByInstituicao($instituicaoId);
    }

    /**
     * Creates and persists a new unit.
     *
     * @param  array<string, mixed>  $data
     */
    public function store(array $data): Unidade
    {
        return $this->repoUnidade->store($data);
    }

    /**
     * Updates an existing unit with the given data.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Unidade $unidade, array $data): Unidade
    {
        return $this->repoUnidade->update($data, $unidade->id);
    }

    /**
     * Deletes the given unit from the database.
     */
    public function delete(Unidade $unidade): bool
    {
        return $this->repoUnidade->destroy($unidade->id);
    }
}
