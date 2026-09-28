<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Instituicao;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class InstituicaoRepositoryEloquent implements InstituicaoRepositoryInterface
{
    public function __construct(
        protected Instituicao $instituicao,
    ) {}

    /**
     * Stores a new instance of Instituicao in the database
     */
    public function store(array $data): Instituicao
    {
        return $this->instituicao->create($data);
    }

    /**
     * Returns all instances of Instituicao from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Instituicao>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection
    {
        $query = $this->instituicao->newQuery();

        if ($filters) {
            $query->where($filters);
        }

        return $query->get($columns);
    }

    /**
     * Returns a paginated list of Instituicao ordered by latest
     */
    public function getPaginated(int $perPage = 10, ?string $search = null): LengthAwarePaginator
    {
        return $this->instituicao
            ->when($search, fn ($q) => $q->where(
                fn ($q2) => $q2->where('nome', 'ilike', "%{$search}%")
                    ->orWhere('sigla', 'ilike', "%{$search}%")
            ))
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Returns an instance of Instituicao from the given id
     */
    public function get(int|string $id): ?Instituicao
    {
        return $this->instituicao->find($id);
    }

    /**
     * Updates the data of an instance of Instituicao
     */
    public function update(array $data, int|string $id): Instituicao
    {
        $instituicao = $this->instituicao->findOrFail($id);
        $instituicao->update($data);

        return $instituicao;
    }

    /**
     * Removes an instance of Instituicao from the database
     */
    public function destroy(int|string $id): bool
    {
        return (bool) $this->instituicao->findOrFail($id)->delete();
    }
}
