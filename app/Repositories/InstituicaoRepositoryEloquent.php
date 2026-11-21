<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Instituicao;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

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
}
