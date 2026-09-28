<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Events\ReservaEvent;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationUpdatedNotification;
use App\Notifications\ReservationUpdateFailedNotification;
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

class UpdateReservaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        protected Reserva $reserva,
        protected array $validatedData,
        protected User $user,
    ) {}

    /**
     * Execute the job — updates the reservation and regenerates horarios for the given scope.
     *
     * O servico e injetado aqui, e nao no construtor: o job e serializado para a
     * fila e so as propriedades do construtor viajam junto.
     *
     * No escopo 'single', data_inicial e data_final sao recalculadas a partir do
     * MIN/MAX dos horarios restantes apos a edicao, garantindo que nenhum horario
     * fique fora do range. No escopo 'recurring', as datas vem do validatedData.
     */
    public function handle(ExpansaoHorariosService $expansao, AutoAprovacaoService $autoAprovacao): void
    {
        Log::info('UpdateReservaJob started', [
            'reserva_id' => $this->reserva->id,
            'user_id' => $this->user->id,
            'scope' => $this->validatedData['edit_scope'],
        ]);

        try {
            DB::transaction(function () use ($expansao, $autoAprovacao) {
                $this->reserva->update([
                    'titulo' => $this->validatedData['titulo'],
                    'descricao' => $this->validatedData['descricao'] ?? '',
                    'recorrencia' => $this->validatedData['recorrencia'],
                ]);

                $scope = $this->validatedData['edit_scope'];
                $horariosSolicitados = collect($this->validatedData['horarios_solicitados']);

                if ($scope === 'single') {
                    $dataReferencia = Carbon::parse($this->validatedData['edited_week_date']);
                    $inicioSemana = $dataReferencia->copy()->startOfWeek(Carbon::MONDAY)->toDateString();
                    $fimSemana = $dataReferencia->copy()->endOfWeek(Carbon::SUNDAY)->toDateString();

                    $horariosAtuaisNaSemana = $this->reserva->horarios()
                        ->whereBetween('data', [$inicioSemana, $fimSemana])
                        ->get();

                    $idsSolicitadosNaSemana = $horariosSolicitados->whereNotNull('id')->pluck('id');

                    foreach ($horariosAtuaisNaSemana as $horarioAtual) {
                        if (! $idsSolicitadosNaSemana->contains($horarioAtual->id)) {
                            $horarioAtual->delete();
                        }
                    }

                    // Adquirir lock pessimista sobre horarios da semana afetada
                    $agendasAfetodasSingle = $horariosSolicitados
                        ->pluck('agenda_id')
                        ->unique()
                        ->filter()
                        ->values()
                        ->sort()
                        ->all();

                    if ($agendasAfetodasSingle !== []) {
                        Horario::whereIn('agenda_id', $agendasAfetodasSingle)
                            ->whereBetween('data', [$inicioSemana, $fimSemana])
                            ->lockForUpdate()
                            ->get();
                    }

                    foreach ($horariosSolicitados->whereNull('id') as $novoHorario) {
                        // Revalidar conflito sob lock, antes de inserir
                        $conflito = Horario::where('agenda_id', $novoHorario['agenda_id'])
                            ->where('data', $novoHorario['data'])
                            ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
                            ->where('reserva_id', '!=', $this->reserva->id)
                            ->where('horario_inicio', '<', $novoHorario['horario_fim'])
                            ->where('horario_fim', '>', $novoHorario['horario_inicio'])
                            ->exists();

                        if ($conflito) {
                            throw new Exception("Conflito detectado sob lock para agenda {$novoHorario['agenda_id']} em {$novoHorario['data']}. Outra reserva pode ter sido editada simultaneamente.");
                        }

                        $this->reserva->horarios()->create($novoHorario);
                    }

                    $dataInicial = $this->reserva->horarios()->min('data')
                        ?? $this->validatedData['data_inicial'];
                    $dataFinal = $this->reserva->horarios()->max('data')
                        ?? $this->validatedData['data_final'];

                    $this->reserva->update([
                        'data_inicial' => $dataInicial,
                        'data_final' => $dataFinal,
                    ]);
                } else {
                    // Adquirir lock pessimista sobre horarios da faixa de datas (escopo recurring)
                    $agendasAfetadas = $horariosSolicitados
                        ->pluck('agenda_id')
                        ->unique()
                        ->filter()
                        ->values()
                        ->sort()
                        ->all();

                    $dataInicial = Carbon::parse($this->validatedData['data_inicial'])->toDateString();
                    $dataFinal = Carbon::parse($this->validatedData['data_final'])->toDateString();

                    Horario::whereIn('agenda_id', $agendasAfetadas)
                        ->whereBetween('data', [$dataInicial, $dataFinal])
                        ->lockForUpdate()
                        ->get();

                    $this->reserva->update([
                        'data_inicial' => $this->validatedData['data_inicial'],
                        'data_final' => $this->validatedData['data_final'],
                    ]);
                    $agendasMap = Agenda::with('user')
                        ->whereIn('id', $agendasAfetadas)
                        ->get()
                        ->keyBy('id');

                    // O escopo `recurring` regrava tudo. Sem guardar o que ja foi
                    // avaliado, a edicao apagaria situacao, justificativa e
                    // avaliador — e quem tem `reservas.atualizar` chega aqui mesmo
                    // com a reserva parcialmente avaliada, sem passar pelo
                    // bloqueio da ReservaPolicy.
                    $avaliacoes = $this->reserva->horarios()
                        ->whereIn('situacao', [SituacaoReservaEnum::DEFERIDA->value, SituacaoReservaEnum::INDEFERIDA->value])
                        ->get()
                        ->keyBy(fn ($h) => $this->chaveHorario($h->agenda_id, $h->data, $h->horario_inicio));

                    $this->reserva->horarios()->delete();

                    [$linhas] = $expansao->montar(
                        $horariosSolicitados->all(),
                        $agendasMap,
                        (string) $this->reserva->recorrencia,
                        Carbon::parse($this->reserva->data_final),
                        (int) $this->reserva->id,
                        // Mesma regra da criacao: se o dono da reserva administra
                        // a agenda, o horario ja nasce deferido. Vale o dono, e
                        // nao quem edita — senao um gestor editando a reserva de
                        // outra pessoa a deferiria sem querer.
                        fn (Agenda $agenda) => $autoAprovacao->resolverSituacaoHorario($agenda, $this->reserva->user_id),
                    );

                    // Revalidar conflitos sob lock, antes de inserir
                    foreach ($linhas as $novaLinha) {
                        $conflito = Horario::where('agenda_id', $novaLinha['agenda_id'])
                            ->where('data', $novaLinha['data'])
                            ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
                            ->where('reserva_id', '!=', $this->reserva->id)
                            ->where('horario_inicio', '<', $novaLinha['horario_fim'])
                            ->where('horario_fim', '>', $novaLinha['horario_inicio'])
                            ->exists();

                        if ($conflito) {
                            throw new Exception("Conflito detectado sob lock para agenda {$novaLinha['agenda_id']} em {$novaLinha['data']}. Outra reserva pode ter sido editada simultaneamente.");
                        }
                    }

                    foreach ($linhas as $indice => $linha) {
                        $anterior = $avaliacoes->get(
                            $this->chaveHorario($linha['agenda_id'], $linha['data'], $linha['horario_inicio'])
                        );

                        if ($anterior !== null) {
                            $linhas[$indice]['situacao'] = $anterior->situacao;
                            $linhas[$indice]['justificativa'] = $anterior->justificativa;
                            $linhas[$indice]['user_id'] = $anterior->user_id;
                        }
                    }

                    if ($linhas !== []) {
                        Horario::insert($linhas);
                    }
                }
            });

            Log::info('UpdateReservaJob completed', [
                'reserva_id' => $this->reserva->id,
                'scope' => $this->validatedData['edit_scope'],
            ]);

            try {
                $this->user->notify(new ReservationUpdatedNotification($this->reserva));
            } catch (Exception $e) {
                Log::warning('Failed to send reservation update notification', [
                    'reserva_id' => $this->reserva->id,
                    'exception' => $e,
                ]);
            }

            ValidateReservationConflictsJob::dispatch($this->reserva);

            $espacoId = $this->reserva->horarios()->with('agenda.espaco')->first()?->agenda->espaco_id ?? 0;
            $horariosCount = $this->reserva->horarios()->count();
            ReservaEvent::dispatch('updated', $this->reserva->id, $espacoId, $horariosCount);

        } catch (Exception $e) {
            Log::error('UpdateReservaJob failed', [
                'reserva_id' => $this->reserva->id,
                'user_id' => $this->user->id,
                'exception' => $e,
            ]);
            $this->fail($e);
        }
    }

    /**
     * Identidade de um horario para casar o que foi regravado com o que ja
     * estava avaliado. `data` vem como string do banco e como string do
     * expansor, mas passa por Carbon para nao depender desse formato.
     */
    private function chaveHorario(int $agendaId, mixed $data, string $horarioInicio): string
    {
        return implode('-', [$agendaId, Carbon::parse($data)->toDateString(), $horarioInicio]);
    }

    /**
     * Handle a job failure after all retries are exhausted.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('UpdateReservaJob exhausted all retries', [
            'reserva_id' => $this->reserva->id,
            'user_id' => $this->user->id,
            'exception' => $exception,
        ]);

        try {
            $this->user->notify(new ReservationUpdateFailedNotification($this->reserva, $this->user));
        } catch (Exception $e) {
            Log::error('Failed to send reservation update failure notification', [
                'reserva_id' => $this->reserva->id,
                'exception' => $e,
            ]);
        }
    }
}
