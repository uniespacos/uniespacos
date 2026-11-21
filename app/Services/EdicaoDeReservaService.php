<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\Reserva\EscopoEdicaoEnum;
use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Exceptions\ConflitoDeHorarioException;
use App\Exceptions\EscopoInvalidoException;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Repositories\AgendaRepositoryInterface;
use App\Repositories\HorarioRepositoryInterface;
use App\Support\SlotDeHorario;
use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-type DadosEdicao array{titulo: string, descricao?: string, data_inicial: string, data_final: string, recorrencia: string, edit_scope: string, horarios_solicitados: array<int, array<string, mixed>>, edited_week_date?: string|DateTimeInterface, publico_estimado?: int|null, categoria?: string|null, termo_aceito_em?: string}
 */
class EdicaoDeReservaService
{
    public function __construct(
        private ExpansaoHorariosService $expansao,
        private AutoAprovacaoService $autoAprovacao,
        private TravaDeHorarios $trava,
        private HorarioRepositoryInterface $horarios,
        private AgendaRepositoryInterface $agendas,
    ) {}

    /**
     * Chaves de dados da solicitacao so sao gravadas se presentes, para jobs antigos nao apagarem dado existente.
     *
     * @param  DadosEdicao  $dados
     *
     * @throws EscopoInvalidoException
     * @throws ConflitoDeHorarioException
     */
    public function executar(Reserva $reserva, array $dados): void
    {
        $escopo = EscopoEdicaoEnum::tryFrom($dados['edit_scope'])
            ?? throw new EscopoInvalidoException;

        DB::transaction(function () use ($reserva, $dados, $escopo): void {
            $reserva->update([
                'titulo' => $dados['titulo'],
                'descricao' => $dados['descricao'] ?? '',
                'recorrencia' => $dados['recorrencia'],
                ...$this->dadosDaSolicitacaoPresentes($dados),
            ]);

            match ($escopo) {
                EscopoEdicaoEnum::SINGLE => $this->editarSemana($reserva, $dados),
                EscopoEdicaoEnum::RECURRING => $this->regravarSerie($reserva, $dados),
            };
        });
    }

    /**
     * Escopo single: so a semana de edited_week_date muda. Slots de outras semanas
     * sao ignorados, e a identidade de cada horario e agenda|data|horario_inicio,
     * a mesma do indice unico da tabela.
     *
     * @param  DadosEdicao  $dados
     */
    private function editarSemana(Reserva $reserva, array $dados): void
    {
        $editedWeekDate = $dados['edited_week_date'] ?? null;
        if (! is_string($editedWeekDate) && ! $editedWeekDate instanceof DateTimeInterface) {
            throw new EscopoInvalidoException('edited_week_date deve ser uma string ou data válida');
        }

        $dataReferencia = Carbon::parse($editedWeekDate);
        $inicioSemana = $dataReferencia->copy()->startOfWeek(Carbon::MONDAY)->toDateString();
        $fimSemana = $dataReferencia->copy()->endOfWeek(Carbon::SUNDAY)->toDateString();

        $slotsDaSemana = collect($dados['horarios_solicitados'])
            ->map(fn (array $slot): array => SlotDeHorario::normalizar($slot))
            ->filter(fn (array $slot): bool => $slot['data'] !== '' && $slot['data'] >= $inicioSemana && $slot['data'] <= $fimSemana)
            ->unique(fn (array $slot): string => $this->chave($slot))
            ->values();

        $agendaIds = $slotsDaSemana
            ->map(fn (array $slot): int => $slot['agenda_id'])
            ->unique()
            ->filter()
            ->sort()
            ->values()
            ->all();

        $this->trava->adquirir($agendaIds, $inicioSemana, $fimSemana);

        $chavesSolicitadas = $slotsDaSemana
            ->mapWithKeys(fn (array $slot): array => [$this->chave($slot) => true])
            ->all();

        $chavesAtuais = [];
        foreach ($reserva->horarios()->whereBetween('data', [$inicioSemana, $fimSemana])->get() as $horarioAtual) {
            $chave = $this->chaveDoHorario($horarioAtual);
            $chavesAtuais[$chave] = true;

            if (! isset($chavesSolicitadas[$chave])) {
                $horarioAtual->delete();
            }
        }

        $novosSlots = $slotsDaSemana
            ->reject(fn (array $slot): bool => isset($chavesAtuais[$this->chave($slot)]))
            ->values();

        $this->garantirSemConflito($novosSlots->all(), $reserva);

        $agendasMap = $this->agendas->getWithUserByIds($agendaIds)->keyBy('id');

        foreach ($novosSlots as $slot) {
            $situacao = $this->situacaoDaLinha($slot, $agendasMap, $reserva);

            $reserva->horarios()->create([
                'agenda_id' => $slot['agenda_id'],
                'data' => $slot['data'],
                'horario_inicio' => $slot['horario_inicio'],
                'horario_fim' => $slot['horario_fim'],
                'situacao' => $situacao['situacao'],
                'user_id' => $situacao['user_id'],
            ]);
        }

        $reserva->update([
            'data_inicial' => $reserva->horarios()->min('data') ?? $dados['data_inicial'],
            'data_final' => $reserva->horarios()->max('data') ?? $dados['data_final'],
        ]);
    }

    /**
     * Escopo recurring regrava a serie inteira. Horarios ja deferidos ou indeferidos
     * sao preservados (situacao, justificativa e avaliador): quem tem
     * `reservas.atualizar` chega aqui mesmo com a reserva parcialmente avaliada.
     *
     * @param  DadosEdicao  $dados
     */
    private function regravarSerie(Reserva $reserva, array $dados): void
    {
        $horariosSolicitados = collect($dados['horarios_solicitados']);
        $agendaIds = $horariosSolicitados
            ->map(fn (array $slot): int => SlotDeHorario::normalizar($slot)['agenda_id'])
            ->unique()
            ->filter()
            ->sort()
            ->values()
            ->all();

        $dataInicial = Carbon::parse($dados['data_inicial'])->toDateString();
        $dataFinal = Carbon::parse($dados['data_final'])->toDateString();

        $reserva->update([
            'data_inicial' => $dados['data_inicial'],
            'data_final' => $dados['data_final'],
        ]);

        $agendasMap = $this->agendas->getWithUserByIds($agendaIds)->keyBy('id');

        [$linhas] = $this->expansao->montar(
            $horariosSolicitados->all(),
            $agendasMap,
            (string) $reserva->recorrencia,
            Carbon::parse($reserva->data_final),
            (int) $reserva->id,
            fn (Agenda $agenda): array => $this->autoAprovacao->resolverSituacaoEAvaliador($agenda, (int) $reserva->user_id),
        );

        $datasDasLinhas = array_map(fn (array $linha): string => SlotDeHorario::normalizar($linha)['data'], $linhas);
        $this->trava->adquirir(
            $agendaIds,
            min([$dataInicial, ...$datasDasLinhas]),
            max([$dataFinal, ...$datasDasLinhas]),
        );

        $avaliacoes = $reserva->horarios()
            ->whereIn('situacao', [SituacaoReservaEnum::DEFERIDA->value, SituacaoReservaEnum::INDEFERIDA->value])
            ->get()
            ->keyBy(fn (Horario $horario): string => $this->chaveDoHorario($horario));

        $reserva->horarios()->delete();

        $this->garantirSemConflito($linhas, $reserva);

        foreach ($linhas as $indice => $linha) {
            $anterior = $avaliacoes->get($this->chave(SlotDeHorario::normalizar($linha)));

            if ($anterior !== null) {
                $linhas[$indice]['situacao'] = $anterior->situacao;
                $linhas[$indice]['justificativa'] = $anterior->justificativa;
                $linhas[$indice]['user_id'] = $anterior->user_id;
            }
        }

        if ($linhas !== []) {
            $reserva->horarios()->insert($linhas);
        }
    }

    /**
     * @param  array<array-key, array<string, mixed>>  $linhas
     *
     * @throws ConflitoDeHorarioException
     */
    private function garantirSemConflito(array $linhas, Reserva $reserva): void
    {
        $primeiro = $this->horarios->conflitosDeferidos($linhas, (int) $reserva->id)->first();

        if ($primeiro === null) {
            return;
        }

        $linha = $primeiro['linha'];

        throw new ConflitoDeHorarioException(
            'Conflito detectado sob lock para agenda '.$linha['agenda_id'].' em '.$linha['data'].'. Outra reserva pode ter sido editada simultaneamente.',
        );
    }

    /**
     * Mesma regra do escopo recurring: quem administra a agenda e o dono da reserva,
     * nunca quem edita, decide se o horario ja nasce deferido.
     *
     * @param  array{agenda_id: int, data: string, horario_inicio: string, horario_fim: string}  $slot
     * @param  Collection<array-key, Agenda>  $agendasMap
     * @return array{situacao: string, user_id: ?int}
     */
    private function situacaoDaLinha(array $slot, Collection $agendasMap, Reserva $reserva): array
    {
        $agenda = $agendasMap->get($slot['agenda_id']);

        if (! $agenda instanceof Agenda) {
            return ['situacao' => SituacaoReservaEnum::EM_ANALISE->value, 'user_id' => null];
        }

        return $this->autoAprovacao->resolverSituacaoEAvaliador($agenda, (int) $reserva->user_id);
    }

    /**
     * @param  array<string, mixed>  $dados
     * @return array<string, mixed>
     */
    private function dadosDaSolicitacaoPresentes(array $dados): array
    {
        $atributos = [];

        foreach (['publico_estimado', 'categoria', 'termo_aceito_em'] as $campo) {
            if (array_key_exists($campo, $dados)) {
                $atributos[$campo] = $dados[$campo];
            }
        }

        return $atributos;
    }

    /**
     * @param  array{agenda_id: int, data: string, horario_inicio: string}  $slot
     */
    private function chave(array $slot): string
    {
        return implode('-', [$slot['agenda_id'], $slot['data'], $slot['horario_inicio']]);
    }

    private function chaveDoHorario(Horario $horario): string
    {
        return $this->chave(SlotDeHorario::normalizar([
            'agenda_id' => $horario->agenda_id,
            'data' => (string) $horario->data,
            'horario_inicio' => (string) $horario->horario_inicio,
        ]));
    }
}
