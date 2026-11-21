<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Andar;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends BaseRepositoryEloquent<Andar>
 */
class AndarRepositoryEloquent extends BaseRepositoryEloquent implements AndarRepositoryInterface
{
    public function __construct(Andar $andar)
    {
        parent::__construct($andar);
    }

    /**
     * @return Collection<int, Andar>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection
    {
        return $this->model
            ->whereHas('modulo.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->with(['modulo', 'espacos'])
            ->get();
    }
}
