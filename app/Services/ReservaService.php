<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\SituacaoReserva\ModoArquivoEnum;
use App\Enums\SituacaoReserva\OrdenacaoReservaEnum;
use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Events\ReservaEvent;
use App\Jobs\AvaliarReservaJob;
use App\Jobs\ProcessarCriacaoReserva;
use App\Jobs\UpdateReservaJob;
use App\Jobs\ValidateReservationConflictsJob;
use App\Models\Espaco;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationCanceledNotification;
use App\Repositories\AgendaRepositoryInterface;
use App\Repositories\ReservaRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class ReservaService
{
    public function __construct(
        protected ReservaRepositoryInterface $repoReserva,
        protected AgendaRepositoryInterface $repoAgenda,
        protected EspacoService $espacoService,
        protected ConflictDetectionService $conflictService,
    ) {}

    /**
     * Returns the paginated listing, the detail modal reservation, and week boundaries for the user's reservation page.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getListingForUser(User $user, string $weekRef, array $filters, int $perPage = 10): array
    {
        [$weekStart, $weekEnd, $reference] = $this->resolveWeek($weekRef);

        $filters = $this->normalizarFiltros($filters);

        /** @var LengthAwarePaginator<Reserva> $reservas */
        $reservas = $this->repoReserva->getPaginatedForUser($user->id, $weekStart, $weekEnd, $filters, $perPage)
            ->withQueryString();

        $reservas->getCollection()->transform(function (Reserva $reserva) use ($user) {
            $reserva->can_update = $user->can('update', $reserva);

            return $reserva;
        });

        $reservaToShow = null;
        $reservaIdFiltro = $filters['reserva'] ?? null;
        if (! empty($reservaIdFiltro) && filter_var($reservaIdFiltro, FILTER_VALIDATE_INT) !== false) {
            $reservaToShow = $this->repoReserva->findWithWeekSlots((int) $reservaIdFiltro, $weekStart, $weekEnd);

            if ($reservaToShow) {
                // binding, então a autorização precisa acontecer aqui — onde o
                // objeto é resolvido — e não na borda HTTP.
                Gate::forUser($user)->authorize('view', $reservaToShow);

                $reservaToShow->can_update = $user->can('update', $reservaToShow);
            }
        }

        return [
            'reservas' => $reservas,
            'filters' => $filters,
            'reservaToShow' => $reservaToShow,
            'semana' => ['inicio' => $weekStart, 'fim' => $weekEnd, 'referencia' => $reference],
        ];
    }

    /**
     * Returns the first slot date for a reservation as the navigation anchor,
     * instead of relying solely on data_inicial.
     *
     * Acts as a defensive safeguard against legacy data prior to the fix of #222
     * (where UpdateReservaJob incorrectly rewrote data_inicial with the week's
     * earliest slot when editing single occurrences), or for isolated slots without
     * others in the same week. The bug was fixed in UpdateReservaJob to correctly
     * recalculate periods within the single-occurrence scope.
     */
    public function resolveDataAncora(Reserva $reserva): string
    {
        $firstSlot = $reserva->horarios()->orderBy('data', 'asc')->first();

        return Carbon::parse($firstSlot ? $firstSlot->data : $reserva->data_inicial)->format('Y-m-d');
    }

    /**
     * Returns all data needed to render the reservation edit page (espaco schedule + reservation).
     *
     * @return array<string, mixed>
     */
    public function getEditData(Reserva $reserva, string $weekRef): array
    {
        [$weekStart, $weekEnd, $reference] = $this->resolveWeek($weekRef ?: $this->resolveDataAncora($reserva));

        $reserva->load([
            'user',
            'horarios' => function ($query) use ($weekStart, $weekEnd) {
                $query->whereBetween('data', [$weekStart, $weekEnd])
                    ->orderBy('data')->orderBy('horario_inicio')
                    ->with('agenda');
            },
        ]);

        $espaco = $reserva->horarios->first()?->agenda?->espaco  // @phpstan-ignore nullsafe.neverNull
            ?? Espaco::whereHas('agendas.horarios.reserva', fn ($q) => $q->where('id', $reserva->id))->firstOrFail();

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
            'reserva' => $reserva,
            'isEditMode' => true,
            'semana' => ['inicio' => $weekStart, 'fim' => $weekEnd, 'referencia' => $reference],
        ];
    }

    /**
     * Dispatches the async job to create a reservation.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $user): void
    {
        ProcessarCriacaoReserva::dispatch($data, $user);
    }

    /**
     * Dispatches the async job to update a reservation.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Reserva $reserva, array $data, User $user): void
    {
        UpdateReservaJob::dispatch($reserva, $data, $user);
    }

    /**
     * Normaliza os filtros de listagem antes de chegarem ao repositorio.
     *
     * Faz duas coisas:
     *
     * 1. Descarta `situacao` que nao seja resultado de avaliacao. Sem isso um
     *    valor qualquer na query string vira `where('situacao', <lixo>)` e
     *    devolve lista vazia sem explicar nada a quem esta olhando.
     *
     * 2. Traduz o parametro legado. Antes da #108 o unico jeito de ver
     *    arquivadas era `?situacao=inativa`, oferecido ao gestor no select.
     *    Depois da mudanca esse valor colidiria com o default de `arquivo` e
     *    devolveria lista vazia — justamente o bug que a #108 corrige. A
     *    traducao mantem favoritos, historico e links compartilhados
     *    funcionando, e so age quando `arquivo` nao veio explicito, para nao
     *    sobrescrever uma escolha atual do usuario.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function normalizarFiltros(array $filters): array
    {
        $situacao = $filters['situacao'] ?? null;

        if ($situacao === SituacaoReservaEnum::INATIVA->value && ! isset($filters['arquivo'])) {
            $filters['arquivo'] = ModoArquivoEnum::ARQUIVADAS->value;
        }

        $filters['situacao'] = is_string($situacao)
            && in_array($situacao, SituacaoReservaEnum::valoresDeAvaliacao(), true)
                ? $situacao
                : null;

        $filters['arquivo'] = ModoArquivoEnum::fromFiltro($filters['arquivo'] ?? null)->value;
        $filters['ordenar'] = OrdenacaoReservaEnum::fromFiltro($filters['ordenar'] ?? null)->value;

        return $filters;
    }

    /**
     * Cancels a reservation by marking it and its horarios as inactive and notifying managers.
     */
    public function cancel(Reserva $reserva, User $user): void
    {
        // mas disparava outra rodada de notificacoes para todos os gestores.
        // Enquanto as arquivadas eram invisiveis na listagem esse caminho era
        // inalcancavel pela UI; com o filtro novo, deixa de ser.
        if ($reserva->situacao === SituacaoReservaEnum::INATIVA->value) {
            return;
        }

        $agendaIds = $reserva->horarios->pluck('agenda_id')->unique()->values()->all();

        $horariosParaLibertar = $reserva->horarios()->get(['id', 'data', 'agenda_id']);

        DB::transaction(function () use ($reserva) {
            $reserva->horarios()->update(['situacao' => 'inativa']);
            $reserva->update(['situacao' => 'inativa']);
        });

        $gestores = $this->repoAgenda->getWithUserByIds($agendaIds)
            ->pluck('user')
            ->filter()
            ->unique('id');

        foreach ($gestores as $gestor) {
            try {
                $gestor->notify(new ReservationCanceledNotification($reserva, $user));
            } catch (\Exception $e) {
                Log::warning('Falha ao notificar gestor sobre cancelamento de reserva', [
                    'gestor_id' => $gestor->id,
                    'reserva_id' => $reserva->id,
                    'exception' => $e,
                ]);
            }
        }

        $this->revalidateConflictedReservations($horariosParaLibertar);

        $espacoId = $reserva->horarios()->with('agenda.espaco')->first()?->agenda->espaco_id ?? 0;
        $horariosCount = $reserva->horarios()->count();
        ReservaEvent::dispatch('canceled', $reserva->id, $espacoId, $horariosCount);
    }

    /**
     * Dispara revalidação para reservas que possuem horários nos slots liberados.
     *
     * @param  Collection<int, mixed>  $horariosLiberados
     */
    private function revalidateConflictedReservations(Collection $horariosLiberados): void
    {
        $slotsLiberados = $horariosLiberados
            ->map(fn ($h) => ['data' => $h->data, 'agenda_id' => $h->agenda_id])
            ->unique(fn ($item) => $item['data'].$item['agenda_id']);

        if ($slotsLiberados->isEmpty()) {
            return;
        }

        $reservasParaRevalidar = Reserva::query()
            ->where('validation_status', 'completed')
            ->where('situacao', SituacaoReservaEnum::INDEFERIDA->value)
            ->whereHas('horarios', function ($query) use ($slotsLiberados) {
                $query->where(function ($q) use ($slotsLiberados) {
                    foreach ($slotsLiberados as $slot) {
                        $q->orWhere(function ($orQ) use ($slot) {
                            $orQ->where('data', $slot['data'])
                                ->where('agenda_id', $slot['agenda_id']);
                        });
                    }
                });
            })
            ->select('id')
            ->get();

        foreach ($reservasParaRevalidar as $reserva) {
            Log::info('Disparando revalidação por cancelamento de reserva', [
                'reserva_id' => $reserva->id,
            ]);
            ValidateReservationConflictsJob::dispatch($reserva);
        }
    }

    /**
     * Returns the paginated listing, the detail modal reservation, and week boundaries for the gestor's reservation page.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getGestorListing(User $gestor, string $weekRef, array $filters, int $perPage = 10): array
    {
        [$weekStart, $weekEnd, $reference] = $this->resolveWeek($weekRef);
        $agendaIds = $gestor->agendas()->pluck('id')->all();

        $filters = $this->normalizarFiltros($filters);

        $reservas = $this->repoReserva->getPaginatedForGestor($agendaIds, $filters, $perPage)
            ->withQueryString();

        $reservaToShow = null;
        if ($filters['reserva'] ?? null) {
            $reservaToShow = $this->repoReserva->findForGestorModal(
                (int) $filters['reserva'],
                $agendaIds,
                $weekStart,
                $weekEnd
            );
        }

        return [
            'reservas' => $reservas,
            'filters' => $filters,
            'reservaToShow' => $reservaToShow,
            'semana' => ['inicio' => $weekStart, 'fim' => $weekEnd, 'referencia' => $reference],
        ];
    }

    /**
     * Returns the reservation detail enriched with conflict data for the gestor review page.
     *
     * @return array<string, mixed>
     */
    public function getForGestorReview(Reserva $reserva, User $gestor, string $weekRef): array
    {
        [$weekStart, $weekEnd, $reference] = $this->resolveWeek($weekRef ?: $this->resolveDataAncora($reserva));
        $agendaIds = $gestor->agendas()->pluck('id')->all();

        $conflitosMap = $this->conflictService->findConflictsFor($reserva->id);

        $horariosDaSemana = $reserva->horarios()
            ->whereIn('agenda_id', $agendaIds)
            ->whereBetween('data', [$weekStart, $weekEnd])
            ->with('agenda.espaco')
            ->get();

        foreach ($horariosDaSemana as $horario) {
            $horario->is_conflicted = false;
            if ($conflitosMap->has($horario->id)) {
                $conflito = $conflitosMap->get($horario->id);
                $horario->is_conflicted = true;
                $horario->conflict_details = "Conflito com a reserva '{$conflito->conflito_reserva_titulo}' de {$conflito->conflito_user_name}.";
            }
        }

        $reserva->load(['user']);
        $reserva->setRelation('horarios', $horariosDaSemana);
        $reserva->existing_justification = $reserva->horarios()
            ->whereNotNull('justificativa')
            ->where('justificativa', '!=', '')
            ->value('justificativa');

        return [
            'reserva' => $reserva,
            'semana' => ['referencia' => $reference],
            'todosOsConflitos' => $conflitosMap,
        ];
    }

    /**
     * Dispatches the async job to evaluate a reservation.
     *
     * @param  array<string, mixed>  $data
     */
    public function evaluate(Reserva $reserva, array $data, User $gestor): void
    {
        AvaliarReservaJob::dispatch($reserva, $data, $gestor);
    }

    /**
     * Resolves a week reference string into start date, end date, and reference date strings.
     *
     * @return array{string, string, string}
     */
    private function resolveWeek(string $weekRef): array
    {
        $reference = Carbon::parse($weekRef)->locale('pt_BR');
        $start = $reference->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d');
        $end = $reference->copy()->endOfWeek(Carbon::SUNDAY)->format('Y-m-d');

        return [$start, $end, $reference->format('Y-m-d')];
    }
}
