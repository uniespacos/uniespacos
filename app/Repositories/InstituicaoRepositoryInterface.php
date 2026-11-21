<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Instituicao;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * @extends CrudRepositoryInterface<Instituicao>
 */
interface InstituicaoRepositoryInterface extends CrudRepositoryInterface
{
    public function __construct(Instituicao $instituicao);

    /**
     * Returns a paginated list of Instituicao ordered by latest
     */
    public function getPaginated(int $perPage = 10, ?string $search = null): LengthAwarePaginator;
}
