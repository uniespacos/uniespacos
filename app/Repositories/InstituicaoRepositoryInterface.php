<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Instituicao;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface InstituicaoRepositoryInterface
{
    public function __construct(Instituicao $instituicao);

    /**
     * Stores a new instance of Instituicao in the database
     */
    public function store(array $data): Instituicao;

    /**
     * Returns all instances of Instituicao from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Instituicao>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection;

    /**
     * Returns a paginated list of Instituicao ordered by latest
     */
    public function getPaginated(int $perPage = 10, ?string $search = null): LengthAwarePaginator;

    /**
     * Returns an instance of Instituicao from the given id
     */
    public function get(int|string $id): ?Instituicao;

    /**
     * Updates the data of an instance of Instituicao
     */
    public function update(array $data, int|string $id): Instituicao;

    /**
     * Removes an instance of Instituicao from the database
     */
    public function destroy(int|string $id): bool;
}
