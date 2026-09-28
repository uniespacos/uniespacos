<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Setor;
use App\Notifications\SectorUpdatedNotification;
use App\Repositories\SetorRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class SetorService
{
    public function __construct(
        protected SetorRepositoryInterface $repoSetor,
    ) {}

    /**
     * @return Collection<int, Setor>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection
    {
        return $this->repoSetor->getAllByInstituicao($instituicaoId);
    }

    /**
     * @return LengthAwarePaginator<int, Setor>
     */
    public function paginate(int $instituicaoId, int $perPage = 10, ?string $search = null, ?int $unidadeId = null): LengthAwarePaginator
    {
        return $this->repoSetor->getPaginatedByInstituicao($instituicaoId, $perPage, $search, $unidadeId);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function store(array $data): Setor
    {
        return $this->repoSetor->store($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Setor $setor, array $data): Setor
    {
        $setor = $this->repoSetor->update($data, $setor->id);
        $setor->load(['users']);

        foreach ($setor->users as $user) {
            try {
                $user->notify(new SectorUpdatedNotification($setor, $user));
            } catch (\Exception $e) {
                Log::warning('Falha ao enviar notificação de setor atualizado', [
                    'setor_id' => $setor->id,
                    'user_id' => $user->id,
                    'exception' => $e,
                ]);
            }
        }

        return $setor;
    }

    public function delete(Setor $setor): bool
    {
        return $this->repoSetor->destroy($setor->id);
    }
}
