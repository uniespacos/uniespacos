<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Horario>
 */
class HorarioFactory extends Factory
{
    private static int $sequence = 0;

    public static function resetSequence(): void
    {
        self::$sequence = 0;
    }

    /**
     * Define the model's default state.
     *
     * Deterministic: uses a counter to generate sequential times.
     * Each horario gets horario_inicio = N:00:00 and horario_fim = (N+1):00:00.
     * Limits to 23 hours per day (00:00:00 to 23:00:00 for inicio) to ensure fim never exceeds 24:00:00.
     * When counter reaches 23 (end of day), date advances and counter resets.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $baseDate = now()->startOfDay();
        $daysOffset = intdiv(self::$sequence, 23);
        $hourOfDay = self::$sequence % 23;
        self::$sequence++;

        $data = $baseDate->copy()->addDays($daysOffset)->toDateString();
        $horario_inicio = sprintf('%02d:00:00', $hourOfDay);
        $horario_fim = sprintf('%02d:00:00', $hourOfDay + 1);

        return [
            'reserva_id' => Reserva::factory(),
            'agenda_id' => Agenda::factory(),
            'horario_inicio' => $horario_inicio,
            'horario_fim' => $horario_fim,
            'data' => $data,
        ];
    }
}
