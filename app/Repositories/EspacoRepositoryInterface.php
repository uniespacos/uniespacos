<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Espaco;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

interface EspacoRepositoryInterface
{
    public function __construct(Espaco $espaco);

    /**
     * Stores a new instance of Espaco in the database
     */
    public function store(array $data): Espaco;

    /**
     * Returns all instances of Espaco from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Espaco>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection;

    /**
     * Returns a paginated list of Espaco for the public listing, scoped to an institution with optional filters
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForPublic(int $instituicaoId, array $filters = [], int $perPage = 6): LengthAwarePaginator;

    /**
     * Returns a paginated list of Espaco for the admin listing, scoped to an institution with optional filters
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForAdmin(int $instituicaoId, array $filters = [], int $perPage = 10): LengthAwarePaginator;

    /**
     * Returns distinct capacidade_pessoas values for spaces in the given institution
     *
     * @return SupportCollection<int, int>
     */
    public function getDistinctCapacidadesByInstituicao(int $instituicaoId): SupportCollection;

    /**
     * Returns an instance of Espaco from the given id
     */
    public function get(int|string $id): ?Espaco;

    /**
     * Updates the data of an instance of Espaco
     */
    public function update(array $data, int|string $id): Espaco;

    /**
     * Removes an instance of Espaco from the database
     */
    public function destroy(int|string $id): bool;
}
