<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\Agenda\AgendaEnum;
use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\User;
use App\Notifications\UserAssignedAsManagerNotification;
use App\Notifications\UserRemovedAsManagerNotification;
use App\Repositories\AndarRepositoryInterface;
use App\Repositories\EspacoRepositoryInterface;
use App\Repositories\ModuloRepositoryInterface;
use App\Repositories\UnidadeRepositoryInterface;
use App\Repositories\UserRepositoryInterface;
use App\Services\Relatorio\RelatorioService;
use App\Support\SemanaDeReferencia;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class EspacoService
{
    public function __construct(
        protected EspacoRepositoryInterface $repoEspaco,
        protected AndarRepositoryInterface $repoAndar,
        protected ModuloRepositoryInterface $repoModulo,
        protected UnidadeRepositoryInterface $repoUnidade,
        protected UserRepositoryInterface $repoUser,
        protected RelatorioService $relatorioService,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForPublic(int $instituicaoId, array $filters = [], int $perPage = 6): LengthAwarePaginator
    {
        return $this->repoEspaco->getPaginatedForPublic($instituicaoId, $filters, $perPage);
    }

    /**
     * @return array<string, mixed>
     */
    public function getFilterOptions(int $instituicaoId): array
    {
        return [
            'unidades' => $this->repoUnidade->getAllByInstituicao($instituicaoId)->map->only(['id', 'nome', 'sigla']),
            'modulos' => $this->repoModulo->getAllByInstituicao($instituicaoId)->map->only(['id', 'nome', 'unidade_id']),
            'andares' => $this->repoAndar->getAllByInstituicao($instituicaoId)->map->only(['id', 'nome', 'modulo_id']),
            'capacidades' => $this->repoEspaco->getDistinctCapacidadesByInstituicao($instituicaoId),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForAdmin(int $instituicaoId, array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return $this->repoEspaco->getPaginatedForAdmin($instituicaoId, $filters, $perPage);
    }

    /**
     * @return array<string, mixed>
     */
    public function getFormData(int $instituicaoId): array
    {
        return [
            'unidades' => $this->repoUnidade->getAllByInstituicao($instituicaoId)->load(['modulos.andars']),
            'modulos' => $this->repoModulo->getAllByInstituicao($instituicaoId),
            'andares' => $this->repoAndar->getAllByInstituicao($instituicaoId),
        ];
    }

    /**
     * @return Collection<int, User>
     */
    public function getUsersWithAgendas(int $instituicaoId): Collection
    {
        return $this->repoUser->getAllWithAgendasByInstituicao($instituicaoId);
    }

    /**
     * @return array<string, mixed>
     */
    public function getWithWeekSchedule(Espaco $espaco, ?string $weekReference = null): array
    {
        $semana = SemanaDeReferencia::de($weekReference);

        $espaco = $this->repoEspaco->carregarAgendaDaSemana($espaco, $semana);

        return [
            'espaco' => $espaco,
            'semana' => $semana->paraProps(),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  UploadedFile[]  $files
     */
    public function store(array $data, array $files = []): Espaco
    {
        $storedPaths = $this->gravarArquivos($files);

        $mainImagePath = null;
        foreach ($storedPaths as $index => $path) {
            if (isset($data['main_image_index']) && (int) $data['main_image_index'] === $index) {
                $mainImagePath = $path;
            }
        }

        if ($mainImagePath === null && ! empty($storedPaths)) {
            $mainImagePath = $storedPaths[0];
        }

        try {
            $espaco = DB::transaction(function () use ($data, $storedPaths, $mainImagePath) {
                $espaco = $this->repoEspaco->store([
                    'nome' => $data['nome'],
                    'capacidade_pessoas' => $data['capacidade_pessoas'],
                    'descricao' => $data['descricao'],
                    'andar_id' => $data['andar_id'],
                    'imagens' => $storedPaths,
                    'main_image_index' => $mainImagePath,
                ]);

                $espaco->agendas()->createMany([
                    ['turno' => AgendaEnum::MANHA->value, 'user_id' => null],
                    ['turno' => AgendaEnum::TARDE->value, 'user_id' => null],
                    ['turno' => AgendaEnum::NOITE->value, 'user_id' => null],
                ]);

                return $espaco;
            });
        } catch (Throwable $e) {
            $this->removerArquivos($storedPaths);

            throw $e;
        }

        $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::INVENTARIO_ESPACOS);

        return $espaco;
    }

    /**
     * Arquivos antigos são apagados só depois do commit; os novos são removidos se a transação falhar.
     *
     * @param  array<string, mixed>  $data
     * @param  UploadedFile[]  $newFiles
     * @param  string[]  $pathsToDelete
     */
    public function update(Espaco $espaco, array $data, array $newFiles = [], array $pathsToDelete = []): Espaco
    {
        $newPaths = $this->gravarArquivos($newFiles);

        $imagensDoEspaco = (array) ($espaco->imagens ?? []);
        $pathsParaRemover = array_values(array_intersect($pathsToDelete, $imagensDoEspaco));
        $pathsForaDoEspaco = array_values(array_diff($pathsToDelete, $imagensDoEspaco));

        if ($pathsForaDoEspaco !== []) {
            Log::warning('Caminhos de imagem fora do espaço ignorados na atualização', [
                'espaco_id' => $espaco->id,
                'caminhos' => $pathsForaDoEspaco,
            ]);
        }

        try {
            $updatedEspaco = DB::transaction(function () use ($espaco, $data, $newPaths, $imagensDoEspaco, $pathsParaRemover) {
                $currentPaths = array_values(array_diff($imagensDoEspaco, $pathsParaRemover));
                $allPaths = array_values(array_merge($currentPaths, $newPaths));

                $mainImagePath = null;
                if (isset($data['main_image_index']) && isset($allPaths[$data['main_image_index']])) {
                    $mainImagePath = $allPaths[$data['main_image_index']];
                } elseif (! empty($allPaths)) {
                    $mainImagePath = $allPaths[0];
                }

                return $this->repoEspaco->update([
                    'nome' => $data['nome'],
                    'capacidade_pessoas' => $data['capacidade_pessoas'],
                    'descricao' => $data['descricao'],
                    'andar_id' => $data['andar_id'],
                    'imagens' => $allPaths,
                    'main_image_index' => $mainImagePath,
                ], $espaco->id);
            });
        } catch (Throwable $e) {
            $this->removerArquivos($newPaths);

            throw $e;
        }

        $this->removerArquivos($pathsParaRemover);

        $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::INVENTARIO_ESPACOS);

        return $updatedEspaco;
    }

    /**
     * Só notifica quem passou a ocupar um turno; quem já ocupava não recebe de novo.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateGestores(Espaco $espaco, array $data): void
    {
        $gestoresPorTurno = $data['gestores'];

        $aposCommit = DB::transaction(function () use ($espaco, $gestoresPorTurno) {
            $envios = [];

            foreach ($gestoresPorTurno as $turno => $userId) {
                $turnoEnum = is_string($turno) ? AgendaEnum::tryFrom($turno) : null;

                if ($turnoEnum === null) {
                    continue;
                }

                $agenda = $espaco->agendas()->where('turno', $turnoEnum->value)->first();

                if (! $agenda) {
                    continue;
                }

                $oldUserId = $agenda->user_id;

                if ($oldUserId == $userId) {
                    continue;
                }

                $agenda->update(['user_id' => $userId]);

                if ($userId) {
                    $newUser = $this->repoUser->get($userId);
                    if ($newUser) {
                        $newUser->assignRole('gestor');
                        $envios[] = fn () => $this->notificarComIsolamento(
                            $newUser,
                            new UserAssignedAsManagerNotification($newUser, $espaco, $turnoEnum),
                            'Falha ao notificar novo gestor do espaco',
                            ['user_id' => $newUser->id, 'espaco_id' => $espaco->id, 'turno' => $turnoEnum->value],
                        );
                    }
                }

                if ($oldUserId) {
                    $oldUser = $this->repoUser->get($oldUserId);
                    if ($oldUser && ! Agenda::where('user_id', $oldUserId)->exists()) {
                        $oldUser->removeRole('gestor');
                        $envios[] = fn () => $this->notificarComIsolamento(
                            $oldUser,
                            new UserRemovedAsManagerNotification($oldUser, $espaco->nome, $turnoEnum->value),
                            'Falha ao notificar remocao de gestor do espaco',
                            ['user_id' => $oldUser->id, 'espaco_id' => $espaco->id, 'turno' => $turnoEnum->value],
                        );
                    }
                }
            }

            return $envios;
        });

        foreach ($aposCommit as $envio) {
            $envio();
        }

        $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::INVENTARIO_ESPACOS);
    }

    public function delete(Espaco $espaco): bool
    {
        $destroyed = $this->repoEspaco->destroy($espaco->id);

        if ($destroyed) {
            $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::INVENTARIO_ESPACOS);
        }

        return $destroyed;
    }

    public function getFavoritedByUser(User $user, int $perPage = 10): LengthAwarePaginator
    {
        return $user->favoritos()->with([
            'andar:id,nome,modulo_id',
            'andar.modulo:id,nome,unidade_id',
            'andar.modulo.unidade:id,sigla',
        ])->paginate($perPage);
    }

    public function addFavorite(User $user, Espaco $espaco): void
    {
        $user->favoritos()->attach($espaco->id);
        Espaco::forgetFavoritosCache($user->id);
    }

    public function removeFavorite(User $user, Espaco $espaco): void
    {
        $user->favoritos()->detach($espaco->id);
        Espaco::forgetFavoritosCache($user->id);
    }

    public function hasManager(Espaco $espaco): bool
    {
        return $espaco->agendas()->whereNotNull('user_id')->exists();
    }

    /**
     * @param  UploadedFile[]  $files
     * @return string[]
     */
    private function gravarArquivos(array $files): array
    {
        $caminhos = [];

        try {
            foreach ($files as $file) {
                $caminho = $file->store('espacos_images', 'public');

                if ($caminho === false) {
                    throw new RuntimeException('Failed to store uploaded space image.');
                }

                $caminhos[] = $caminho;
            }
        } catch (Throwable $e) {
            $this->removerArquivos($caminhos);

            throw $e;
        }

        return $caminhos;
    }

    /**
     * @param  string[]  $caminhos
     */
    private function removerArquivos(array $caminhos): void
    {
        if ($caminhos !== []) {
            Storage::disk('public')->delete($caminhos);
        }
    }

    /**
     * @param  array<string, int|string|null>  $contexto
     */
    private function notificarComIsolamento(User $destinatario, Notification $notificacao, string $falha, array $contexto): void
    {
        try {
            $destinatario->notify($notificacao);
        } catch (\Exception $e) {
            Log::warning($falha, $contexto + ['exception' => $e]);
        }
    }
}
