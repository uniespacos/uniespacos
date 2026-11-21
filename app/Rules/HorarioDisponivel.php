<?php

declare(strict_types=1);

namespace App\Rules;

use App\Enums\Reserva\EscopoEdicaoEnum;
use App\Enums\Reserva\RecorrenciaReservaEnum;
use App\Repositories\HorarioRepositoryInterface;
use App\Services\ExpansaoHorariosService;
use Carbon\Carbon;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class HorarioDisponivel implements DataAwareRule, ValidationRule
{
    private const DADOS_INVALIDOS = 'Dados de horário inválidos.';

    /**
     * @var array<string, mixed>
     */
    protected array $data = [];

    /**
     * @var array<int|string, array{start: string, end: string, date: string}>|null
     */
    private ?array $conflitosPorSlot = null;

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
        if ($data !== $this->data) {
            $this->data = $data;
            $this->conflitosPorSlot = null;
        }

        return $this;
    }

    /**
     * Checks whether the requested time slot overlaps with any approved (deferida) horario.
     * Todos os slots da requisição são checados numa única consulta, na primeira validação.
     *
     * @param  Closure(string): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $index = explode('.', $attribute)[1];

        if ($this->slotValido($index) === null) {
            $fail(self::DADOS_INVALIDOS);

            return;
        }

        $conflito = $this->conflitosDoLote()[$index] ?? null;

        if ($conflito !== null) {
            $fail('The time slot :start–:end on :date is already reserved.')->translate($conflito);
        }
    }

    /**
     * @return array<int|string, array{start: string, end: string, date: string}>
     */
    private function conflitosDoLote(): array
    {
        if ($this->conflitosPorSlot !== null) {
            return $this->conflitosPorSlot;
        }

        $horariosRaw = $this->horariosSolicitados();
        $linhas = [];
        $origemDaLinha = [];
        $slots = [];

        foreach ($horariosRaw as $index => $horarioRaw) {
            $slot = $this->slotValido($index);

            if ($slot === null || ! is_array($horarioRaw)) {
                continue;
            }

            $slots[$index] = $slot;

            foreach ($this->datasParaVerificar($horarioRaw, $horariosRaw, $slot['data']) as $data) {
                $chave = $index.'|'.$data;
                $linhas[$chave] = [
                    'agenda_id' => $slot['agenda_id'],
                    'data' => $data,
                    'horario_inicio' => $slot['horario_inicio'],
                    'horario_fim' => $slot['horario_fim'],
                ];
                $origemDaLinha[$chave] = $index;
            }
        }

        $conflitos = [];

        if ($linhas !== []) {
            $encontrados = app(HorarioRepositoryInterface::class)->conflitosDeferidos($linhas, $this->ignorarReservaId);

            foreach ($encontrados as $chave => $encontrado) {
                $index = $origemDaLinha[$chave];

                if (isset($conflitos[$index])) {
                    continue;
                }

                $conflitos[$index] = [
                    'start' => substr($slots[$index]['horario_inicio'], 0, 5),
                    'end' => substr($slots[$index]['horario_fim'], 0, 5),
                    'date' => Carbon::parse($encontrado['conflito']['data'])->format('d/m/Y'),
                ];
            }
        }

        return $this->conflitosPorSlot = $conflitos;
    }

    /**
     * @param  array<array-key, mixed>  $horarioRaw
     * @param  array<array-key, mixed>  $horariosRaw
     * @return list<string>
     */
    private function datasParaVerificar(array $horarioRaw, array $horariosRaw, string $data): array
    {
        if (($this->data['edit_scope'] ?? null) === EscopoEdicaoEnum::SINGLE->value) {
            $semanaEditada = $this->semanaEditada();

            if ($semanaEditada !== null && ($data < $semanaEditada[0] || $data > $semanaEditada[1])) {
                return [];
            }

            return [$data];
        }

        $recorrencia = is_string($this->data['recorrencia'] ?? null) ? $this->data['recorrencia'] : RecorrenciaReservaEnum::UNICA->value;
        $dataFinalRaw = is_string($this->data['data_final'] ?? null) ? $this->data['data_final'] : null;

        $datas = app(ExpansaoHorariosService::class)->datasExpandidasParaSlot(
            $horarioRaw,
            $horariosRaw,
            $recorrencia,
            $dataFinalRaw,
        );
        $datas = $datas !== [] ? $datas : [$data];
        sort($datas);

        return $datas;
    }

    /**
     * @return array<array-key, mixed>
     */
    private function horariosSolicitados(): array
    {
        $horariosRaw = $this->data['horarios_solicitados'] ?? [];

        return is_array($horariosRaw) ? $horariosRaw : [];
    }

    /**
     * @return array{data: string, agenda_id: int, horario_inicio: string, horario_fim: string}|null
     */
    private function slotValido(int|string $index): ?array
    {
        $horario = $this->horariosSolicitados()[$index] ?? null;

        if (! is_array($horario)) {
            return null;
        }

        $data = $horario['data'] ?? null;
        $agendaId = $horario['agenda_id'] ?? null;
        $horarioFim = $horario['horario_fim'] ?? null;
        $horarioInicio = $horario['horario_inicio'] ?? null;

        if (! is_string($data) || strtotime($data) === false || (! is_int($agendaId) && ! is_string($agendaId)) || ! is_string($horarioFim) || ! is_string($horarioInicio)) {
            return null;
        }

        return [
            'data' => $data,
            'agenda_id' => is_int($agendaId) ? $agendaId : (int) $agendaId,
            'horario_inicio' => $horarioInicio,
            'horario_fim' => $horarioFim,
        ];
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
