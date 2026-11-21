<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Unidade;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends CrudRepositoryInterface<Unidade>
 */
interface UnidadeRepositoryInterface extends CrudRepositoryInterface
{
    public function __construct(Unidade $unidade);

    /**
     * Returns all Unidade records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Unidade>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection;

    /**
     * Returns a paginated list of Unidade belonging to the given Instituicao
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null): LengthAwarePaginator;
}
