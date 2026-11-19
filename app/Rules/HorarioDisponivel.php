<?php

declare(strict_types=1);

namespace App\Rules;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Services\ExpansaoHorariosService;
use Carbon\Carbon;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;
use Illuminate\Translation\PotentiallyTranslatedString;

class HorarioDisponivel implements DataAwareRule, ValidationRule
{
    /**
     * @var array<string, mixed>
     */
    protected array $data = [];

    /**
     * Optional reservation ID to exclude from conflict check.
     * Used when validating edits to prevent false positives against the reservation's own horarios.
     */
    public function __construct(private ?int $ignorarReservaId = null) {}

    /**
     * Sets the full request data, called by Laravel before validation runs.
     *
     * @param  array<string, mixed>  $data
     */
    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    /**
     * Run the validation rule.
     * Checks whether the requested time slot overlaps with any approved (deferida) horarios.
     *
     * @param  Closure(string): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $index = explode('.', $attribute)[1];
        $horariosRaw = $this->data['horarios_solicitados'] ?? [];

        if (! is_array($horariosRaw)) {
            $fail('Dados de horário inválidos.');

            return;
        }

        $horario = $horariosRaw[$index] ?? null;

        if (! is_array($horario)) {
            $fail('Dados de horário inválidos.');

            return;
        }

        $data = $horario['data'] ?? null;
        $agendaId = $horario['agenda_id'] ?? null;
        $horarioFim = $horario['horario_fim'] ?? null;
        $horarioInicio = $horario['horario_inicio'] ?? null;

        if (! is_string($data) || (! is_int($agendaId) && ! is_string($agendaId)) || ! is_string($horarioFim) || ! is_string($horarioInicio)) {
            $fail('Dados de horário inválidos.');

            return;
        }

        $agendaIdInt = is_int($agendaId) ? $agendaId : (int) $agendaId;
        $recorrencia = is_string($this->data['recorrencia'] ?? null) ? $this->data['recorrencia'] : 'unica';
        $editScope = is_string($this->data['edit_scope'] ?? null) ? $this->data['edit_scope'] : null;
        $dataFinalRaw = is_string($this->data['data_final'] ?? null) ? $this->data['data_final'] : null;

        if ($editScope === 'single') {
            $semanaEditada = $this->semanaEditada();

            if ($semanaEditada !== null && ($data < $semanaEditada[0] || $data > $semanaEditada[1])) {
                return;
            }

            $datasParaVerificar = [$data];
        } else {
            $datasExpandidas = app(ExpansaoHorariosService::class)->datasExpandidasParaSlot(
                $horario,
                $horariosRaw,
                $recorrencia,
                $dataFinalRaw,
            );
            $datasParaVerificar = $datasExpandidas !== [] ? $datasExpandidas : [$data];
        }

        $query = DB::table('horarios')
            ->whereIn('data', $datasParaVerificar)
            ->where('agenda_id', $agendaIdInt)
            ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
            ->where('horario_inicio', '<', $horarioFim)
            ->where('horario_fim', '>', $horarioInicio);

        if ($this->ignorarReservaId !== null) {
            $query->where('reserva_id', '!=', $this->ignorarReservaId);
        }

        $conflito = $query
            ->orderBy('data')
            ->orderBy('horario_inicio')
            ->first(['data', 'horario_inicio', 'horario_fim']);

        if ($conflito !== null) {
            $fail('The time slot :start–:end on :date is already reserved.')->translate([
                'start' => substr($horarioInicio, 0, 5),
                'end' => substr($horarioFim, 0, 5),
                'date' => Carbon::parse((string) $conflito->data)->format('d/m/Y'),
            ]);
        }
    }

    /**
     * @return array{string, string}|null
     */
    private function semanaEditada(): ?array
    {
        $editedWeekDate = $this->data['edited_week_date'] ?? null;

        if (! is_string($editedWeekDate) || strtotime($editedWeekDate) === false) {
            return null;
        }

        $referencia = Carbon::parse($editedWeekDate);

        return [
            $referencia->copy()->startOfWeek(Carbon::MONDAY)->toDateString(),
            $referencia->copy()->endOfWeek(Carbon::SUNDAY)->toDateString(),
        ];
    }
}
