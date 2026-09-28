<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Espaco;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

class EspacoRepositoryEloquent implements EspacoRepositoryInterface
{
    public function __construct(
        protected Espaco $espaco,
    ) {}

    /**
     * Stores a new instance of Espaco in the database
     */
    public function store(array $data): Espaco
    {
        return $this->espaco->create($data);
    }

    /**
     * Returns all instances of Espaco from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Espaco>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection
    {
        $query = $this->espaco->newQuery();

        if ($filters) {
            $query->where($filters);
        }

        return $query->get($columns);
    }

    /**
     * Returns a paginated list of Espaco for the public listing, scoped to an institution with optional filters
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForPublic(int $instituicaoId, array $filters = [], int $perPage = 6): LengthAwarePaginator
    {
        $query = $this->espaco->newQuery()
            ->whereHas('andar.modulo.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId));

        return $this->applyFilters($query, $filters)
            ->with([
                'andar:id,nome,modulo_id',
                'andar.modulo:id,nome,unidade_id',
                'andar.modulo.unidade:id,sigla',
            ])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Returns a paginated list of Espaco for the admin listing, scoped to an institution with optional filters
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForAdmin(int $instituicaoId, array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        $query = $this->espaco->newQuery()
            ->whereHas('andar.modulo.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId));

        return $this->applyFilters($query, $filters)
            ->with(['andar.modulo.unidade.instituicao', 'agendas.user'])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Applies the shared search/unidade/modulo/andar/capacidade filters to a Espaco query
     *
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('nome', 'like', '%'.$search.'%')
                        ->orWhereHas('andar', fn ($q) => $q->where('nome', 'like', '%'.$search.'%'))
                        ->orWhereHas('andar.modulo', fn ($q) => $q->where('nome', 'like', '%'.$search.'%'));
                });
            })
            ->when($filters['unidade'] ?? null, fn ($q, $unidade) => $q->whereHas('andar.modulo', fn ($q) => $q->where('unidade_id', $unidade)))
            ->when($filters['modulo'] ?? null, fn ($q, $modulo) => $q->whereHas('andar', fn ($q) => $q->where('modulo_id', $modulo)))
            ->when($filters['andar'] ?? null, fn ($q, $andar) => $q->where('andar_id', $andar))
            ->when($filters['capacidade'] ?? null, fn ($q, $capacidade) => $q->where('capacidade_pessoas', '>=', $capacidade));
    }

    /**
     * Returns distinct capacidade_pessoas values for spaces in the given institution
     *
     * @return SupportCollection<int, int>
     */
    public function getDistinctCapacidadesByInstituicao(int $instituicaoId): SupportCollection
    {
        return $this->espaco->newQuery()
            ->whereHas('andar.modulo.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->select('capacidade_pessoas')
            ->distinct()
            ->orderBy('capacidade_pessoas')
            ->pluck('capacidade_pessoas');
    }

    /**
     * Returns an instance of Espaco from the given id
     */
    public function get(int|string $id): ?Espaco
    {
        return $this->espaco->find($id);
    }

    /**
     * Updates the data of an instance of Espaco
     */
    public function update(array $data, int|string $id): Espaco
    {
        $espaco = $this->espaco->findOrFail($id);
        $espaco->update($data);

        return $espaco;
    }

    /**
     * Removes an instance of Espaco from the database
     */
    public function destroy(int|string $id): bool
    {
        return (bool) $this->espaco->findOrFail($id)->delete();
    }
}
