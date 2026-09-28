<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Events\ReservaEvent;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\NewReservationNotification;
use App\Notifications\ReservationCreatedNotification;
use App\Notifications\ReservationFailedNotification;
use App\Services\AutoAprovacaoService;
use App\Services\ExpansaoHorariosService;
use Carbon\Carbon;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessarCriacaoReserva implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * Maximum number of seconds the job may run.
     */
    public int $timeout = 360;

    /**
     * @param  array<string, mixed>  $dadosRequisicao  Validated data from StoreReservaRequest.
     * @param  User  $solicitante  The user making the reservation request.
     */
    public function __construct(
        protected array $dadosRequisicao,
        protected User $solicitante,
    ) {}

    /**
     * Execute the job — creates the Reserva, generates all recurring Horario records,
     * notifies managers, and dispatches conflict validation.
     *
     * O servico e injetado aqui, e nao no construtor: o job e serializado para a
     * fila e so as propriedades do construtor viajam junto.
     */
    public function handle(ExpansaoHorariosService $expansao, AutoAprovacaoService $autoAprovacao): void
    {
        Log::info('ProcessarCriacaoReserva started', [
            'solicitante_id' => $this->solicitante->id,
            'titulo' => $this->dadosRequisicao['titulo'],
        ]);

        try {
            $horariosData = $this->dadosRequisicao['horarios_solicitados'];

            // Uma query para todas as agendas e seus gestores, em vez de um
            // findOrFail por slot dentro do loop.
            $agendasMap = Agenda::with('user')
                ->whereIn('id', collect($horariosData)->pluck('agenda_id')->unique()->filter()->all())
                ->get()
                ->keyBy('id');

            [$reserva, $gestoresUnicos] = DB::transaction(function () use ($expansao, $autoAprovacao, $agendasMap, $horariosData) {
                $reserva = Reserva::create([
                    'titulo' => $this->dadosRequisicao['titulo'],
                    'descricao' => $this->dadosRequisicao['descricao'] ?? '',
                    'data_inicial' => $this->dadosRequisicao['data_inicial'],
                    'data_final' => $this->dadosRequisicao['data_final'],
                    'recorrencia' => $this->dadosRequisicao['recorrencia'],
                    'user_id' => $this->solicitante->id,
                    'situacao' => SituacaoReservaEnum::EM_ANALISE->value,
                ]);

                // Adquirir lock pessimista sobre horarios da faixa de datas
                $agendasAfetadas = collect($horariosData)
                    ->pluck('agenda_id')
                    ->unique()
                    ->filter()
                    ->values()
                    ->sort()
                    ->all();

                $dataInicial = Carbon::parse($reserva->data_inicial)->toDateString();
                $dataFinal = Carbon::parse($reserva->data_final)->toDateString();

                Horario::whereIn('agenda_id', $agendasAfetadas)
                    ->whereBetween('data', [$dataInicial, $dataFinal])
                    ->lockForUpdate()
                    ->get();

                [$linhas, $agendasUsadas] = $expansao->montar(
                    $horariosData,
                    $agendasMap,
                    (string) $reserva->recorrencia,
                    Carbon::parse($reserva->data_final),
                    (int) $reserva->id,
                    fn (Agenda $agenda) => $autoAprovacao->resolverSituacaoHorario($agenda, $this->solicitante->id),
                );

                // Revalidar conflitos sob lock, antes de inserir
                foreach ($linhas as $novaLinha) {
                    $conflito = Horario::where('agenda_id', $novaLinha['agenda_id'])
                        ->where('data', $novaLinha['data'])
                        ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
                        ->where('horario_inicio', '<', $novaLinha['horario_fim'])
                        ->where('horario_fim', '>', $novaLinha['horario_inicio'])
                        ->exists();

                    if ($conflito) {
                        throw new Exception("Conflito detectado sob lock para agenda {$novaLinha['agenda_id']} em {$novaLinha['data']}. Outra reserva pode ter sido criada simultaneamente.");
                    }
                }

                if ($linhas !== []) {
                    Horario::insert($linhas);
                }

                // Agenda sem gestor atribuido nao entra na conta — antes disso
                // o acesso direto a `$gestor->id` estourava nesse caso.
                $gestoresUnicos = $agendasUsadas->map(fn (Agenda $a) => $a->user)->filter()->unique('id')->values();

                $novaSituacao = $autoAprovacao->calcularSituacaoReserva($gestoresUnicos, $this->solicitante->id);
                if ($novaSituacao !== null) {
                    $reserva->update(['situacao' => $novaSituacao]);
                }

                Log::info('Reservation created', [
                    'reserva_id' => $reserva->id,
                    'situacao' => $reserva->situacao,
                    'horarios_count' => count($linhas),
                ]);

                return [$reserva, $gestoresUnicos];
            });

            foreach ($gestoresUnicos as $gestor) {
                if ($gestor->id !== $this->solicitante->id) {
                    try {
                        $gestor->notify(new NewReservationNotification($reserva));
                    } catch (Exception $e) {
                        Log::warning('Falha ao notificar gestor sobre nova reserva', [
                            'gestor_id' => $gestor->id,
                            'reserva_id' => $reserva->id,
                            'exception' => $e,
                        ]);
                    }
                }
            }

            ValidateReservationConflictsJob::dispatch($reserva);

            Log::info('Conflict validation dispatched', ['reserva_id' => $reserva->id]);

            $espacoId = $reserva->horarios()->with('agenda.espaco')->first()?->agenda->espaco_id ?? 0;
            $horariosCount = $reserva->horarios()->count();
            ReservaEvent::dispatch('created', $reserva->id, $espacoId, $horariosCount);

            try {
                $this->solicitante->notify(new ReservationCreatedNotification($reserva));
            } catch (Exception $e) {
                Log::warning('Falha ao enviar notificação de reserva criada', [
                    'reserva_id' => $reserva->id,
                    'solicitante_id' => $this->solicitante->id,
                    'exception' => $e,
                ]);
            }

        } catch (Exception $e) {
            Log::error('ProcessarCriacaoReserva failed', [
                'solicitante_id' => $this->solicitante->id,
                'titulo' => $this->dadosRequisicao['titulo'],
                'exception' => $e,
            ]);
            $this->fail($e);
        }
    }

    /**
     * Handle a job failure after all retries are exhausted.
     * Notifies the requester that their reservation could not be processed.
     */
    public function failed(Throwable $exception): void
    {
        try {
            $this->solicitante->notify(new ReservationFailedNotification(
                $this->dadosRequisicao['titulo'],
                $this->solicitante
            ));
        } catch (Exception $e) {
            Log::error('Falha fatal ao enviar notificação de erro de criação de reserva', [
                'solicitante_id' => $this->solicitante->id,
                'exception' => $e,
            ]);
        }
    }
}
