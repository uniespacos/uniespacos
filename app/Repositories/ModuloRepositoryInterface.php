<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Modulo;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends CrudRepositoryInterface<Modulo>
 */
interface ModuloRepositoryInterface extends CrudRepositoryInterface
{
    public function __construct(Modulo $modulo);

    /**
     * Returns a paginated list of Modulo belonging to the given Instituicao
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null, ?string $unidadeNome = null): LengthAwarePaginator;

    /**
     * Returns all Modulo records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Modulo>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection;
}
