<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CongelaRelogio;
use Tests\TestCase;

class ReservaPolicyTest extends TestCase
{
    use CongelaRelogio;

    // use DatabaseTransactions; // Removed as it is now in TestCase

    public function test_user_cannot_edit_reservation_if_partially_evaluated()
    {
        // Arrange
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'situacao' => 'em_analise',
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
        ]);

        // Slot 1: Evaluated (Deferida)
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => now()->toDateString(),
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        // Slot 2: Pending (Em analise)
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => now()->toDateString(),
            'horario_inicio' => '11:00:00',
            'horario_fim' => '12:00:00',
        ]);

        // Act & Assert
        // We need to provide minimal valid data to pass validation
        $response = $this->actingAs($user)
            ->patch(route('reservas.update', $reserva), [
                'titulo' => 'Updated Title',
                'data_inicial' => now()->toDateString(),
                'data_final' => now()->toDateString(),
                'recorrencia' => 'unica',
                'edit_scope' => 'single',
                'edited_week_date' => now()->toDateString(),
                'horarios_solicitados' => [
                    [
                        'data' => now()->toDateString(),
                        'horario_inicio' => '11:00:00',
                        'horario_fim' => '12:00:00',
                        'agenda_id' => $agenda->id,
                    ],
                ],
                // Add other required fields from StoreReservaRequest rules if any
                'descricao' => 'Updated Description', // Assuming required?
            ]);

        // We expect 403 Forbidden
        $response->assertForbidden();
    }

    public function test_user_cannot_edit_reservation_if_status_is_parcialmente_deferida()
    {
        // Arrange
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $otherUser->id]); // Different user
        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'situacao' => 'parcialmente_deferida', // Directly set status
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
        ]);

        // Even without slots, the status alone should block it.
        // But let's add slots to be realistic
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
        ]);

        $response = $this->actingAs($user)
            ->patch(route('reservas.update', $reserva), [
                'titulo' => 'Updated Title',
                'data_inicial' => now()->toDateString(),
                'data_final' => now()->toDateString(),
                'recorrencia' => 'unica',
                'edit_scope' => 'single',
                'edited_week_date' => now()->toDateString(),
                'horarios_solicitados' => [
                    [
                        'data' => now()->toDateString(),
                        'horario_inicio' => '11:00:00',
                        'horario_fim' => '12:00:00',
                        'agenda_id' => $agenda->id,
                    ],
                ],
                'descricao' => 'Updated Description',
            ]);

        $response->assertForbidden();
    }

    public function test_gestor_cannot_edit_details_of_own_reservation_if_partially_evaluated()
    {
        // Arrange: User with gestor role owns the agenda
        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]); // Gestor owns agenda

        $reserva = Reserva::factory()->create([
            'user_id' => $gestor->id, // Gestor made the reservation
            'situacao' => 'parcialmente_deferida',
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
        ]);

        // Act
        $response = $this->actingAs($gestor)
            ->patch(route('reservas.update', $reserva), [
                'titulo' => 'Updated Title',
                'data_inicial' => now()->toDateString(),
                'data_final' => now()->toDateString(),
                'recorrencia' => 'unica',
                'edit_scope' => 'single',
                'edited_week_date' => now()->toDateString(),
                'horarios_solicitados' => [
                    [
                        'data' => now()->toDateString(),
                        'horario_inicio' => '11:00:00',
                        'horario_fim' => '12:00:00',
                        'agenda_id' => $agenda->id,
                    ],
                ],
                'descricao' => 'Updated Description',
            ]);

        // Assert: Should be forbidden now that Rule 2 is removed.
        $response->assertForbidden();
    }
}
