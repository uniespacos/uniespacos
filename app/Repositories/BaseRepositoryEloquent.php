<?php

declare(strict_types=1);

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * @template TModel of Model
 *
 * @implements CrudRepositoryInterface<TModel>
 */
abstract class BaseRepositoryEloquent implements CrudRepositoryInterface
{
    /**
     * @var TModel
     */
    protected Model $model;

    /**
     * @param  TModel  $model
     */
    public function __construct(Model $model)
    {
        $this->model = $model;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return TModel
     */
    public function store(array $data)
    {
        return $this->model->newQuery()->create($data);
    }

    /**
     * @param  array<string>  $columns
     * @param  array<int|string, mixed>|null  $filters
     * @return Collection<int, TModel>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection
    {
        $query = $this->model->newQuery();

        if ($filters) {
            $query->where($filters);
        }

        return $query->get($columns);
    }

    /**
     * @return TModel|null
     */
    public function get(int|string $id)
    {
        return $this->model->newQuery()->find($id);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return TModel
     */
    public function update(array $data, int|string $id)
    {
        $model = $this->model->newQuery()->findOrFail($id);
        $model->update($data);

        return $model;
    }

    public function destroy(int|string $id): bool
    {
        return (bool) $this->model->newQuery()->findOrFail($id)->delete();
    }
}
