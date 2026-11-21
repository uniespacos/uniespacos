<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\Reserva\EscopoEdicaoEnum;
use App\Enums\Reserva\StatusAvaliacaoHorarioEnum;
use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Exceptions\AutorizacaoDeJobException;
use App\Exceptions\EscopoInvalidoException;
use App\Exceptions\ReservaArquivadaException;
use App\Jobs\ValidateReservationConflictsJob;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationEvaluatedNotification;
use App\Repositories\HorarioRepositoryInterface;
use App\Repositories\ReservaRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * @phpstan-type DadosDeAvaliacao array{evaluation_scope: string, horarios_avaliados: list<array{id: int, status: string}>, motivo: string|null, observacao: string|null}
 * @phpstan-type Decisao array{situacao: string, justificativa: string|null, user_id: int|null}
 */
class AvaliacaoDeReservaService
{
    public function __construct(
        private ConflictDetectionService $conflictService,
        private HorarioRepositoryInterface $horarios,
        private ReservaRepositoryInterface $reservas,
        private ReservaBroadcaster $broadcaster,
    ) {}

    /**
     * @param  array<string, mixed>  $dadosBrutos
     *
     * @throws ReservaArquivadaException
     * @throws EscopoInvalidoException
     * @throws AutorizacaoDeJobException
     */
    public function avaliar(Reserva $reserva, array $dadosBrutos, User $gestor, string $locale): void
    {
        if ($reserva->situacao === SituacaoReservaEnum::INATIVA->value) {
            throw new ReservaArquivadaException;
        }

        $dados = $this->normalizarDados($dadosBrutos);
        $escopo = EscopoEdicaoEnum::tryFrom($dados['evaluation_scope']) ?? throw new EscopoInvalidoException;
        $agendasDoGestorIds = array_values(array_map(fn ($id): int => is_numeric($id) ? (int) $id : 0, $gestor->agendas()->pluck('id')->all()));

        $this->autorizarHorarios($dados['horarios_avaliados'], $agendasDoGestorIds);

        $horariosDeferidosIds = DB::transaction(
            fn (): array => $this->aplicarAvaliacao($reserva, $dados, $escopo, $gestor, $agendasDoGestorIds, $locale)
        );

        $reserva->refresh();

        $this->aposCommit($reserva, $gestor, $horariosDeferidosIds);
    }

    /**
     * @param  array<string, mixed>  $dadosBrutos
     * @return DadosDeAvaliacao
     */
    private function normalizarDados(array $dadosBrutos): array
    {
        $brutos = $dadosBrutos['horarios_avaliados'] ?? [];
        $brutos = is_array($brutos) ? $brutos : [];

        $horariosAvaliados = [];
        foreach ($brutos as $bruto) {
            if (! is_array($bruto)) {
                continue;
            }

            $id = $bruto['id'] ?? null;
            $status = $bruto['status'] ?? null;

            $horariosAvaliados[] = [
                'id' => is_numeric($id) ? (int) $id : 0,
                'status' => is_string($status) ? $status : '',
            ];
        }

        $escopo = $dadosBrutos['evaluation_scope'] ?? null;
        $motivo = $dadosBrutos['motivo'] ?? null;
        $observacao = $dadosBrutos['observacao'] ?? null;

        return [
            'evaluation_scope' => is_string($escopo) ? $escopo : '',
            'horarios_avaliados' => $horariosAvaliados,
            'motivo' => is_string($motivo) ? $motivo : null,
            'observacao' => is_string($observacao) ? $observacao : null,
        ];
    }

    /**
     * @param  DadosDeAvaliacao  $dados
     * @param  list<int>  $agendasDoGestorIds
     * @return list<int>
     */
    private function aplicarAvaliacao(
        Reserva $reserva,
        array $dados,
        EscopoEdicaoEnum $escopo,
        User $gestor,
        array $agendasDoGestorIds,
        string $locale,
    ): array {
        $conflitantesIds = $this->horariosConflitantesDoGestor($reserva, $agendasDoGestorIds);

        $decisoes = $escopo === EscopoEdicaoEnum::SINGLE
            ? $this->decisoesDoEscopoSingle($dados, $conflitantesIds, $gestor->id, $locale)
            : $this->decisoesDoEscopoRecurring($reserva, $dados, $conflitantesIds, $agendasDoGestorIds, $gestor->id, $locale);

        $this->aplicarDecisoes($reserva, $decisoes, $agendasDoGestorIds);

        $reserva->observacao = $dados['observacao'] ?? $reserva->observacao;
        $this->atualizarSituacaoGeral($reserva);

        $deferidos = array_filter(
            $decisoes,
            fn (array $decisao): bool => $decisao['situacao'] === SituacaoReservaEnum::DEFERIDA->value,
        );

        return array_keys($deferidos);
    }

    /**
     * @param  list<int>  $agendasDoGestorIds
     * @return list<int>
     */
    private function horariosConflitantesDoGestor(Reserva $reserva, array $agendasDoGestorIds): array
    {
        $horariosDoGestorIds = $this->horarios->idsDaReservaNasAgendas($reserva->id, $agendasDoGestorIds);

        $conflitantes = $this->conflictService->findConflictsFor($reserva->id)
            ->filter(fn ($conflito, $horarioId): bool => $horariosDoGestorIds->contains($horarioId))
            ->keys()
            ->all();

        return array_values($conflitantes);
    }

    /**
     * @param  DadosDeAvaliacao  $dados
     * @param  list<int>  $conflitantesIds
     * @return array<int, Decisao>
     */
    private function decisoesDoEscopoSingle(array $dados, array $conflitantesIds, int $gestorId, string $locale): array
    {
        $decisoes = [];

        foreach ($dados['horarios_avaliados'] as $avaliacao) {
            $horarioId = $avaliacao['id'];

            $decisoes[$horarioId] = in_array($horarioId, $conflitantesIds, true)
                ? $this->decisaoDeConflito($gestorId, $locale)
                : $this->decisaoAvaliada($this->situacaoSolicitada($avaliacao), $dados['motivo'], $gestorId);
        }

        return $decisoes;
    }

    /**
     * @param  DadosDeAvaliacao  $dados
     * @param  list<int>  $conflitantesIds
     * @param  list<int>  $agendasDoGestorIds
     * @return array<int, Decisao>
     */
    private function decisoesDoEscopoRecurring(
        Reserva $reserva,
        array $dados,
        array $conflitantesIds,
        array $agendasDoGestorIds,
        int $gestorId,
        string $locale,
    ): array {
        $motivo = $dados['motivo'];
        $decisoes = [];

        foreach ($conflitantesIds as $horarioId) {
            $decisoes[$horarioId] = $this->decisaoDeConflito($gestorId, $locale);
        }

        $horariosDaReservaById = $reserva->horarios()
            ->whereIn('agenda_id', $agendasDoGestorIds)
            ->get()
            ->keyBy('id');

        $idsExplicitos = array_map(fn (array $avaliacao): int => $avaliacao['id'], $dados['horarios_avaliados']);

        foreach ($dados['horarios_avaliados'] as $avaliacao) {
            $horarioId = $avaliacao['id'];

            if (in_array($horarioId, $conflitantesIds, true) || ! $horariosDaReservaById->has($horarioId)) {
                continue;
            }

            $decisoes[$horarioId] = $this->decisaoAvaliada($this->situacaoSolicitada($avaliacao), $motivo, $gestorId);
        }

        $padroesProcessados = [];

        foreach ($dados['horarios_avaliados'] as $avaliacao) {
            $horarioId = $avaliacao['id'];

            if (in_array($horarioId, $conflitantesIds, true)) {
                continue;
            }

            $horarioFonte = $horariosDaReservaById->get($horarioId);
            if (! $horarioFonte instanceof Horario) {
                continue;
            }

            $diaDaSemana = Carbon::parse($horarioFonte->data)->dayOfWeek;
            $padrao = "{$horarioFonte->agenda_id}-{$horarioFonte->horario_inicio}-{$diaDaSemana}";

            if (in_array($padrao, $padroesProcessados, true)) {
                continue;
            }
            $padroesProcessados[] = $padrao;

            $idsParaReplicar = $reserva->horarios()
                ->where('agenda_id', $horarioFonte->agenda_id)
                ->where('horario_inicio', $horarioFonte->horario_inicio)
                ->whereRaw('EXTRACT(DOW FROM data) = ?', [$diaDaSemana])
                ->whereNotIn('id', $conflitantesIds)
                ->whereNotIn('id', $idsExplicitos)
                ->pluck('id');

            $decisaoReplicada = $this->decisaoAvaliada($this->situacaoSolicitada($avaliacao), $motivo, $gestorId);

            foreach ($idsParaReplicar as $idParaReplicar) {
                $decisoes[is_numeric($idParaReplicar) ? (int) $idParaReplicar : 0] = $decisaoReplicada;
            }
        }

        return $decisoes;
    }

    /**
     * Agrupa as decisoes por (situacao, justificativa, avaliador): um UPDATE por grupo, nao por horario.
     *
     * @param  array<int, Decisao>  $decisoes
     * @param  list<int>  $agendasDoGestorIds
     */
    private function aplicarDecisoes(Reserva $reserva, array $decisoes, array $agendasDoGestorIds): void
    {
        $grupos = [];

        foreach ($decisoes as $horarioId => $decisao) {
            $chave = json_encode($decisao, JSON_THROW_ON_ERROR);
            $grupos[$chave] ??= ['atributos' => $decisao, 'ids' => []];
            $grupos[$chave]['ids'][] = $horarioId;
        }

        foreach ($grupos as $grupo) {
            $this->horarios->atualizarDaReservaEmLote(
                $grupo['ids'],
                $reserva->id,
                $agendasDoGestorIds,
                $grupo['atributos'],
            );
        }
    }

    /**
     * @param  list<array{id: int, status: string}>  $avaliacoes
     * @param  list<int>  $agendasDoGestorIds
     */
    private function autorizarHorarios(array $avaliacoes, array $agendasDoGestorIds): void
    {
        $horariosIds = array_map(fn (array $avaliacao): int => $avaliacao['id'], $avaliacoes);

        if ($horariosIds === []) {
            return;
        }

        $existeHorarioDeAgendaAlheia = $this->horarios->existeForaDasAgendas($horariosIds, $agendasDoGestorIds);

        if ($existeHorarioDeAgendaAlheia) {
            throw new AutorizacaoDeJobException;
        }
    }

    /**
     * @param  list<int>  $horariosDeferidosIds
     */
    private function aposCommit(Reserva $reserva, User $gestor, array $horariosDeferidosIds): void
    {
        if ($horariosDeferidosIds !== []) {
            $horariosRecemAprovados = $reserva->horarios()
                ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
                ->whereIn('id', $horariosDeferidosIds)
                ->get();

            if ($horariosRecemAprovados->isNotEmpty()) {
                try {
                    $this->revalidarConflitos($reserva, $horariosRecemAprovados);
                } catch (Throwable $e) {
                    Log::error('Falha ao disparar revalidação de conflitos após avaliação', [
                        'reserva_id' => $reserva->id,
                        'exception' => $e,
                    ]);
                }
            }
        }

        $this->notificarSolicitante($reserva, $gestor);

        try {
            $this->broadcaster->publicar($reserva, 'evaluated');
        } catch (Throwable $e) {
            Log::warning('Falha em efeito pós-commit da avaliação de reserva: broadcast não publicado', [
                'reserva_id' => $reserva->id,
                'exception' => $e,
            ]);
        }
    }

    /**
     * @param  Collection<int, Horario>  $horariosAprovados
     */
    private function revalidarConflitos(Reserva $reserva, Collection $horariosAprovados): void
    {
        $slotsOcupados = $horariosAprovados
            ->map(fn (Horario $horario): array => ['data' => $horario->data, 'agenda_id' => $horario->agenda_id])
            ->unique(fn (array $slot): string => $slot['data'].$slot['agenda_id']);

        if ($slotsOcupados->isEmpty()) {
            return;
        }

        $reservasParaRevalidar = $this->reservas->reservasParaRevalidarAposAprovacao($reserva->id, $slotsOcupados);

        foreach ($reservasParaRevalidar as $reservaParaRevalidar) {
            Log::info('Disparando revalidação de conflito por aprovação de reserva', [
                'reserva_id' => $reservaParaRevalidar->id,
                'reserva_aprovada_id' => $reserva->id,
            ]);
            ValidateReservationConflictsJob::dispatch($reservaParaRevalidar);
        }
    }

    private function notificarSolicitante(Reserva $reserva, User $gestor): void
    {
        $solicitante = $reserva->user;

        if ($solicitante === null) {
            return;
        }

        try {
            $solicitante->notify(new ReservationEvaluatedNotification(
                $reserva,
                $reserva->situacao_formatada,
                $gestor
            ));
        } catch (Throwable $e) {
            Log::warning('Falha ao enviar notificação de avaliação da reserva', [
                'reserva_id' => $reserva->id,
                'exception' => $e,
            ]);
        }
    }

    private function atualizarSituacaoGeral(Reserva $reserva): void
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

        $reserva->situacao = match (true) {
            $deferidosCount === $totalHorarios => SituacaoReservaEnum::DEFERIDA->value,
            $indeferidosCount === $totalHorarios => SituacaoReservaEnum::INDEFERIDA->value,
            $emAnaliseCount > 0 => SituacaoReservaEnum::EM_ANALISE->value,
            default => SituacaoReservaEnum::PARCIALMENTE_DEFERIDA->value,
        };
        $reserva->save();
    }

    /**
     * @param  array{id: int, status: string}  $avaliacao
     */
    private function situacaoSolicitada(array $avaliacao): string
    {
        return $avaliacao['status'] === StatusAvaliacaoHorarioEnum::SOLICITADO->value
            ? SituacaoReservaEnum::EM_ANALISE->value
            : $avaliacao['status'];
    }

    /**
     * @return Decisao
     */
    private function decisaoAvaliada(string $situacao, ?string $motivo, int $gestorId): array
    {
        return [
            'situacao' => $situacao,
            'justificativa' => $situacao === SituacaoReservaEnum::INDEFERIDA->value ? $motivo : null,
            'user_id' => $situacao === SituacaoReservaEnum::EM_ANALISE->value ? null : $gestorId,
        ];
    }

    /**
     * @return Decisao
     */
    private function decisaoDeConflito(int $gestorId, string $locale): array
    {
        return [
            'situacao' => SituacaoReservaEnum::INDEFERIDA->value,
            'justificativa' => (string) __('Conflict with another approved reservation at this time.', [], $locale),
            'user_id' => $gestorId,
        ];
    }
}
