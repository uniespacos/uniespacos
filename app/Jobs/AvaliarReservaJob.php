<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationEvaluatedNotification;
use App\Services\ConflictDetectionService;
use App\Services\ReservaBroadcaster;
use Carbon\Carbon;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class AvaliarReservaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    protected string $locale = 'pt';

    public function __construct(
        protected Reserva $reserva,
        protected array $validatedData,
        protected User $gestor,
    ) {
        $this->locale = app()->getLocale();
    }

    /**
     * Execute the job — evaluates each horario based on the gestor's decisions and conflict state.
     */
    public function handle(ConflictDetectionService $conflictService, ReservaBroadcaster $broadcaster = new ReservaBroadcaster): void
    {
        Log::info('AvaliarReservaJob started', [
            'reserva_id' => $this->reserva->id,
            'gestor_id' => $this->gestor->id,
            'scope' => $this->validatedData['evaluation_scope'],
            'horarios_count' => count($this->validatedData['horarios_avaliados']),
        ]);

        if ($this->reserva->situacao === SituacaoReservaEnum::INATIVA->value) {
            throw new Exception('Cannot evaluate an archived reservation.');
        }

        $this->validateHorariosAutorization();

        try {
            /** @var list<int> $horariosDeferidosIds */
            $horariosDeferidosIds = DB::transaction(function () use ($conflictService): array {
                $scope = $this->validatedData['evaluation_scope'];
                $agendasDoGestorIds = $this->gestor->agendas()->pluck('id');
                $motivoDoGestor = $this->validatedData['motivo'] ?? null;
                $horariosDaAvaliacao = collect($this->validatedData['horarios_avaliados']);

                $conflitosMap = $conflictService->findConflictsFor($this->reserva->id);
                // ConflictDetectionService e global de proposito; o gestor so age nas proprias agendas.
                $horariosDoGestorIds = Horario::query()
                    ->where('reserva_id', $this->reserva->id)
                    ->whereIn('agenda_id', $agendasDoGestorIds)
                    ->pluck('id');
                $horariosConflitantesIds = $conflitosMap
                    ->filter(fn ($conflito, $horarioId) => $horariosDoGestorIds->contains($horarioId))
                    ->keys();

                /** @var list<int> $horariosDeferidosIds */
                $horariosDeferidosIds = [];

                if ($scope === 'single') {
                    foreach ($horariosDaAvaliacao as $avaliacao) {
                        $horarioId = (int) $avaliacao['id'];
                        $statusFinal = $avaliacao['status'] === 'solicitado'
                            ? SituacaoReservaEnum::EM_ANALISE->value
                            : (string) $avaliacao['status'];

                        if ($horariosConflitantesIds->contains($horarioId)) {
                            $statusFinal = SituacaoReservaEnum::INDEFERIDA->value;
                            $justificativaFinal = $this->justificativaDeConflito();
                            $avaliadorId = $this->gestor->id;
                        } else {
                            $justificativaFinal = $statusFinal === SituacaoReservaEnum::INDEFERIDA->value ? $motivoDoGestor : null;
                            $avaliadorId = $statusFinal === SituacaoReservaEnum::EM_ANALISE->value ? null : $this->gestor->id;
                        }

                        Horario::where('id', $horarioId)
                            ->where('reserva_id', $this->reserva->id)
                            ->whereIn('agenda_id', $agendasDoGestorIds)
                            ->update([
                                'situacao' => $statusFinal,
                                'user_id' => $avaliadorId,
                                'justificativa' => $justificativaFinal,
                            ]);

                        if ($statusFinal === SituacaoReservaEnum::DEFERIDA->value) {
                            $horariosDeferidosIds[] = $horarioId;
                        }
                    }
                } else {
                    if ($horariosConflitantesIds->isNotEmpty()) {
                        Horario::whereIn('id', $horariosConflitantesIds->all())
                            ->where('reserva_id', $this->reserva->id)
                            ->whereIn('agenda_id', $agendasDoGestorIds)
                            ->update([
                                'situacao' => SituacaoReservaEnum::INDEFERIDA->value,
                                'justificativa' => $this->justificativaDeConflito(),
                                'user_id' => $this->gestor->id,
                            ]);
                    }

                    $horariosDaReservaById = $this->reserva->horarios()
                        ->whereIn('agenda_id', $agendasDoGestorIds)
                        ->get()
                        ->keyBy('id');

                    /** @var list<int> $explicitIds */
                    $explicitIds = $horariosDaAvaliacao
                        ->map(fn (array $avaliacao): int => is_numeric($avaliacao['id'] ?? null) ? (int) $avaliacao['id'] : 0)
                        ->filter(fn (int $id): bool => $id > 0)
                        ->values()
                        ->all();

                    foreach ($horariosDaAvaliacao as $avaliacao) {
                        $horarioId = (int) $avaliacao['id'];

                        if ($horariosConflitantesIds->contains($horarioId) || ! $horariosDaReservaById->has($horarioId)) {
                            continue;
                        }

                        $statusFinal = $avaliacao['status'] === 'solicitado'
                            ? SituacaoReservaEnum::EM_ANALISE->value
                            : (string) $avaliacao['status'];
                        $justificativaFinal = $statusFinal === SituacaoReservaEnum::INDEFERIDA->value ? $motivoDoGestor : null;
                        $avaliadorId = $statusFinal === SituacaoReservaEnum::EM_ANALISE->value ? null : $this->gestor->id;

                        Horario::where('id', $horarioId)
                            ->where('reserva_id', $this->reserva->id)
                            ->whereIn('agenda_id', $agendasDoGestorIds)
                            ->update([
                                'situacao' => $statusFinal,
                                'user_id' => $avaliadorId,
                                'justificativa' => $justificativaFinal,
                            ]);

                        if ($statusFinal === SituacaoReservaEnum::DEFERIDA->value) {
                            $horariosDeferidosIds[] = $horarioId;
                        }
                    }

                    $processedPatterns = [];
                    foreach ($horariosDaAvaliacao as $avaliacao) {
                        $horarioId = (int) $avaliacao['id'];

                        if ($horariosConflitantesIds->contains($horarioId)) {
                            continue;
                        }

                        $horarioFonte = $horariosDaReservaById->get($horarioId);
                        if (! $horarioFonte instanceof Horario) {
                            continue;
                        }

                        $dayOfWeek = Carbon::parse($horarioFonte->data)->dayOfWeek;
                        $pattern = "{$horarioFonte->agenda_id}-{$horarioFonte->horario_inicio}-{$dayOfWeek}";

                        if (in_array($pattern, $processedPatterns, true)) {
                            continue;
                        }

                        $statusParaReplicar = $avaliacao['status'] === 'solicitado'
                            ? SituacaoReservaEnum::EM_ANALISE->value
                            : (string) $avaliacao['status'];
                        $justificativaParaReplicar = $statusParaReplicar === SituacaoReservaEnum::INDEFERIDA->value ? $motivoDoGestor : null;
                        $avaliadorParaReplicar = $statusParaReplicar === SituacaoReservaEnum::EM_ANALISE->value ? null : $this->gestor->id;

                        /** @var list<int> $idsParaReplicar */
                        $idsParaReplicar = $this->reserva->horarios()
                            ->where('agenda_id', $horarioFonte->agenda_id)
                            ->where('horario_inicio', $horarioFonte->horario_inicio)
                            ->whereRaw('EXTRACT(DOW FROM data) = ?', [$dayOfWeek])
                            ->whereNotIn('id', $horariosConflitantesIds->all())
                            ->whereNotIn('id', $explicitIds)
                            ->pluck('id')
                            ->all();

                        if ($idsParaReplicar !== []) {
                            Horario::whereIn('id', $idsParaReplicar)->update([
                                'situacao' => $statusParaReplicar,
                                'user_id' => $avaliadorParaReplicar,
                                'justificativa' => $justificativaParaReplicar,
                            ]);

                            if ($statusParaReplicar === SituacaoReservaEnum::DEFERIDA->value) {
                                array_push($horariosDeferidosIds, ...$idsParaReplicar);
                            }
                        }

                        $processedPatterns[] = $pattern;
                    }
                }

                $this->reserva->observacao = $this->validatedData['observacao'] ?? $this->reserva->observacao;
                $this->updateReservaOverallStatus($this->reserva);

                return array_values(array_unique($horariosDeferidosIds));
            });

            $this->reserva->refresh();

            Log::info('AvaliarReservaJob completed', [
                'reserva_id' => $this->reserva->id,
                'situacao' => $this->reserva->situacao,
            ]);

            $horariosRecemAprovados = $horariosDeferidosIds !== []
                ? $this->reserva->horarios()
                    ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
                    ->whereIn('id', $horariosDeferidosIds)
                    ->get()
                : $this->reserva->horarios()->whereRaw('1 = 0')->get();

            if ($horariosRecemAprovados->isNotEmpty()) {
                $this->triggerConflictRevalidation($horariosRecemAprovados);
            }

            $solicitante = $this->reserva->user;

            if ($solicitante !== null) {
                try {
                    $solicitante->notify(new ReservationEvaluatedNotification(
                        $this->reserva,
                        $this->reserva->situacao_formatada,
                        $this->gestor
                    ));
                } catch (Exception $e) {
                    Log::warning('Falha ao enviar notificação de avaliação da reserva', [
                        'reserva_id' => $this->reserva->id,
                        'exception' => $e,
                    ]);
                }
            }

            $broadcaster->publicar($this->reserva, 'evaluated');

        } catch (Exception $e) {
            Log::error('AvaliarReservaJob failed', [
                'reserva_id' => $this->reserva->id,
                'gestor_id' => $this->gestor->id,
                'exception' => $e,
            ]);
            $this->fail($e);
        }
    }

    private function justificativaDeConflito(): string
    {
        return (string) __('Conflict with another approved reservation at this time.', [], $this->locale);
    }

    /**
     * Defense in depth: verify that all horarios being evaluated belong to agendas managed by the gestor.
     */
    private function validateHorariosAutorization(): void
    {
        $agendasDoGestorIds = $this->gestor->agendas()->pluck('id')->toArray();
        $horariosIds = collect($this->validatedData['horarios_avaliados'])->pluck('id')->toArray();

        if (empty($horariosIds)) {
            return;
        }

        $horariosComAgendaInvalida = Horario::whereIn('id', $horariosIds)
            ->whereNotIn('agenda_id', $agendasDoGestorIds)
            ->exists();

        if ($horariosComAgendaInvalida) {
            throw new Exception('Authorization failed: one or more horarios do not belong to managed agendas.');
        }
    }

    /**
     * Handle a job failure after all retries are exhausted.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('AvaliarReservaJob exhausted all retries', [
            'reserva_id' => $this->reserva->id,
            'gestor_id' => $this->gestor->id,
            'exception' => $exception,
        ]);
    }

    /**
     * Dispatches conflict revalidation jobs for other pending reservations
     * that share a slot with any of the newly approved horarios.
     *
     * @param  Collection<int, Horario>  $horariosAprovados
     */
    private function triggerConflictRevalidation(Collection $horariosAprovados): void
    {
        $slotsOcupados = $horariosAprovados
            ->map(fn ($h) => ['data' => $h->data, 'agenda_id' => $h->agenda_id])
            ->unique(fn ($item) => $item['data'].$item['agenda_id']);

        if ($slotsOcupados->isEmpty()) {
            return;
        }

        $reservasParaRevalidar = Reserva::query()
            ->where('id', '!=', $this->reserva->id)
            ->where('validation_status', 'completed')
            ->whereIn('situacao', [
                SituacaoReservaEnum::EM_ANALISE->value,
                SituacaoReservaEnum::PARCIALMENTE_DEFERIDA->value,
            ])
            ->whereHas('horarios', function ($query) use ($slotsOcupados) {
                $query->where(function ($q) use ($slotsOcupados) {
                    foreach ($slotsOcupados as $slot) {
                        $q->orWhere(function ($orQ) use ($slot) {
                            $orQ->where('data', $slot['data'])->where('agenda_id', $slot['agenda_id']);
                        });
                    }
                });
            })
            ->select('id')
            ->get();

        foreach ($reservasParaRevalidar as $reserva) {
            Log::info('Disparando revalidação de conflito por aprovação de reserva', [
                'reserva_id' => $reserva->id,
                'reserva_aprovada_id' => $this->reserva->id,
            ]);
            ValidateReservationConflictsJob::dispatch($reserva);
        }
    }

    /**
     * Recalculates and persists the overall situacao of the reservation
     * based on the aggregate statuses of its horarios.
     */
    private function updateReservaOverallStatus(Reserva $reserva): void
    {
        if ($reserva->situacao === SituacaoReservaEnum::INATIVA->value) {
            return;
        }

        $statusCounts = DB::table('horarios')
            ->where('reserva_id', $reserva->id)
            ->select('situacao', DB::raw('count(*) as total'))
            ->groupBy('situacao')
            ->pluck('total', 'situacao');

        $totalHorarios = $statusCounts->sum();

        if ($totalHorarios === 0) {
            $reserva->situacao = SituacaoReservaEnum::INDEFERIDA->value;
            $reserva->save();

            return;
        }

        $deferidosCount = $statusCounts->get(SituacaoReservaEnum::DEFERIDA->value, 0);
        $indeferidosCount = $statusCounts->get(SituacaoReservaEnum::INDEFERIDA->value, 0);
        $emAnaliseCount = $statusCounts->get(SituacaoReservaEnum::EM_ANALISE->value, 0);

        $novaSituacao = match (true) {
            $deferidosCount === $totalHorarios => SituacaoReservaEnum::DEFERIDA->value,
            $indeferidosCount === $totalHorarios => SituacaoReservaEnum::INDEFERIDA->value,
            $emAnaliseCount > 0 => SituacaoReservaEnum::EM_ANALISE->value,
            default => SituacaoReservaEnum::PARCIALMENTE_DEFERIDA->value,
        };

        $reserva->situacao = $novaSituacao;
        $reserva->save();
    }
}
