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
     * @param  array<int>  $ids
     * @return Collection<int, Agenda>
     */
    public function getWithUserByIds(array $ids): Collection;

    /**
     * @return Collection<int, Agenda>
     */
    public function getComEspacoDoUsuario(int $userId): Collection;

    /**
     * @return array<mixed>
     */
    public function idsDoUsuario(int $userId): array;

    public function desvincularDoUsuario(int $userId): void;

    /**
     * @param  array<mixed>  $ids
     */
    public function desvincularIds(array $ids): void;

    /**
     * @param  array<mixed>  $ids
     */
    public function vincularAoUsuario(array $ids, int $userId): void;
}
