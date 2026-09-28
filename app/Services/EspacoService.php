<?php

declare(strict_types=1);

namespace App\Services;

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
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class EspacoService
{
    protected RelatorioService $relatorioService;

    public function __construct(
        protected EspacoRepositoryInterface $repoEspaco,
        protected AndarRepositoryInterface $repoAndar,
        protected ModuloRepositoryInterface $repoModulo,
        protected UnidadeRepositoryInterface $repoUnidade,
        protected UserRepositoryInterface $repoUser,
        ?RelatorioService $relatorioService = null,
    ) {
        $this->relatorioService = $relatorioService ?? app(RelatorioService::class);
    }

    /**
     * Returns a paginated list of spaces for the public listing with optional filters.
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForPublic(int $instituicaoId, array $filters = [], int $perPage = 6): LengthAwarePaginator
    {
        return $this->repoEspaco->getPaginatedForPublic($instituicaoId, $filters, $perPage);
    }

    /**
     * Returns all data needed to populate the public listing filters.
     *
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
     * Returns a paginated list of spaces for the admin/institucional listing with optional filters.
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForAdmin(int $instituicaoId, array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return $this->repoEspaco->getPaginatedForAdmin($instituicaoId, $filters, $perPage);
    }

    /**
     * Returns all data needed to populate create/edit forms (units, modules, floors).
     *
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
     * Returns users for the admin listing, including their agendas.
     *
     * @return Collection<int, User>
     */
    public function getUsersWithAgendas(int $instituicaoId): Collection
    {
        return $this->repoUser->getAllWithAgendasByInstituicao($instituicaoId);
    }

    /**
     * Loads an Espaco with its week-filtered schedule for the public show page.
     *
     * @return array<string, mixed>
     */
    public function getWithWeekSchedule(Espaco $espaco, string $weekReference = 'today'): array
    {
        $reference = Carbon::parse($weekReference)->locale('pt_BR');
        $weekStart = $reference->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d');
        $weekEnd = $reference->copy()->endOfWeek(Carbon::SUNDAY)->format('Y-m-d');

        $espaco->load([
            'andar.modulo.unidade.instituicao',
            'agendas' => function ($query) use ($weekStart, $weekEnd) {
                $query->with([
                    'user.setor',
                    'horarios' => function ($q) use ($weekStart, $weekEnd) {
                        $q->where('situacao', 'deferida')
                            ->whereBetween('data', [$weekStart, $weekEnd])
                            ->with(['reserva.user', 'avaliador']);
                    },
                ]);
            },
        ]);

        return [
            'espaco' => $espaco,
            'semana' => [
                'inicio' => $weekStart,
                'fim' => $weekEnd,
                'referencia' => $reference->format('Y-m-d'),
            ],
        ];
    }

    /**
     * Loads an Espaco with its agenda managers and reserved slots for the detail page.
     * Throws an exception if the space has no assigned managers.
     *
     * @return array<string, mixed>
     *
     * @throws \Exception
     */
    public function getWithAgendaData(Espaco $espaco): array
    {
        $espaco->load([
            'andar.modulo',
            'agendas' => function ($query) {
                $query->with([
                    'user.setor',
                    'horarios' => function ($q) {
                        $q->where('situacao', 'deferida')->with(['reserva.user']);
                    },
                ]);
            },
        ]);

        $gestoresEspaco = [];
        $horariosReservados = [];

        foreach ($espaco->agendas as $agenda) {
            $horariosReservados[$agenda->turno] = [];

            if ($agenda->user_id !== null && $agenda->user !== null) {
                $gestoresEspaco[$agenda->turno] = [
                    'nome' => $agenda->user->name,
                    'email' => $agenda->user->email,
                    'setor' => $agenda->user->setor?->nome,
                    'agenda_id' => $agenda->id,
                ];
            }

            foreach ($agenda->horarios as $horario) {
                if ($horario->reserva !== null) {
                    $horariosReservados[$agenda->turno][] = [
                        'horario' => $horario,
                        'autor' => $horario->reserva->user->name,
                    ];
                }
            }
        }

        if (empty($gestoresEspaco)) {
            throw new \Exception('Space has no assigned managers.');
        }

        return [
            'espaco' => $espaco,
            'agendas' => $espaco->agendas,
            'andar' => $espaco->andar,
            'modulo' => $espaco->andar->modulo,
            'gestores_espaco' => $gestoresEspaco,
            'horarios_reservados' => $horariosReservados,
        ];
    }

    /**
     * Creates a new space with uploaded images and initializes its three shift agendas.
     *
     * @param  array<string, mixed>  $data
     * @param  UploadedFile[]  $files
     */
    public function store(array $data, array $files = []): Espaco
    {
        $espaco = DB::transaction(function () use ($data, $files) {
            $storedPaths = [];
            $mainImagePath = null;

            foreach ($files as $index => $file) {
                $path = $file->store('espacos_images', 'public');
                $storedPaths[] = $path;

                if (isset($data['main_image_index']) && (int) $data['main_image_index'] === $index) {
                    $mainImagePath = $path;
                }
            }

            if ($mainImagePath === null && ! empty($storedPaths)) {
                $mainImagePath = $storedPaths[0];
            }

            $espaco = $this->repoEspaco->store([
                'nome' => $data['nome'],
                'capacidade_pessoas' => $data['capacidade_pessoas'],
                'descricao' => $data['descricao'],
                'andar_id' => $data['andar_id'],
                'imagens' => $storedPaths,
                'main_image_index' => $mainImagePath,
            ]);

            $espaco->agendas()->createMany([
                ['turno' => 'manha', 'user_id' => null],
                ['turno' => 'tarde', 'user_id' => null],
                ['turno' => 'noite', 'user_id' => null],
            ]);

            return $espaco;
        });

        $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::INVENTARIO_ESPACOS);

        return $espaco;
    }

    /**
     * Updates a space, managing image additions and deletions.
     * Notifies existing agenda managers after the update.
     *
     * @param  array<string, mixed>  $data
     * @param  UploadedFile[]  $newFiles
     * @param  string[]  $pathsToDelete
     */
    public function update(Espaco $espaco, array $data, array $newFiles = [], array $pathsToDelete = []): Espaco
    {
        $updatedEspaco = DB::transaction(function () use ($espaco, $data, $newFiles, $pathsToDelete) {
            $currentPaths = $espaco->imagens ?? [];

            if (! empty($pathsToDelete)) {
                Storage::disk('public')->delete($pathsToDelete);
                $currentPaths = array_values(array_diff($currentPaths, $pathsToDelete));
            }

            $newPaths = [];
            foreach ($newFiles as $file) {
                $newPaths[] = $file->store('espacos_images', 'public');
            }

            $allPaths = array_values(array_merge($currentPaths, $newPaths));

            $mainImagePath = null;
            if (isset($data['main_image_index']) && isset($allPaths[$data['main_image_index']])) {
                $mainImagePath = $allPaths[$data['main_image_index']];
            } elseif (! empty($allPaths)) {
                $mainImagePath = $allPaths[0];
            }

            $espaco = $this->repoEspaco->update([
                'nome' => $data['nome'],
                'capacidade_pessoas' => $data['capacidade_pessoas'],
                'descricao' => $data['descricao'],
                'andar_id' => $data['andar_id'],
                'imagens' => $allPaths,
                'main_image_index' => $mainImagePath,
            ], $espaco->id);

            foreach ($espaco->agendas as $agenda) {
                if ($agenda->user) {
                    try {
                        $agenda->user->notify(new UserAssignedAsManagerNotification(
                            $agenda->user,
                            $espaco->nome,
                            $agenda->turno
                        ));
                    } catch (\Exception $e) {
                        Log::warning('Falha ao notificar gestor sobre atualizacao do espaco', [
                            'user_id' => $agenda->user->id,
                            'espaco_id' => $espaco->id,
                            'turno' => $agenda->turno,
                            'exception' => $e,
                        ]);
                    }
                }
            }

            return $espaco;
        });

        $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::INVENTARIO_ESPACOS);

        return $updatedEspaco;
    }

    /**
     * Updates the managers of each shift agenda for the given space.
     * Assigns/unassigns users per shift and adjusts their permission type accordingly.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateGestores(Espaco $espaco, array $data): void
    {
        $gestoresPorTurno = $data['gestores'];

        DB::transaction(function () use ($espaco, $gestoresPorTurno) {
            foreach ($gestoresPorTurno as $turno => $userId) {
                $agenda = $espaco->agendas()->where('turno', $turno)->first();

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
                    if ($newUser && ! $newUser->hasPermissionTo('reservas.avaliar')) {
                        $newUser->assignRole('gestor');
                        try {
                            $newUser->notify(new UserAssignedAsManagerNotification($newUser, $espaco->nome, $turno));
                        } catch (\Exception $e) {
                            Log::warning('Falha ao notificar novo gestor do espaco', [
                                'user_id' => $newUser->id,
                                'espaco_id' => $espaco->id,
                                'turno' => $turno,
                                'exception' => $e,
                            ]);
                        }
                    }
                }

                if ($oldUserId) {
                    $oldUser = $this->repoUser->get($oldUserId);
                    if ($oldUser && ! Agenda::where('user_id', $oldUserId)->exists()) {
                        $oldUser->removeRole('gestor');
                        try {
                            $oldUser->notify(new UserRemovedAsManagerNotification($oldUser, $espaco->nome, $turno));
                        } catch (\Exception $e) {
                            Log::warning('Falha ao notificar remocao de gestor do espaco', [
                                'user_id' => $oldUser->id,
                                'espaco_id' => $espaco->id,
                                'turno' => $turno,
                                'exception' => $e,
                            ]);
                        }
                    }
                }
            }
        });

        $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::INVENTARIO_ESPACOS);
    }

    /**
     * Deletes the given space from the database.
     */
    public function delete(Espaco $espaco): bool
    {
        $destroyed = $this->repoEspaco->destroy($espaco->id);

        if ($destroyed) {
            $this->relatorioService->invalidarCacheDoTipo(TipoRelatorioEnum::INVENTARIO_ESPACOS);
        }

        return $destroyed;
    }

    /**
     * Returns the user's favorited spaces paginated.
     */
    public function getFavoritedByUser(User $user, int $perPage = 10): LengthAwarePaginator
    {
        return $user->favoritos()->with([
            'andar:id,nome,modulo_id',
            'andar.modulo:id,nome,unidade_id',
            'andar.modulo.unidade:id,sigla',
        ])->paginate($perPage);
    }

    /**
     * Adds a space to the user's favorites.
     */
    public function addFavorite(User $user, Espaco $espaco): void
    {
        $user->favoritos()->attach($espaco->id);
        Espaco::forgetFavoritosCache($user->id);
    }

    /**
     * Removes a space from the user's favorites.
     */
    public function removeFavorite(User $user, Espaco $espaco): void
    {
        $user->favoritos()->detach($espaco->id);
        Espaco::forgetFavoritosCache($user->id);
    }

    /**
     * Checks if the space has at least one manager assigned.
     */
    public function hasManager(Espaco $espaco): bool
    {
        return $espaco->agendas()->whereNotNull('user_id')->exists();
    }
}
