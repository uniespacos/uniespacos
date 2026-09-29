<?php

declare(strict_types=1);

namespace App\Rules;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
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
        $horario = $this->data['horarios_solicitados'][$index] ?? null;

        if (! is_array($horario)) {
            $fail('Dados de horário inválidos.');

            return;
        }

        $data = $horario['data'] ?? null;
        $agendaId = $horario['agenda_id'] ?? null;
        $horarioFim = $horario['horario_fim'] ?? null;
        $horarioInicio = $horario['horario_inicio'] ?? null;

        if (! is_string($data) || ! is_string($agendaId) || ! is_string($horarioFim) || ! is_string($horarioInicio)) {
            $fail('Dados de horário inválidos.');

            return;
        }

        $query = DB::table('horarios')
            ->where('data', $data)
            ->where('agenda_id', (int) $agendaId)
            ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
            ->where('horario_inicio', '<', $horarioFim)
            ->where('horario_fim', '>', $horarioInicio);

        if ($this->ignorarReservaId !== null) {
            $query->where('reserva_id', '!=', $this->ignorarReservaId);
        }

        $conflict = $query->exists();

        if ($conflict) {
            $fail('O horário selecionado já está reservado ou em análise.');
        }
    }
}
