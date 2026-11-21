<?php

declare(strict_types=1);

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * @template TModel of Model
 */
interface CrudRepositoryInterface
{
    /**
     * @param  array<string, mixed>  $data
     * @return TModel
     */
    public function store(array $data);

    /**
     * @param  array<string>  $columns
     * @param  array<int|string, mixed>|null  $filters
     * @return Collection<int, TModel>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection;

    /**
     * @return TModel|null
     */
    public function get(int|string $id);

    /**
     * @param  array<string, mixed>  $data
     * @return TModel
     */
    public function update(array $data, int|string $id);

    public function destroy(int|string $id): bool;
}
