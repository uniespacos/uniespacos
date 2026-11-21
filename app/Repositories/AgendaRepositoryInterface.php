<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Agenda;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends CrudRepositoryInterface<Agenda>
 */
interface AgendaRepositoryInterface extends CrudRepositoryInterface
{
    public function __construct(Agenda $agenda);

    /**
     * Returns Agenda records for the given ids with their user eager-loaded
     *
     * @param  array<int>  $ids
     * @return Collection<int, Agenda>
     */
    public function getWithUserByIds(array $ids): Collection;
}
