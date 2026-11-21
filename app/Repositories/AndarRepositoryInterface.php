<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Andar;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends CrudRepositoryInterface<Andar>
 */
interface AndarRepositoryInterface extends CrudRepositoryInterface
{
    public function __construct(Andar $andar);

    /**
     * @return Collection<int, Andar>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection;
}
