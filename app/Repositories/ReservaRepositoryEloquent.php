<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Reserva;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class ReservaRepositoryEloquent implements ReservaRepositoryInterface
{
    public function __construct(
        protected Reserva $reserva,
    ) {}

    public function store(array $data): Reserva
    {
        return $this->reserva->create($data);
    }

    /**
     * Returns all instances of Reserva from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Reserva>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection
    {
        $query = $this->reserva->newQuery();

        if ($filters) {
            $query->where($filters);
        }

        return $query->get($columns);
    }

    /**
     * Returns a paginated list of Reserva for a specific user, filtered by optional criteria
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForUser(int $userId, string $weekStart, string $weekEnd, array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return $this->reserva->newQuery()
            ->where('user_id', $userId)
            ->arquivo($filters['arquivo'] ?? null)
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($q2) => $q2->where('titulo', 'like', '%'.$s.'%')->orWhere('descricao', 'like', '%'.$s.'%')))
            ->when($filters['situacao'] ?? null, fn ($q, $s) => $q->where('situacao', $s))
            ->with([
                'horarios' => function ($query) {
                    $query->orderBy('data')->orderBy('horario_inicio')
                        ->with(['agenda.espaco.andar.modulo']);
                },
                'user:id,name',
            ])
            ->ordenar($filters['ordenar'] ?? null)
            ->paginate($perPage);
    }

    /**
     * Returns a Reserva with its week-filtered horarios for the detail modal
     */
    public function findWithWeekSlots(int $reservaId, string $weekStart, string $weekEnd): ?Reserva
    {
        return $this->reserva->with([
            'user',
            'horarios' => function ($query) use ($weekStart, $weekEnd) {
                $query->whereBetween('data', [$weekStart, $weekEnd])
                    ->orderBy('data')->orderBy('horario_inicio')
                    ->with(['agenda.espaco.andar.modulo.unidade', 'agenda.user', 'avaliador']);
            },
        ])->find($reservaId);
    }

    /**
     * Returns a paginated list of Reserva for a gestor, filtered by optional criteria
     *
     * @param  array<int>  $agendaIds
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForGestor(array $agendaIds, array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return $this->reserva->newQuery()
            ->whereHas('horarios', fn ($q) => $q->whereIn('agenda_id', $agendaIds))
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($q2) => $q2->where('titulo', 'like', "%{$s}%")->orWhere('descricao', 'like', "%{$s}%")))
            ->arquivo($filters['arquivo'] ?? null)
            ->when($filters['situacao'] ?? null, fn ($q, $s) => $q->where('situacao', $s))
            ->with([
                'user:id,name',
                'horarios' => function ($query) use ($agendaIds) {
                    $query->whereIn('agenda_id', $agendaIds)
                        ->orderBy('data')->orderBy('horario_inicio')
                        ->with([
                            'agenda:id,espaco_id,turno',
                            'agenda.espaco:id,nome,andar_id',
                            'agenda.espaco.andar:id,nome,modulo_id',
                            'agenda.espaco.andar.modulo:id,nome,unidade_id',
                        ]);
                },
            ])
            ->withHorariosStats($agendaIds)
            ->ordenar($filters['ordenar'] ?? null)
            ->paginate($perPage);
    }

    /**
     * Returns a Reserva for a gestor with its week-filtered horarios for the detail modal
     */
    public function findForGestorModal(int $reservaId, array $agendaIds, string $weekStart, string $weekEnd): ?Reserva
    {
        return $this->reserva
            ->whereHas('horarios', fn ($q) => $q->whereIn('agenda_id', $agendaIds))
            ->with([
                'user',
                'horarios' => function ($query) use ($agendaIds, $weekStart, $weekEnd) {
                    $query->whereIn('agenda_id', $agendaIds)
                        ->whereBetween('data', [$weekStart, $weekEnd])
                        ->orderBy('data')->orderBy('horario_inicio')
                        ->with([
                            'agenda' => function ($q) {
                                $q->select('id', 'espaco_id', 'turno', 'user_id')
                                    ->with('espaco.andar.modulo');
                            },
                            'avaliador',
                        ]);
                },
            ])->find($reservaId);
    }

    public function get(int|string $id): ?Reserva
    {
        return $this->reserva->find($id);
    }

    public function update(array $data, int|string $id): Reserva
    {
        $reserva = $this->reserva->findOrFail($id);
        $reserva->update($data);

        return $reserva;
    }

    public function destroy(int|string $id): bool
    {
        return (bool) $this->reserva->findOrFail($id)->delete();
    }
}
