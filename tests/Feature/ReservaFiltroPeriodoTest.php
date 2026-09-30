<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReservaFiltroPeriodoTest extends TestCase
{
    /**
     * Test 1: Without date filter, listing returns all reservations.
     */
    #[Test]
    public function it_returns_all_reservations_when_no_date_filter_is_applied(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $today = today();

        // Create 3 reservations on different dates
        $reserva1 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $today->copy()->addDay(),
            'data_final' => $today->copy()->addDay(),
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva1->id,
            'agenda_id' => $agenda->id,
            'data' => $today->copy()->addDay()->format('Y-m-d'),
        ]);

        $reserva2 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $today->copy()->addDays(2),
            'data_final' => $today->copy()->addDays(2),
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva2->id,
            'agenda_id' => $agenda->id,
            'data' => $today->copy()->addDays(2)->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/reservas');

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 2)
        );
    }

    /**
     * Test 2: With single date filter, only returns reservations on that date.
     */
    #[Test]
    public function it_filters_reservations_by_single_date(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $today = today();
        $targetDate = $today->copy()->addDay();

        $reserva1 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $targetDate,
            'data_final' => $targetDate,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva1->id,
            'agenda_id' => $agenda->id,
            'data' => $targetDate->format('Y-m-d'),
        ]);

        $reserva2 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $targetDate->copy()->addDay(),
            'data_final' => $targetDate->copy()->addDay(),
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva2->id,
            'agenda_id' => $agenda->id,
            'data' => $targetDate->copy()->addDay()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/reservas?data_inicio='.$targetDate->format('Y-m-d').'&data_fim='.$targetDate->format('Y-m-d'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 1)
        );
    }

    /**
     * Test 3: Reservation with multiple horarios - only those on the filtered date appear.
     */
    #[Test]
    public function it_only_includes_horarios_matching_the_date_filter(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $today = today();
        $date1 = $today->copy()->addDay();
        $date2 = $date1->copy()->addDay();

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date1,
            'data_final' => $date2,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $date1->format('Y-m-d'),
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $date2->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/reservas', [
            'data_inicio' => $date1->format('Y-m-d'),
            'data_fim' => $date1->format('Y-m-d'),
        ]);

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 1)
        );
    }

    /**
     * Test 4 (Critical for T5.3): Reservation with horario on correct agenda but wrong date does NOT appear.
     *
     * This test proves that the whereBetween is applied INSIDE the same whereHas closure
     * that filters agenda_id. If the whereBetween were in a separate whereHas, this test
     * would incorrectly return the reservation.
     */
    #[Test]
    public function it_does_not_return_reservations_with_horarios_on_wrong_date_even_if_agenda_matches(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $today = today();
        $targetDate = $today->copy()->addDay();
        $otherDate = $targetDate->copy()->addDays(2);

        // Create a reservation with horario on correct agenda but wrong date
        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $otherDate,
            'data_final' => $otherDate,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $otherDate->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/reservas?data_inicio='.$targetDate->format('Y-m-d').'&data_fim='.$targetDate->format('Y-m-d'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 0)
        );
    }

    /**
     * Test 5 (Critical for T5.3 — Gestor Path): Reservation with horario on correct agenda but wrong date does NOT appear in gestor listing.
     *
     * This test covers the getPaginatedForGestor() path and proves that the whereBetween
     * is applied INSIDE the same whereHas closure that filters agenda_id for gestors.
     */
    #[Test]
    public function it_does_not_return_reservations_in_gestor_listing_with_horarios_on_wrong_date_even_if_agenda_matches(): void
    {
        $requestor = User::factory()->create();
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $today = today();
        $targetDate = $today->copy()->addDay();
        $otherDate = $targetDate->copy()->addDays(2);

        // Create agenda managed by gestor
        $agenda = Agenda::factory()->create([
            'user_id' => $gestor->id,
            'turno' => 'manha',
        ]);

        // Create a reservation with horario on correct agenda but wrong date
        $reserva = Reserva::factory()->create([
            'user_id' => $requestor->id,
            'data_inicial' => $otherDate,
            'data_final' => $otherDate,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $otherDate->format('Y-m-d'),
        ]);

        $response = $this->actingAs($gestor)->get('/gestor/reservas?data_inicio='.$targetDate->format('Y-m-d').'&data_fim='.$targetDate->format('Y-m-d'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 0)
        );
    }
}
