<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Modulo;
use App\Repositories\ModuloRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ModuloService
{
    public function __construct(
        protected ModuloRepositoryInterface $repoModulo,
    ) {}

    /**
     * Returns a paginated list of modules belonging to the given institution.
     */
    public function paginate(int $instituicaoId, int $perPage = 10, ?string $search = null, ?string $unidadeNome = null): LengthAwarePaginator
    {
        return $this->repoModulo->getPaginatedByInstituicao($instituicaoId, $perPage, $search, $unidadeNome);
    }

    /**
     * Creates a new module along with its floors in a single transaction.
     *
     * @param  array<string, mixed>  $data
     */
    public function store(array $data): Modulo
    {
        return DB::transaction(function () use ($data) {
            $modulo = $this->repoModulo->store([
                'nome' => $data['nome'],
                'unidade_id' => $data['unidade_id'],
            ]);

            foreach ($data['andares'] as $andarData) {
                $modulo->andars()->create([
                    'nome' => $andarData['nome'],
                    'tipo_acesso' => $andarData['tipo_acesso'],
                ]);
            }

            return $modulo;
        });
    }

    /**
     * Updates a module and synchronizes its floors in a single transaction.
     * Throws an exception if a floor to be removed still has spaces assigned.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Modulo $modulo, array $data): Modulo
    {
        return DB::transaction(function () use ($modulo, $data) {
            $this->repoModulo->update([
                'nome' => $data['nome'],
                'unidade_id' => $data['unidade_id'],
            ], $modulo->id);

            $requestedFloorNames = collect($data['andares'])->pluck('nome');

            foreach ($modulo->andars->whereNotIn('nome', $requestedFloorNames) as $andar) {
                if ($andar->espacos()->exists()) {
                    throw new \Exception(
                        "Cannot remove floor '{$andar->nome}' because it already has spaces assigned."
                    );
                }
                $andar->delete();
            }

            foreach ($data['andares'] as $andarData) {
                $modulo->andars()->updateOrCreate(
                    ['nome' => $andarData['nome']],
                    ['tipo_acesso' => $andarData['tipo_acesso']]
                );
            }

            return $modulo->fresh(['andars', 'unidade.instituicao']);
        });
    }

    /**
     * Deletes a module and its floors in a single transaction.
     */
    public function delete(Modulo $modulo): bool
    {
        return DB::transaction(function () use ($modulo) {
            $modulo->andars()->delete();

            return $this->repoModulo->destroy($modulo->id);
        });
    }
}
