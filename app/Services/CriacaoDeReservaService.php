<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Exceptions\ConflitoDeHorarioException;
use App\Exceptions\HorariosAusentesException;
use App\Models\Agenda;
use App\Models\Reserva;
use App\Models\User;
use App\Repositories\AgendaRepositoryInterface;
use App\Repositories\HorarioRepositoryInterface;
use App\Repositories\ReservaRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CriacaoDeReservaService
{
    public function __construct(
        private ReservaRepositoryInterface $reservas,
        private HorarioRepositoryInterface $horarios,
        private AgendaRepositoryInterface $agendas,
        private ExpansaoHorariosService $expansao,
        private AutoAprovacaoService $autoAprovacao,
        private TravaDeHorarios $travaDeHorarios,
    ) {}

    /**
     * @param  array{titulo: string, descricao?: string, data_inicial: string, data_final: string, recorrencia: string, publico_estimado?: int|null, categoria?: string|null, termo_aceito_em?: string, horarios_solicitados: array<int, array<string, mixed>>}  $dados
     * @return array{0: Reserva, 1: Collection<int, User>}
     *
     * @throws HorariosAusentesException
     * @throws ConflitoDeHorarioException quando outra reserva deferida ocupa um horario; nada e gravado.
     */
    public function criar(array $dados, User $solicitante): array
    {
        $horariosSolicitados = $dados['horarios_solicitados'];

        if ($horariosSolicitados === []) {
            throw new HorariosAusentesException;
        }

        $agendaIds = $this->agendaIds($horariosSolicitados);
        $agendasMap = $this->agendas->getWithUserByIds($agendaIds)->keyBy('id');

        return DB::transaction(function () use ($dados, $solicitante, $horariosSolicitados, $agendaIds, $agendasMap): array {
            $reserva = $this->reservas->store([
                'titulo' => $dados['titulo'],
                'descricao' => $dados['descricao'] ?? '',
                'data_inicial' => $dados['data_inicial'],
                'data_final' => $dados['data_final'],
                'recorrencia' => $dados['recorrencia'],
                'publico_estimado' => $dados['publico_estimado'] ?? null,
                'categoria' => $dados['categoria'] ?? null,
                'termo_aceito_em' => $dados['termo_aceito_em'] ?? null,
                'user_id' => $solicitante->id,
                'situacao' => SituacaoReservaEnum::EM_ANALISE->value,
            ]);

            [$linhas, $agendasUsadas] = $this->expansao->montar(
                $horariosSolicitados,
                $agendasMap,
                (string) $reserva->recorrencia,
                Carbon::parse($reserva->data_final),
                (int) $reserva->id,
                fn (Agenda $agenda) => $this->autoAprovacao->resolverSituacaoEAvaliador($agenda, $solicitante->id),
            );

            $dataInicial = Carbon::parse($reserva->data_inicial)->toDateString();
            $dataFinal = Carbon::parse($reserva->data_final)->toDateString();

            $datasChecadas = [$dataInicial, $dataFinal, ...$this->datasDasLinhas($linhas)];
            $this->travaDeHorarios->adquirir($agendaIds, min($datasChecadas), max($datasChecadas));

            $this->garantirSemConflito($linhas);

            if ($linhas !== []) {
                $this->reservas->inserirHorarios($linhas);
            }

            // Agenda sem gestor atribuido nao entra na conta.
            $gestores = $agendasUsadas->map(fn (Agenda $agenda) => $agenda->user)->filter()->unique('id')->values();

            $atualizacoes = $this->periodoAmpliado($linhas, $dataInicial, $dataFinal);
            $novaSituacao = $this->autoAprovacao->calcularSituacaoReserva($gestores, $solicitante->id);
            if ($novaSituacao !== null) {
                $atualizacoes['situacao'] = $novaSituacao;
            }
            if ($atualizacoes !== []) {
                $reserva = $this->reservas->update($atualizacoes, $reserva->id);
            }

            Log::info('Reservation created', [
                'reserva_id' => $reserva->id,
                'situacao' => $reserva->situacao,
                'horarios_count' => count($linhas),
            ]);

            return [$reserva, $gestores];
        });
    }

    /**
     * @param  array<int, array<string, mixed>>  $horariosSolicitados
     * @return list<int>
     */
    private function agendaIds(array $horariosSolicitados): array
    {
        $ids = array_map(fn (array $horario): int => is_numeric($horario['agenda_id'] ?? null) ? (int) $horario['agenda_id'] : 0, $horariosSolicitados);

        return array_values(array_unique(array_filter($ids)));
    }

    /**
     * @param  array<int, array<string, mixed>>  $linhas
     * @return list<string>
     */
    private function datasDasLinhas(array $linhas): array
    {
        return array_values(array_map(
            fn (array $linha): string => is_string($linha['data'] ?? null) ? $linha['data'] : '',
            $linhas,
        ));
    }

    /**
     * @param  array<int, array<string, mixed>>  $linhas
     */
    private function garantirSemConflito(array $linhas): void
    {
        $conflito = $this->horarios->conflitosDeferidos($linhas)->first();

        if ($conflito === null) {
            return;
        }

        $linha = $conflito['linha'];

        throw new ConflitoDeHorarioException(
            'Conflito detectado sob lock para agenda '.$linha['agenda_id'].' em '.$linha['data'].'. Outra reserva pode ter sido criada simultaneamente.'
        );
    }

    /**
     * @param  array<int, array<string, mixed>>  $linhas
     * @return array<string, string>
     */
    private function periodoAmpliado(array $linhas, string $dataInicial, string $dataFinal): array
    {
        $datas = $this->datasDasLinhas($linhas);
        $atualizacoes = [];

        $menorData = min([$dataInicial, ...$datas]);
        if ($menorData !== $dataInicial) {
            $atualizacoes['data_inicial'] = $menorData;
        }

        $maiorData = max([$dataFinal, ...$datas]);
        if ($maiorData !== $dataFinal) {
            $atualizacoes['data_final'] = $maiorData;
        }

        return $atualizacoes;
    }
}
