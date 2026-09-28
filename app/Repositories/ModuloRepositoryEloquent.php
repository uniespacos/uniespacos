<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Modulo;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class ModuloRepositoryEloquent implements ModuloRepositoryInterface
{
    public function __construct(
        protected Modulo $modulo,
    ) {}

    /**
     * Stores a new instance of Modulo in the database
     */
    public function store(array $data): Modulo
    {
        return $this->modulo->create($data);
    }

    /**
     * Returns all instances of Modulo from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Modulo>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection
    {
        $query = $this->modulo->newQuery();

        if ($filters) {
            $query->where($filters);
        }

        return $query->get($columns);
    }

    /**
     * Returns a paginated list of Modulo belonging to the given Instituicao
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null, ?string $unidadeNome = null): LengthAwarePaginator
    {
        return $this->modulo
            ->whereHas('unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->when($search, fn ($q) => $q->where('nome', 'ilike', "%{$search}%"))
            ->when($unidadeNome && $unidadeNome !== 'all', fn ($q) => $q->whereHas('unidade', fn ($q2) => $q2->where('nome', $unidadeNome)))
            ->with(['andars', 'unidade.instituicao'])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Returns all Modulo records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Modulo>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection
    {
        return $this->modulo
            ->whereHas('unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->with(['unidade', 'andars'])
            ->get();
    }

    /**
     * Returns an instance of Modulo from the given id
     */
    public function get(int|string $id): ?Modulo
    {
        return $this->modulo->find($id);
    }

    /**
     * Updates the data of an instance of Modulo
     */
    public function update(array $data, int|string $id): Modulo
    {
        $modulo = $this->modulo->findOrFail($id);
        $modulo->update($data);

        return $modulo;
    }

    /**
     * Removes an instance of Modulo from the database
     */
    public function destroy(int|string $id): bool
    {
        return (bool) $this->modulo->findOrFail($id)->delete();
    }
}
