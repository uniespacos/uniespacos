<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Modulo;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends BaseRepositoryEloquent<Modulo>
 */
class ModuloRepositoryEloquent extends BaseRepositoryEloquent implements ModuloRepositoryInterface
{
    public function __construct(Modulo $modulo)
    {
        parent::__construct($modulo);
    }

    /**
     * Returns a paginated list of Modulo belonging to the given Instituicao
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null, ?string $unidadeNome = null): LengthAwarePaginator
    {
        return $this->model
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
        return $this->model
            ->whereHas('unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->with(['unidade', 'andars'])
            ->get();
    }
}
