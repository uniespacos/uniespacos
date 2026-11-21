<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Setor;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends CrudRepositoryInterface<Setor>
 */
interface SetorRepositoryInterface extends CrudRepositoryInterface
{
    public function __construct(Setor $setor);

    /**
     * Returns all Setor records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Setor>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection;

    /**
     * Returns a paginated list of Setor belonging to the given Instituicao
     *
     * @return LengthAwarePaginator<int, Setor>
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null, ?int $unidadeId = null): LengthAwarePaginator;
}
