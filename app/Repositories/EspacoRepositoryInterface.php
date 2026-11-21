<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Espaco;
use App\Support\SemanaDeReferencia;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

interface EspacoRepositoryInterface
{
    public function __construct(Espaco $espaco);

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
     * Carrega o espaço com a agenda da semana: horários deferidos entre o início da
     * semana e o horizonte de conflito.
     */
    public function carregarAgendaDaSemana(Espaco $espaco, SemanaDeReferencia $semana, ?string $horizonteFim = null): Espaco;

    public function get(int|string $id): ?Espaco;

    public function update(array $data, int|string $id): Espaco;

    public function destroy(int|string $id): bool;
}
