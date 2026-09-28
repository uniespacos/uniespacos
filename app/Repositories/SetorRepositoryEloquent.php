<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Setor;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class SetorRepositoryEloquent implements SetorRepositoryInterface
{
    public function __construct(
        protected Setor $setor,
    ) {}

    /**
     * Stores a new instance of Setor in the database
     */
    public function store(array $data): Setor
    {
        return $this->setor->create($data);
    }

    /**
     * Returns all instances of Setor from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Setor>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection
    {
        $query = $this->setor->newQuery();

        if ($filters) {
            $query->where($filters);
        }

        return $query->get($columns);
    }

    /**
     * Returns all Setor records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Setor>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection
    {
        return $this->setor
            ->whereHas('unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->with(['unidade.instituicao'])
            ->withCount('users')
            ->get();
    }

    /**
     * Returns a paginated list of Setor belonging to the given Instituicao
     *
     * @return LengthAwarePaginator<int, Setor>
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null, ?int $unidadeId = null): LengthAwarePaginator
    {
        return $this->setor
            ->whereHas('unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->when($unidadeId, fn ($q) => $q->where('unidade_id', $unidadeId))
            ->when($search, fn ($q) => $q->where(
                fn ($q2) => $q2->where('nome', 'ilike', "%{$search}%")
                    ->orWhere('sigla', 'ilike', "%{$search}%")
            ))
            ->with(['unidade.instituicao'])
            ->withCount('users')
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Returns an instance of Setor from the given id
     */
    public function get(int|string $id): ?Setor
    {
        return $this->setor->find($id);
    }

    /**
     * Updates the data of an instance of Setor
     */
    public function update(array $data, int|string $id): Setor
    {
        $setor = $this->setor->findOrFail($id);
        $setor->update($data);

        return $setor;
    }

    /**
     * Removes an instance of Setor from the database
     */
    public function destroy(int|string $id): bool
    {
        return (bool) $this->setor->findOrFail($id)->delete();
    }
}
