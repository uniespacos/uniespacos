<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Horario;
use App\Support\SlotDeHorario;
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
}
