<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Tests\TestCase;

/**
 * Diagnostic: the owner must not be able to edit a reservation that left
 * 'em_analise', through the edit page or the update endpoint.
 *
 * ReservaPolicyTest already covers PATCH for the partially evaluated cases; this
 * covers the GET of the edit page and each terminal situacao, which is the route
 * a user actually reaches by clicking "Editar".
 */
class ReservaEdicaoBloqueadaTest extends TestCase
{
    private function criarReserva(User $dono, string $situacao, string $situacaoHorario): Reserva
    {
        $espaco = Espaco::factory()->create();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => User::factory()->create()->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => $situacao,
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => $situacaoHorario,
            'data' => now()->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return $reserva->fresh();
    }

    public function test_owner_cannot_open_edit_page_of_deferida_reservation(): void
    {
        $dono = User::factory()->create();
        $dono->assignRole('comum');
        $reserva = $this->criarReserva($dono, 'deferida', 'deferida');

        $this->actingAs($dono)
            ->get(route('reservas.edit', $reserva->id))
            ->assertForbidden();
    }

    public function test_owner_cannot_open_edit_page_of_indeferida_reservation(): void
    {
        $dono = User::factory()->create();
        $dono->assignRole('comum');
        $reserva = $this->criarReserva($dono, 'indeferida', 'indeferida');

        $this->actingAs($dono)
            ->get(route('reservas.edit', $reserva->id))
            ->assertForbidden();
    }

    public function test_owner_cannot_open_edit_page_of_parcialmente_deferida_reservation(): void
    {
        $dono = User::factory()->create();
        $dono->assignRole('comum');
        $reserva = $this->criarReserva($dono, 'parcialmente_deferida', 'deferida');

        $this->actingAs($dono)
            ->get(route('reservas.edit', $reserva->id))
            ->assertForbidden();
    }

    /**
     * A partial evaluation leaves reserva.situacao as 'em_analise'
     * (AvaliarReservaJob::updateReservaOverallStatus, branch $emAnaliseCount > 0),
     * so the guard here has to be the evaluated-slot check, not the situacao.
     */
    public function test_owner_cannot_edit_when_situacao_is_em_analise_but_a_slot_was_evaluated(): void
    {
        $dono = User::factory()->create();
        $dono->assignRole('comum');
        $reserva = $this->criarReserva($dono, 'em_analise', 'deferida');

        $this->actingAs($dono)
            ->get(route('reservas.edit', $reserva->id))
            ->assertForbidden();
    }

    public function test_owner_can_still_edit_a_fully_pending_reservation(): void
    {
        $dono = User::factory()->create();
        $dono->assignRole('comum');
        $reserva = $this->criarReserva($dono, 'em_analise', 'em_analise');

        $this->actingAs($dono)
            ->get(route('reservas.edit', $reserva->id))
            ->assertOk();
    }

    /**
     * After removing 'reservas.atualizar' from the 'institucional' role,
     * admin can only edit their own reservations in 'em_analise' status.
     */
    public function test_institucional_cannot_edit_evaluated_reservation_of_another_user(): void
    {
        $dono = User::factory()->create();
        $dono->assignRole('comum');
        $institucional = User::factory()->create();
        $institucional->assignRole('institucional');

        $reserva = $this->criarReserva($dono, 'deferida', 'deferida');

        $this->actingAs($institucional)
            ->get(route('reservas.edit', $reserva->id))
            ->assertForbidden();
    }

    public function test_institucional_can_edit_own_pending_reservation(): void
    {
        $institucional = User::factory()->create();
        $institucional->assignRole('institucional');

        $reserva = $this->criarReserva($institucional, 'em_analise', 'em_analise');

        $this->actingAs($institucional)
            ->get(route('reservas.edit', $reserva->id))
            ->assertOk();
    }

    public function test_can_update_flag_is_false_for_an_evaluated_reservation(): void
    {
        $dono = User::factory()->create();
        $dono->assignRole('comum');
        $reserva = $this->criarReserva($dono, 'deferida', 'deferida');

        $this->actingAs($dono)
            ->get(route('reservas.index', ['reserva' => $reserva->id]))
            ->assertInertia(fn ($page) => $page->where('reservaToShow.can_update', false));
    }
}
