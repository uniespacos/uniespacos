<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationUpdatedNotification;
use App\Notifications\ReservationUpdateFailedNotification;
use App\Services\AutoAprovacaoService;
use App\Services\ExpansaoHorariosService;
use App\Services\ReservaBroadcaster;
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

    /**
     * @param  array{titulo: string, descricao?: string, data_inicial: string, data_final: string, recorrencia: string, edit_scope: string, horarios_solicitados: array<int, array<string, mixed>>, edited_week_date?: string|\DateTimeInterface}  $validatedData
     */
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
     * No escopo 'single', a edicao vale so para a semana de edited_week_date e a
     * identidade de cada horario e agenda|data|horario_inicio (a mesma do indice
     * unico da tabela). Slots enviados para outras semanas sao ignorados. No escopo
     * 'single', data_inicial e data_final sao recalculadas a partir do MIN/MAX dos
     * horarios restantes apos a edicao. No escopo 'recurring', as datas vem do
     * validatedData.
     */
    public function handle(ExpansaoHorariosService $expansao, AutoAprovacaoService $autoAprovacao, ReservaBroadcaster $broadcaster = new ReservaBroadcaster): void
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
                    $editedWeekDate = $this->validatedData['edited_week_date'] ?? null;
                    if (! is_string($editedWeekDate) && ! $editedWeekDate instanceof \DateTimeInterface) {
                        throw new Exception('edited_week_date deve ser uma string ou data válida');
                    }

                    $dataReferencia = Carbon::parse($editedWeekDate);
                    $inicioSemana = $dataReferencia->copy()->startOfWeek(Carbon::MONDAY)->toDateString();
                    $fimSemana = $dataReferencia->copy()->endOfWeek(Carbon::SUNDAY)->toDateString();

                    $slotsDaSemana = $horariosSolicitados
                        ->map(fn (array $slot): array => $this->normalizarSlot($slot))
                        ->filter(fn (array $slot): bool => $slot['data'] !== '' && $slot['data'] >= $inicioSemana && $slot['data'] <= $fimSemana)
                        ->unique(fn (array $slot): string => $this->chaveHorario($slot['agenda_id'], $slot['data'], $slot['horario_inicio']))
                        ->values();

                    $agendasAfetadasSingle = $slotsDaSemana
                        ->map(fn (array $slot): int => $slot['agenda_id'])
                        ->unique()
                        ->filter()
                        ->values()
                        ->sort()
                        ->all();

                    // Adquirir lock pessimista sobre horarios da semana afetada
                    if ($agendasAfetadasSingle !== []) {
                        Horario::whereIn('agenda_id', $agendasAfetadasSingle)
                            ->whereBetween('data', [$inicioSemana, $fimSemana])
                            ->lockForUpdate()
                            ->get();
                    }

                    $chavesSolicitadas = $slotsDaSemana
                        ->mapWithKeys(fn (array $slot): array => [$this->chaveHorario($slot['agenda_id'], $slot['data'], $slot['horario_inicio']) => true])
                        ->all();

                    $horariosAtuaisNaSemana = $this->reserva->horarios()
                        ->whereBetween('data', [$inicioSemana, $fimSemana])
                        ->get();

                    $chavesAtuais = [];
                    foreach ($horariosAtuaisNaSemana as $horarioAtual) {
                        $chave = $this->chaveHorario((int) $horarioAtual->agenda_id, (string) $horarioAtual->data, (string) $horarioAtual->horario_inicio);
                        $chavesAtuais[$chave] = true;

                        if (! isset($chavesSolicitadas[$chave])) {
                            $horarioAtual->delete();
                        }
                    }

                    $agendasMapSingle = Agenda::whereIn('id', $agendasAfetadasSingle)
                        ->get()
                        ->keyBy('id');

                    foreach ($slotsDaSemana as $slot) {
                        $chave = $this->chaveHorario($slot['agenda_id'], $slot['data'], $slot['horario_inicio']);

                        if (isset($chavesAtuais[$chave])) {
                            continue;
                        }

                        // Revalidar conflito sob lock, antes de inserir
                        $conflito = Horario::where('agenda_id', $slot['agenda_id'])
                            ->where('data', $slot['data'])
                            ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
                            ->where('reserva_id', '!=', $this->reserva->id)
                            ->where('horario_inicio', '<', $slot['horario_fim'])
                            ->where('horario_fim', '>', $slot['horario_inicio'])
                            ->exists();

                        if ($conflito) {
                            $msg = 'Conflito detectado sob lock para agenda '.$slot['agenda_id'].' em '.$slot['data'].'. Outra reserva pode ter sido editada simultaneamente.';

                            throw new Exception($msg);
                        }

                        // Mesma regra do escopo recurring: quem administra a agenda e
                        // o dono da reserva — nunca quem edita — decide se o horario
                        // novo ja nasce deferido.
                        $agenda = $agendasMapSingle->get($slot['agenda_id']);
                        if ($agenda !== null) {
                            $resultado = $autoAprovacao->resolverSituacaoEAvaliador($agenda, (int) $this->reserva->user_id);
                            $situacao = $resultado['situacao'];
                            $avaliadorId = $resultado['user_id'];
                        } else {
                            $situacao = SituacaoReservaEnum::EM_ANALISE->value;
                            $avaliadorId = null;
                        }

                        $this->reserva->horarios()->create([
                            'agenda_id' => $slot['agenda_id'],
                            'data' => $slot['data'],
                            'horario_inicio' => $slot['horario_inicio'],
                            'horario_fim' => $slot['horario_fim'],
                            'situacao' => $situacao,
                            'user_id' => $avaliadorId,
                        ]);
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
                        fn (Agenda $agenda) => $autoAprovacao->resolverSituacaoEAvaliador($agenda, (int) $this->reserva->user_id),
                    );

                    // Revalidar conflitos sob lock, antes de inserir
                    foreach ($linhas as $novaLinha) {
                        $agendaIdRaw = $novaLinha['agenda_id'] ?? 0;
                        $dataRaw = $novaLinha['data'] ?? '';
                        $horarioFimRaw = $novaLinha['horario_fim'] ?? '';
                        $horarioInicioRaw = $novaLinha['horario_inicio'] ?? '';

                        if (! (is_int($agendaIdRaw) || is_string($agendaIdRaw))) {
                            $agendaIdRaw = 0;
                        }
                        if (! is_string($dataRaw)) {
                            $dataRaw = '';
                        }
                        if (! is_string($horarioFimRaw)) {
                            $horarioFimRaw = '';
                        }
                        if (! is_string($horarioInicioRaw)) {
                            $horarioInicioRaw = '';
                        }

                        $agendaId = (int) $agendaIdRaw;
                        $data = (string) $dataRaw;
                        $horarioFim = (string) $horarioFimRaw;
                        $horarioInicio = (string) $horarioInicioRaw;

                        $conflito = Horario::where('agenda_id', $agendaId)
                            ->where('data', $data)
                            ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
                            ->where('reserva_id', '!=', $this->reserva->id)
                            ->where('horario_inicio', '<', $horarioFim)
                            ->where('horario_fim', '>', $horarioInicio)
                            ->exists();

                        if ($conflito) {
                            $msg = 'Conflito detectado sob lock para agenda '.$agendaId.' em '.$data.'. Outra reserva pode ter sido editada simultaneamente.';

                            throw new Exception($msg);
                        }
                    }

                    foreach ($linhas as $indice => $linha) {
                        $agendaIdRaw = $linha['agenda_id'] ?? 0;
                        $dataRaw = $linha['data'] ?? '';
                        $horarioRaw = $linha['horario_inicio'] ?? '';

                        if (! (is_int($agendaIdRaw) || is_string($agendaIdRaw))) {
                            $agendaIdRaw = 0;
                        }
                        if (! is_string($dataRaw)) {
                            $dataRaw = '';
                        }
                        if (! is_string($horarioRaw)) {
                            $horarioRaw = '';
                        }

                        $agendaIdInt = (int) $agendaIdRaw;
                        $dataStr = (string) $dataRaw;
                        $horarioStr = (string) $horarioRaw;

                        $chaveHor = $this->chaveHorario($agendaIdInt, $dataStr, $horarioStr);
                        $anterior = $avaliacoes->get($chaveHor);

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

            if ($this->reserva->user !== null) {
                try {
                    $this->reserva->user->notify(new ReservationUpdatedNotification($this->reserva));
                } catch (Exception $e) {
                    Log::warning('Failed to send reservation update notification', [
                        'reserva_id' => $this->reserva->id,
                        'exception' => $e,
                    ]);
                }
            }

            ValidateReservationConflictsJob::dispatch($this->reserva);

            $broadcaster->publicar($this->reserva, 'updated');

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
     * @param  array<string, mixed>  $slot
     * @return array{agenda_id: int, data: string, horario_inicio: string, horario_fim: string}
     */
    private function normalizarSlot(array $slot): array
    {
        $agendaIdRaw = $slot['agenda_id'] ?? 0;
        $dataRaw = $slot['data'] ?? '';
        $horarioInicioRaw = $slot['horario_inicio'] ?? '';
        $horarioFimRaw = $slot['horario_fim'] ?? '';

        $data = is_string($dataRaw) && $dataRaw !== ''
            ? Carbon::parse($dataRaw)->toDateString()
            : '';

        return [
            'agenda_id' => is_int($agendaIdRaw) || is_string($agendaIdRaw) ? (int) $agendaIdRaw : 0,
            'data' => $data,
            'horario_inicio' => is_string($horarioInicioRaw) ? $horarioInicioRaw : '',
            'horario_fim' => is_string($horarioFimRaw) ? $horarioFimRaw : '',
        ];
    }

    /**
     * Identidade de um horario para casar o que foi regravado com o que ja
     * estava avaliado. `data` vem como string do banco e como string do
     * expansor, mas passa por Carbon para nao depender desse formato.
     */
    private function chaveHorario(int $agendaId, string $data, string $horarioInicio): string
    {
        $dataString = Carbon::parse($data)->toDateString();

        return implode('-', [$agendaId, $dataString, $horarioInicio]);
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

        if ($this->reserva->user !== null) {
            try {
                $this->reserva->user->notify(new ReservationUpdateFailedNotification($this->reserva, $this->user));
            } catch (Exception $e) {
                Log::error('Failed to send reservation update failure notification', [
                    'reserva_id' => $this->reserva->id,
                    'exception' => $e,
                ]);
            }
        }
    }
}
