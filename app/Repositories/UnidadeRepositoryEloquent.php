<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Unidade;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class UnidadeRepositoryEloquent implements UnidadeRepositoryInterface
{
    public function __construct(
        protected Unidade $unidade,
    ) {}

    /**
     * Stores a new instance of Unidade in the database
     */
    public function store(array $data): Unidade
    {
        return $this->unidade->create($data);
    }

    /**
     * Returns all instances of Unidade from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Unidade>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection
    {
        $query = $this->unidade->newQuery();

        if ($filters) {
            $query->where($filters);
        }

        return $query->get($columns);
    }

    /**
     * Returns all Unidade records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Unidade>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection
    {
        return $this->unidade
            ->where('instituicao_id', $instituicaoId)
            ->with(['instituicao'])
            ->get();
    }

    /**
     * Returns a paginated list of Unidade belonging to the given Instituicao
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null): LengthAwarePaginator
    {
        return $this->unidade
            ->where('instituicao_id', $instituicaoId)
            ->when($search, fn ($q) => $q->where(
                fn ($q2) => $q2->where('nome', 'ilike', "%{$search}%")
                    ->orWhere('sigla', 'ilike', "%{$search}%")
            ))
            ->with(['instituicao'])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Returns an instance of Unidade from the given id
     */
    public function get(int|string $id): ?Unidade
    {
        return $this->unidade->find($id);
    }

    /**
     * Updates the data of an instance of Unidade
     */
    public function update(array $data, int|string $id): Unidade
    {
        $unidade = $this->unidade->findOrFail($id);
        $unidade->update($data);

        return $unidade;
    }

    /**
     * Removes an instance of Unidade from the database
     */
    public function destroy(int|string $id): bool
    {
        return (bool) $this->unidade->findOrFail($id)->delete();
    }
}
