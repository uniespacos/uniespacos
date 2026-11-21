<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Unidade;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends BaseRepositoryEloquent<Unidade>
 */
class UnidadeRepositoryEloquent extends BaseRepositoryEloquent implements UnidadeRepositoryInterface
{
    public function __construct(Unidade $unidade)
    {
        parent::__construct($unidade);
    }

    /**
     * Returns all Unidade records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Unidade>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection
    {
        return $this->model
            ->where('instituicao_id', $instituicaoId)
            ->with(['instituicao'])
            ->get();
    }

    /**
     * Returns a paginated list of Unidade belonging to the given Instituicao
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null): LengthAwarePaginator
    {
        return $this->model
            ->where('instituicao_id', $instituicaoId)
            ->when($search, fn ($q) => $q->where(
                fn ($q2) => $q2->where('nome', 'ilike', "%{$search}%")
                    ->orWhere('sigla', 'ilike', "%{$search}%")
            ))
            ->with(['instituicao'])
            ->latest()
            ->paginate($perPage);
    }
}
