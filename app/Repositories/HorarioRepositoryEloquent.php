<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Horario;
use App\Support\SlotDeHorario;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection as SupportCollection;

/**
 * @extends BaseRepositoryEloquent<Horario>
 */
class HorarioRepositoryEloquent extends BaseRepositoryEloquent implements HorarioRepositoryInterface
{
    public function __construct(Horario $horario)
    {
        parent::__construct($horario);
    }

    public function conflitosDeferidos(array $linhas, ?int $ignorarReservaId = null): SupportCollection
    {
        $slots = collect($linhas)->map(fn (array $linha): array => SlotDeHorario::normalizar($linha));

        $agendaIds = $slots->pluck('agenda_id')->filter()->unique()->values()->all();
        $datas = $slots->pluck('data')->filter()->unique()->values()->all();

        if ($agendaIds === [] || $datas === []) {
            return collect();
        }

        $query = $this->model->newQuery()->toBase()
            ->join('reservas', 'reservas.id', '=', 'horarios.reserva_id')
            ->whereIn('horarios.agenda_id', $agendaIds)
            ->whereIn('horarios.data', $datas)
            ->where('horarios.situacao', SituacaoReservaEnum::DEFERIDA->value);

        if ($ignorarReservaId !== null) {
            $query->where('horarios.reserva_id', '!=', $ignorarReservaId);
        }

        $candidatos = $query
            ->orderBy('horarios.data')
            ->orderBy('horarios.horario_inicio')
            ->get([
                'horarios.agenda_id',
                'horarios.reserva_id',
                'horarios.data',
                'horarios.horario_inicio',
                'horarios.horario_fim',
                'reservas.titulo',
            ]);

        $porAgendaEData = [];
        foreach ($candidatos as $candidato) {
            $porAgendaEData[(int) $candidato->agenda_id.'|'.(string) $candidato->data][] = [
                'reserva_id' => (int) $candidato->reserva_id,
                'reserva_titulo' => (string) $candidato->titulo,
                'data' => (string) $candidato->data,
                'horario_inicio' => (string) $candidato->horario_inicio,
                'horario_fim' => (string) $candidato->horario_fim,
            ];
        }

        $conflitos = collect();
        foreach ($slots as $indice => $slot) {
            $primeiro = collect($porAgendaEData[$slot['agenda_id'].'|'.$slot['data']] ?? [])
                ->first(fn (array $existente): bool => $existente['horario_inicio'] < $slot['horario_fim']
                    && $existente['horario_fim'] > $slot['horario_inicio']);

            if ($primeiro !== null) {
                $conflitos->put($indice, ['linha' => $slot, 'conflito' => $primeiro]);
            }
        }

        return $conflitos;
    }

    public function linhasDaReserva(int $reservaId): SupportCollection
    {
        return $this->model->newQuery()->toBase()
            ->where('reserva_id', $reservaId)
            ->get(['id', 'agenda_id', 'data', 'horario_inicio', 'horario_fim'])
            ->mapWithKeys(fn (\stdClass $horario): array => [(int) $horario->id => [
                'agenda_id' => (int) $horario->agenda_id,
                'data' => (string) $horario->data,
                'horario_inicio' => (string) $horario->horario_inicio,
                'horario_fim' => (string) $horario->horario_fim,
            ]]);
    }

    public function atualizarDaReservaEmLote(array $horarioIds, int $reservaId, array $agendaIds, array $atributos): int
    {
        return $this->model->newQuery()
            ->whereIn('id', $horarioIds)
            ->where('reserva_id', $reservaId)
            ->whereIn('agenda_id', $agendaIds)
            ->update($atributos);
    }

    public function bloquearPeriodo(array $agendaIds, string $dataInicial, string $dataFinal): void
    {
        $this->model->newQuery()
            ->whereIn('agenda_id', $agendaIds)
            ->whereBetween('data', [$dataInicial, $dataFinal])
            ->lockForUpdate()
            ->get(['id']);
    }

    /**
     * @param  array<mixed>|null  $agendaIds
     * @param  array<mixed>|null  $turnos
     * @return SupportCollection<array-key, int>
     */
    public function contarSlotsOcupadosPorEspaco(CarbonInterface $inicio, CarbonInterface $fim, ?array $agendaIds, ?int $instituicaoId, ?array $turnos): SupportCollection
    {
        $query = $this->model->newQuery()
            ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
            ->whereBetween('data', [$inicio, $fim]);

        if ($agendaIds !== null) {
            $query->whereIn('agenda_id', $agendaIds);
        }

        if ($instituicaoId !== null && $agendaIds === null) {
            $query->whereHas('agenda.espaco.andar.modulo.unidade', fn ($u) => $u->where('instituicao_id', $instituicaoId));
        }

        if ($turnos !== null) {
            $query->whereHas('agenda', fn ($q) => $q->whereIn('turno', $turnos));
        }

        return $query
            ->join('agendas', 'horarios.agenda_id', '=', 'agendas.id')
            ->groupBy('agendas.espaco_id')
            ->selectRaw('agendas.espaco_id as espaco_id, count(distinct (horarios.data, horarios.horario_inicio)) as total')
            ->pluck('total', 'espaco_id')
            ->map(fn (mixed $total): int => is_numeric($total) ? (int) $total : 0);
    }

    /**
     * @return array<int, array{nome: string|null, count: int}>
     */
    public function rankingEspacosMaisOcupados(?int $instituicaoId, int $limite): array
    {
        return $this->model->newQuery()
            ->where('horarios.situacao', SituacaoReservaEnum::DEFERIDA->value)
            ->whereHas('agenda.espaco.andar.modulo.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->join('agendas', 'horarios.agenda_id', '=', 'agendas.id')
            ->join('espacos', 'agendas.espaco_id', '=', 'espacos.id')
            ->groupBy('espacos.id', 'espacos.nome')
            ->selectRaw('espacos.nome as nome, count(*) as count')
            ->orderByDesc('count')
            ->limit($limite)
            ->get()
            ->map(function (Horario $linha): array {
                $nome = $linha->getAttribute('nome');
                $total = $linha->getAttribute('count');

                return [
                    'nome' => is_string($nome) ? $nome : null,
                    'count' => is_numeric($total) ? (int) $total : 0,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<int>  $agendaIds
     * @return SupportCollection<int|string, mixed>
     */
    public function idsDaReservaNasAgendas(int $reservaId, array $agendaIds): SupportCollection
    {
        return $this->model->newQuery()
            ->where('reserva_id', $reservaId)
            ->whereIn('agenda_id', $agendaIds)
            ->pluck('id');
    }

    /**
     * @param  array<int>  $horarioIds
     * @param  array<int>  $agendaIds
     */
    public function existeForaDasAgendas(array $horarioIds, array $agendaIds): bool
    {
        return $this->model->newQuery()
            ->whereIn('id', $horarioIds)
            ->whereNotIn('agenda_id', $agendaIds)
            ->exists();
    }
}
