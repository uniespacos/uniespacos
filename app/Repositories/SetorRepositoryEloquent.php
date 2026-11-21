<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Setor;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends BaseRepositoryEloquent<Setor>
 */
class SetorRepositoryEloquent extends BaseRepositoryEloquent implements SetorRepositoryInterface
{
    public function __construct(Setor $setor)
    {
        parent::__construct($setor);
    }

    /**
     * Returns all Setor records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, Setor>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection
    {
        return $this->model
            ->whereHas('unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->with(['unidade.instituicao'])
            ->withCount('users')
            ->get();
    }

    /**
     * Returns a paginated list of Setor belonging to the given Instituicao
     *
     * @return LengthAwarePaginator<int, Setor>
     */
    public function getPaginatedByInstituicao(int $instituicaoId, int $perPage = 10, ?string $search = null, ?int $unidadeId = null): LengthAwarePaginator
    {
        return $this->model
            ->whereHas('unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->when($unidadeId, fn ($q) => $q->where('unidade_id', $unidadeId))
            ->when($search, fn ($q) => $q->where(
                fn ($q2) => $q2->where('nome', 'ilike', "%{$search}%")
                    ->orWhere('sigla', 'ilike', "%{$search}%")
            ))
            ->with(['unidade.instituicao'])
            ->withCount('users')
            ->latest()
            ->paginate($perPage);
    }

    /**
     * @return Collection<int, Setor>
     */
    public function getListaParaFiltro(): Collection
    {
        return $this->model->newQuery()->select(['id', 'sigla'])->orderBy('sigla')->get();
    }
}
