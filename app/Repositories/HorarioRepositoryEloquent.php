<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Horario;
use App\Support\SlotDeHorario;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

class HorarioRepositoryEloquent implements HorarioRepositoryInterface
{
    public function __construct(
        protected Horario $horario,
    ) {}

    public function conflitosDeferidos(array $linhas, ?int $ignorarReservaId = null): SupportCollection
    {
        $slots = collect($linhas)->map(fn (array $linha): array => SlotDeHorario::normalizar($linha));

        $agendaIds = $slots->pluck('agenda_id')->filter()->unique()->values()->all();
        $datas = $slots->pluck('data')->filter()->unique()->values()->all();

        if ($agendaIds === [] || $datas === []) {
            return collect();
        }

        $query = $this->horario->newQuery()->toBase()
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

    public function bloquearPeriodo(array $agendaIds, string $dataInicial, string $dataFinal): void
    {
        $this->horario->newQuery()
            ->whereIn('agenda_id', $agendaIds)
            ->whereBetween('data', [$dataInicial, $dataFinal])
            ->lockForUpdate()
            ->get(['id']);
    }

    /**
     * Stores a new instance of Horario in the database
     */
    public function store(array $data): Horario
    {
        return $this->horario->create($data);
    }

    /**
     * Returns all instances of Horario from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Horario>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection
    {
        $query = $this->horario->newQuery();

        if ($filters) {
            $query->where($filters);
        }

        return $query->get($columns);
    }

    /**
     * Returns an instance of Horario from the given id
     */
    public function get(int|string $id): ?Horario
    {
        return $this->horario->find($id);
    }

    /**
     * Updates the data of an instance of Horario
     */
    public function update(array $data, int|string $id): Horario
    {
        $horario = $this->horario->findOrFail($id);
        $horario->update($data);

        return $horario;
    }

    /**
     * Removes an instance of Horario from the database
     */
    public function destroy(int|string $id): bool
    {
        return (bool) $this->horario->findOrFail($id)->delete();
    }
}
