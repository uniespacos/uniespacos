<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Instituicao;
use App\Repositories\InstituicaoRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class InstituicaoService
{
    public function __construct(
        protected InstituicaoRepositoryInterface $repoInstituicao,
    ) {}

    /**
     * Returns a paginated list of all institutions.
     */
    public function paginate(int $perPage = 10, ?string $search = null): LengthAwarePaginator
    {
        return $this->repoInstituicao->getPaginated($perPage, $search);
    }

    /**
     * Returns every institution with its sectors and their units loaded.
     *
     * @return Collection<int, Instituicao>
     */
    public function listarComSetores(): Collection
    {
        return $this->repoInstituicao->getList()->load(['setors.unidade']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function store(array $data): Instituicao
    {
        return $this->repoInstituicao->store($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Instituicao $instituicao, array $data): Instituicao
    {
        return $this->repoInstituicao->update($data, $instituicao->id);
    }

    public function delete(Instituicao $instituicao): bool
    {
        return $this->repoInstituicao->destroy($instituicao->id);
    }
}
