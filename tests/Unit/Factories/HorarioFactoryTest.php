<?php

declare(strict_types=1);

namespace Tests\Unit\Factories;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class HorarioFactoryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-09-15 12:00:00'));
    }

    /**
     * Test 1: Create 200 horarios without collision or exception.
     * Proves determinism: same number of horarios, same reserva, same agenda.
     */
    #[Test]
    public function it_creates_200_horarios_without_exception_or_collision(): void
    {
        $reserva = Reserva::factory()->create();
        $agenda = Agenda::factory()->create();

        $horarios = Horario::factory()
            ->count(200)
            ->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
            ]);

        $this->assertCount(200, $horarios, 'Factory deve criar 200 horários sem exceção.');

        $uniqueSlots = $horarios
            ->map(fn ($h) => "{$h->reserva_id}:{$h->agenda_id}:{$h->data}:{$h->horario_inicio}")
            ->unique()
            ->count();

        $this->assertSame(200, $uniqueSlots, 'Todas as 200 combinações (reserva_id, agenda_id, data, horario_inicio) devem ser únicas.');
    }

    /**
     * Test 2: horario_fim must be greater than horario_inicio.
     */
    #[Test]
    public function it_ensures_horario_fim_is_greater_than_horario_inicio(): void
    {
        $horarios = Horario::factory()
            ->count(50)
            ->create();

        foreach ($horarios as $horario) {
            $this->assertGreaterThan(
                $horario->horario_inicio,
                $horario->horario_fim,
                "horario_fim deve ser posterior a horario_inicio para o horário {$horario->id}."
            );
        }
    }

    /**
     * Test 3: Horarios must be within a valid time range (00:00:00 to 23:00:00 for inicio).
     */
    #[Test]
    public function it_ensures_horarios_within_valid_time_range(): void
    {
        $horarios = Horario::factory()
            ->count(100)
            ->create();

        $minHour = '00:00:00';
        $maxHourInicio = '23:00:00';
        $maxHourFim = '23:59:59';

        foreach ($horarios as $horario) {
            $this->assertGreaterThanOrEqual(
                $minHour,
                $horario->horario_inicio,
                'horario_inicio deve ser >= 00:00:00'
            );
            $this->assertLessThanOrEqual(
                $maxHourInicio,
                $horario->horario_inicio,
                'horario_inicio deve ser <= 23:00:00'
            );
            $this->assertLessThanOrEqual(
                $maxHourFim,
                $horario->horario_fim,
                'horario_fim deve ser <= 23:59:59'
            );
        }
    }

    /**
     * Test 4: All created dates must be within now() and now() + 1 month (derived from now()).
     */
    #[Test]
    public function it_creates_dates_within_expected_range(): void
    {
        $horarios = Horario::factory()
            ->count(100)
            ->create();

        $baseDate = now();
        $endDate = $baseDate->copy()->addMonth();

        foreach ($horarios as $horario) {
            $horarioDate = CarbonImmutable::parse($horario->data);
            $this->assertGreaterThanOrEqual(
                $baseDate->toDateString(),
                $horarioDate->toDateString(),
                'Data do horário deve estar no futuro ou hoje'
            );
            $this->assertLessThanOrEqual(
                $endDate->toDateString(),
                $horarioDate->toDateString(),
                'Data do horário deve estar dentro de 1 mês'
            );
        }
    }
}
