<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Agenda;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends BaseRepositoryEloquent<Agenda>
 */
class AgendaRepositoryEloquent extends BaseRepositoryEloquent implements AgendaRepositoryInterface
{
    public function __construct(Agenda $agenda)
    {
        parent::__construct($agenda);
    }

    /**
     * Returns Agenda records for the given ids with their user eager-loaded
     *
     * @param  array<int>  $ids
     * @return Collection<int, Agenda>
     */
    public function getWithUserByIds(array $ids): Collection
    {
        return $this->model->whereIn('id', $ids)->with('user')->get();
    }
}
