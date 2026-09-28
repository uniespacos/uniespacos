<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class FixReservaDatasCommandTest extends TestCase
{
    use DatabaseTransactions;

    private Reserva $reserva;

    private Agenda $agenda;

    protected function setUp(): void
    {
        parent::setUp();

        $this->agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);
        $this->reserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);
    }

    private function criarHorario(string $data, string $inicio = '08:00:00'): Horario
    {
        return Horario::factory()->create([
            'reserva_id' => $this->reserva->id,
            'agenda_id' => $this->agenda->id,
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => '10:00:00',
        ]);
    }

    public function test_dry_run_nao_altera_dados(): void
    {
        $dataInicial = '2026-09-01';
        $dataFinal = '2026-09-01';

        $this->reserva->update([
            'data_inicial' => $dataInicial,
            'data_final' => $dataFinal,
        ]);

        $this->criarHorario('2026-09-01');
        $this->criarHorario('2026-09-05');
        $this->criarHorario('2026-09-10');

        $this->artisan('reservas:fix-datas-periodo', ['--dry-run' => true])
            ->assertSuccessful();

        $atualizada = $this->reserva->fresh();
        $this->assertStringStartsWith($dataInicial, (string) $atualizada->data_inicial);
        $this->assertStringStartsWith($dataFinal, (string) $atualizada->data_final);
    }

    public function test_force_flag_corrige_reservas_divergentes(): void
    {
        $this->reserva->update([
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-01',
        ]);

        $this->criarHorario('2026-09-01');
        $this->criarHorario('2026-09-05');
        $this->criarHorario('2026-09-10');

        $this->artisan('reservas:fix-datas-periodo', ['--force' => true])
            ->assertSuccessful();

        $atualizada = $this->reserva->fresh();
        $this->assertStringStartsWith('2026-09-01', (string) $atualizada->data_inicial);
        $this->assertStringStartsWith('2026-09-10', (string) $atualizada->data_final);
    }

    public function test_nao_altera_reservas_ja_corrigidas(): void
    {
        $corrigida = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-10',
        ]);

        Horario::factory()->create([
            'reserva_id' => $corrigida->id,
            'agenda_id' => $this->agenda->id,
            'data' => '2026-09-01',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        Horario::factory()->create([
            'reserva_id' => $corrigida->id,
            'agenda_id' => $this->agenda->id,
            'data' => '2026-09-10',
            'horario_inicio' => '14:00:00',
            'horario_fim' => '16:00:00',
        ]);

        $this->reserva->update([
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-01',
        ]);

        $this->criarHorario('2026-09-01');
        $this->criarHorario('2026-09-05');

        $this->artisan('reservas:fix-datas-periodo', ['--force' => true])
            ->assertSuccessful();

        $corrigidaAtualizada = $corrigida->fresh();
        $this->assertStringStartsWith('2026-09-01', (string) $corrigidaAtualizada->data_inicial);
        $this->assertStringStartsWith('2026-09-10', (string) $corrigidaAtualizada->data_final);
    }

    public function test_processa_em_lotes_de_1000(): void
    {
        $user = User::factory()->create();
        $reservasIds = [];

        for ($i = 0; $i < 5; $i++) {
            $reserva = Reserva::factory()->create([
                'user_id' => $user->id,
                'data_inicial' => '2026-09-01',
                'data_final' => '2026-09-01',
            ]);
            $reservasIds[] = $reserva->id;

            Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $this->agenda->id,
                'data' => '2026-09-01',
            ]);

            Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $this->agenda->id,
                'data' => '2026-09-10',
            ]);
        }

        $this->artisan('reservas:fix-datas-periodo', ['--force' => true])
            ->assertSuccessful();

        foreach ($reservasIds as $id) {
            $reserva = Reserva::find($id);
            $this->assertStringStartsWith('2026-09-01', (string) $reserva->data_inicial);
            $this->assertStringStartsWith('2026-09-10', (string) $reserva->data_final);
        }
    }

    public function test_sem_divergencias_nao_altera_nada(): void
    {
        $outroReserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-05',
        ]);

        Horario::factory()->create([
            'reserva_id' => $outroReserva->id,
            'agenda_id' => $this->agenda->id,
            'data' => '2026-09-01',
        ]);

        Horario::factory()->create([
            'reserva_id' => $outroReserva->id,
            'agenda_id' => $this->agenda->id,
            'data' => '2026-09-05',
        ]);

        $this->reserva->update([
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-01',
        ]);

        $this->criarHorario('2026-09-01');
        $this->criarHorario('2026-09-05');

        $this->artisan('reservas:fix-datas-periodo', ['--force' => true])
            ->assertSuccessful();

        $outroAtualizado = $outroReserva->fresh();
        $this->assertStringStartsWith('2026-09-01', (string) $outroAtualizado->data_inicial);
        $this->assertStringStartsWith('2026-09-05', (string) $outroAtualizado->data_final);
    }
}
