<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\ValidateReservationConflictsJob;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class ReservaCancelamentoAdminTest extends TestCase
{
    private function criarReserva(User $dono): Reserva
    {
        $espaco = Espaco::factory()->create();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => User::factory()->create()->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => 'em_analise',
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => now()->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return $reserva->fresh();
    }

    public function test_admin_cannot_cancel_reservation_of_another_user(): void
    {
        $dono = User::factory()->create();
        $dono->assignRole('comum');
        $admin = User::factory()->create();
        $admin->assignRole('institucional');

        $reserva = $this->criarReserva($dono);

        $this->actingAs($admin)
            ->delete(route('reservas.destroy', $reserva), [
                'password' => 'password',
            ])
            ->assertForbidden();
    }

    public function test_admin_can_cancel_own_reservation(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('institucional');

        $reserva = $this->criarReserva($admin);

        $this->actingAs($admin)
            ->delete(route('reservas.destroy', $reserva), [
                'password' => 'password',
            ])
            ->assertRedirect();
    }

    public function test_owner_can_cancel_own_reservation(): void
    {
        $dono = User::factory()->create();
        $dono->assignRole('comum');

        $reserva = $this->criarReserva($dono);

        $this->actingAs($dono)
            ->delete(route('reservas.destroy', $reserva), [
                'password' => 'password',
            ])
            ->assertRedirect();
    }

    public function test_cancelamento_revalida_reservas_indeferidas_que_compartilham_slot(): void
    {
        Bus::fake();

        // Arrange
        $dono_a = User::factory()->create();
        $dono_a->assignRole('comum');
        $dono_b = User::factory()->create();
        $gestor = User::factory()->create();

        $espaco = Espaco::factory()->create();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
        ]);

        // Reserva A (será cancelada, deferida)
        $reservaA = Reserva::factory()->create([
            'user_id' => $dono_a->id,
            'situacao' => 'deferida',
        ]);
        $horarioA = Horario::factory()->create([
            'reserva_id' => $reservaA->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => now()->toDateString(),
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        // Reserva B (indeferida por conflito com A)
        $reservaB = Reserva::factory()->create([
            'user_id' => $dono_b->id,
            'situacao' => 'indeferida',
            'validation_status' => 'completed',
        ]);
        Horario::factory()->create([
            'reserva_id' => $reservaB->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'indeferida',
            'data' => $horarioA->data,
            'horario_inicio' => $horarioA->horario_inicio,
            'horario_fim' => $horarioA->horario_fim,
            'justificativa' => 'Conflito com a reserva A',
        ]);

        // Act: Cancelar A como dono
        $this->actingAs($dono_a)
            ->delete(route('reservas.destroy', $reservaA), ['password' => 'password']);

        // Assert: Reserva A inativada
        $this->assertDatabaseHas('reservas', [
            'id' => $reservaA->id,
            'situacao' => 'inativa',
        ]);

        // ValidateReservationConflictsJob deve ter sido despachado para B
        Bus::assertDispatched(ValidateReservationConflictsJob::class, function ($job) use ($reservaB) {
            return $job->reserva->id === $reservaB->id;
        });
    }
}
