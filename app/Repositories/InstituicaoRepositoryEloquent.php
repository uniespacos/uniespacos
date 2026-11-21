<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Instituicao;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends BaseRepositoryEloquent<Instituicao>
 */
class InstituicaoRepositoryEloquent extends BaseRepositoryEloquent implements InstituicaoRepositoryInterface
{
    public function __construct(Instituicao $instituicao)
    {
        parent::__construct($instituicao);
    }

    /**
     * Returns a paginated list of Instituicao ordered by latest
     */
    public function getPaginated(int $perPage = 10, ?string $search = null): LengthAwarePaginator
    {
        return $this->model
            ->when($search, fn ($q) => $q->where(
                fn ($q2) => $q2->where('nome', 'ilike', "%{$search}%")
                    ->orWhere('sigla', 'ilike', "%{$search}%")
            ))
            ->latest()
            ->paginate($perPage);
    }

    /**
     * @return Collection<int, Instituicao>
     */
    public function getArvoreParaPermissoes(): Collection
    {
        return $this->model->newQuery()
            ->select(['id', 'nome', 'sigla'])
            ->with([
                'unidades:id,nome,instituicao_id',
                'unidades.modulos:id,nome,unidade_id',
                'unidades.modulos.andars:id,nome,modulo_id',
                'unidades.modulos.andars.espacos:id,nome,capacidade_pessoas,andar_id',
                'unidades.modulos.andars.espacos.agendas:id,turno,espaco_id',
            ])
            ->get();
    }
}
