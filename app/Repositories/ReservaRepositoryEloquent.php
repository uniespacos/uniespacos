<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Horario;
use App\Models\Reserva;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends BaseRepositoryEloquent<Reserva>
 */
class ReservaRepositoryEloquent extends BaseRepositoryEloquent implements ReservaRepositoryInterface
{
    public function __construct(Reserva $reserva)
    {
        parent::__construct($reserva);
    }

    private function dataFiltro(mixed $valor): string
    {
        return is_string($valor) ? $valor : '';
    }

    /**
     * Returns a paginated list of Reserva for a specific user, with optional filters
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForUser(int $userId, array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return $this->model->newQuery()
            ->where('user_id', $userId)
            ->arquivo($filters['arquivo'] ?? null)
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($q2) => $q2->where('titulo', 'like', '%'.$s.'%')->orWhere('descricao', 'like', '%'.$s.'%')))
            ->when($filters['situacao'] ?? null, fn ($q, $s) => $q->where('situacao', $s))
            ->when(
                isset($filters['data_inicio'], $filters['data_fim']) && $filters['data_inicio'] && $filters['data_fim'],
                fn ($q) => $q->whereDate('data_inicial', '<=', $this->dataFiltro($filters['data_fim']))
                    ->whereDate('data_final', '>=', $this->dataFiltro($filters['data_inicio']))
            )
            ->with([
                'horarios' => function ($query) {
                    $query->orderBy('data')->orderBy('horario_inicio')
                        ->with(['agenda.espaco.andar.modulo', 'agenda.user:id,name', 'avaliador:id,name']);
                },
                'user:id,name',
            ])
            ->withExists([
                'horarios as possui_horario_avaliado' => fn ($q) => $q->whereIn('situacao', [
                    SituacaoReservaEnum::DEFERIDA->value,
                    SituacaoReservaEnum::INDEFERIDA->value,
                ]),
            ])
            ->ordenar($filters['ordenar'] ?? null)
            ->paginate($perPage);
    }

    /**
     * Returns a Reserva with its horarios for the detail modal
     */
    public function findWithWeekSlots(int $reservaId, string $weekStart, string $weekEnd): ?Reserva
    {
        return $this->model->with([
            'user',
            'horarios' => function ($query) {
                $query->orderBy('data')->orderBy('horario_inicio')
                    ->with(['agenda.espaco.andar.modulo.unidade', 'agenda.user:id,name,email,setor_id', 'avaliador:id,name']);
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
        return $this->model->newQuery()
            ->whereHas('horarios', function ($q) use ($agendaIds) {
                $q->whereIn('agenda_id', $agendaIds);
            })
            ->when(
                isset($filters['data_inicio'], $filters['data_fim']) && $filters['data_inicio'] && $filters['data_fim'],
                fn ($q) => $q->whereDate('data_inicial', '<=', $this->dataFiltro($filters['data_fim']))
                    ->whereDate('data_final', '>=', $this->dataFiltro($filters['data_inicio']))
            )
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
            ->ordenar($filters['ordenar'] ?? null)
            ->paginate($perPage);
    }

    /**
     * Returns a Reserva for a gestor with its horarios for the detail modal
     */
    public function findForGestorModal(int $reservaId, array $agendaIds, string $weekStart, string $weekEnd): ?Reserva
    {
        return $this->model
            ->whereHas('horarios', fn ($q) => $q->whereIn('agenda_id', $agendaIds))
            ->with([
                'user',
                'horarios' => function ($query) use ($agendaIds) {
                    $query->whereIn('agenda_id', $agendaIds)
                        ->orderBy('data')->orderBy('horario_inicio')
                        ->with([
                            'agenda' => function ($q) {
                                $q->select('id', 'espaco_id', 'turno', 'user_id')
                                    ->with(['espaco.andar.modulo', 'user:id,name']);
                            },
                            'avaliador:id,name',
                        ]);
                },
            ])->find($reservaId);
    }

    public function inserirHorarios(array $linhas): void
    {
        Horario::insert($linhas);
    }

    /**
     * @return Collection<int, Reserva>
     */
    public function getPendentesDoSolicitante(int $userId): Collection
    {
        return $this->model->newQuery()
            ->where('user_id', $userId)
            ->where('situacao', SituacaoReservaEnum::EM_ANALISE->value)
            ->lockForUpdate()
            ->get();
    }
}
