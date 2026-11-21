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
     * @param  array<int>  $ids
     * @return Collection<int, Agenda>
     */
    public function getWithUserByIds(array $ids): Collection
    {
        return $this->model->whereIn('id', $ids)->with('user')->get();
    }

    /**
     * @return Collection<int, Agenda>
     */
    public function getComEspacoDoUsuario(int $userId): Collection
    {
        return $this->model->newQuery()
            ->where('user_id', $userId)
            ->with(['espaco.andar.modulo.unidade'])
            ->get();
    }

    /**
     * @return array<mixed>
     */
    public function idsDoUsuario(int $userId): array
    {
        return $this->model->newQuery()->where('user_id', $userId)->pluck('id')->all();
    }

    public function desvincularDoUsuario(int $userId): void
    {
        $this->model->newQuery()->where('user_id', $userId)->update(['user_id' => null]);
    }

    /**
     * @param  array<mixed>  $ids
     */
    public function desvincularIds(array $ids): void
    {
        $this->model->newQuery()->whereIn('id', $ids)->update(['user_id' => null]);
    }

    /**
     * @param  array<mixed>  $ids
     */
    public function vincularAoUsuario(array $ids, int $userId): void
    {
        $this->model->newQuery()->whereIn('id', $ids)->update(['user_id' => $userId]);
    }
}
