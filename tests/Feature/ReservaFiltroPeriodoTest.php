<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReservaFiltroPeriodoTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-09-15 12:00:00'));
    }

    /**
     * Test 1: Without date filter, listing returns all reservations.
     */
    #[Test]
    public function it_returns_all_reservations_when_no_date_filter_is_applied(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $today = now()->toDateString();

        $date1 = now()->addDay()->toDateString();
        $date2 = now()->addDays(2)->toDateString();

        $reserva1 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date1,
            'data_final' => $date1,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva1->id,
            'agenda_id' => $agenda->id,
            'data' => $date1,
            'horario_inicio' => '08:00',
            'horario_fim' => '09:00',
        ]);

        $reserva2 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date2,
            'data_final' => $date2,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva2->id,
            'agenda_id' => $agenda->id,
            'data' => $date2,
            'horario_inicio' => '10:00',
            'horario_fim' => '11:00',
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
        $targetDate = now()->addDay()->toDateString();

        $otherDate = now()->addDays(2)->toDateString();

        $reserva1 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $targetDate,
            'data_final' => $targetDate,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva1->id,
            'agenda_id' => $agenda->id,
            'data' => $targetDate,
            'horario_inicio' => '08:00',
            'horario_fim' => '09:00',
        ]);

        $reserva2 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $otherDate,
            'data_final' => $otherDate,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva2->id,
            'agenda_id' => $agenda->id,
            'data' => $otherDate,
            'horario_inicio' => '10:00',
            'horario_fim' => '11:00',
        ]);

        $response = $this->actingAs($user)->get('/reservas?data_inicio='.$targetDate.'&data_fim='.$targetDate);

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 1)
        );
    }

    /**
     * Test 3: Reservation with multiple horarios - returns reservation and all its horarios (no filtering at eager load level).
     * Characterization: the repository filters via whereHas on the pivot relationship, but the eager load of horarios
     * does NOT filter by date (per DT-09 design). Thus the reservation appears when at least one horario matches,
     * but ALL horarios are returned.
     */
    #[Test]
    public function it_returns_the_reservation_with_all_its_horarios_when_one_matches_the_date(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $date1 = now()->addDay()->toDateString();
        $date2 = now()->addDays(2)->toDateString();

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date1,
            'data_final' => $date2,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $date1,
            'horario_inicio' => '08:00',
            'horario_fim' => '09:00',
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $date2,
            'horario_inicio' => '10:00',
            'horario_fim' => '11:00',
        ]);

        $response = $this->actingAs($user)->get('/reservas?data_inicio='.$date1.'&data_fim='.$date1);

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 1)
            ->where('reservas.data.0.id', $reserva->id)
            ->has('reservas.data.0.horarios', 2)
            ->where('reservas.data.0.horarios.0.data', $date1)
            ->where('reservas.data.0.horarios.1.data', $date2)
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
        $targetDate = now()->addDay()->toDateString();
        $otherDate = now()->addDays(2)->toDateString();

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $otherDate,
            'data_final' => $otherDate,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $otherDate,
        ]);

        $response = $this->actingAs($user)->get('/reservas?data_inicio='.$targetDate.'&data_fim='.$targetDate);

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
        $targetDate = now()->addDay()->toDateString();
        $otherDate = now()->addDays(2)->toDateString();

        // Create agenda managed by gestor
        $agenda = Agenda::factory()->create([
            'user_id' => $gestor->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $requestor->id,
            'data_inicial' => $otherDate,
            'data_final' => $otherDate,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $otherDate,
            'horario_inicio' => '10:00',
            'horario_fim' => '11:00',
        ]);

        $response = $this->actingAs($gestor)->get('/gestor/reservas?data_inicio='.$targetDate.'&data_fim='.$targetDate);

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 0)
        );
    }

    /**
     * Test 6: data_fim isolated without data_inicio is ignored.
     * Contract: filter requires both data_inicio AND data_fim; without both, no filter is applied.
     */
    #[Test]
    public function it_ignores_data_fim_isolated_without_data_inicio(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $date1 = now()->addDay()->toDateString();
        $date2 = now()->addDays(2)->toDateString();

        $reserva1 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date1,
            'data_final' => $date1,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva1->id,
            'agenda_id' => $agenda->id,
            'data' => $date1,
            'horario_inicio' => '08:00',
            'horario_fim' => '09:00',
        ]);

        $reserva2 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date2,
            'data_final' => $date2,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva2->id,
            'agenda_id' => $agenda->id,
            'data' => $date2,
            'horario_inicio' => '10:00',
            'horario_fim' => '11:00',
        ]);

        $response = $this->actingAs($user)->get('/reservas?data_fim='.$date2);

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 2)
        );
    }

    /**
     * Test 7: User listing with filter applied on user scope (getPaginatedForUser).
     */
    #[Test]
    public function it_filters_with_single_day_period_in_user_listing(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $date1 = now()->addDay()->toDateString();
        $date2 = now()->addDays(2)->toDateString();

        $reserva1 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date1,
            'data_final' => $date1,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva1->id,
            'agenda_id' => $agenda->id,
            'data' => $date1,
            'horario_inicio' => '08:00',
            'horario_fim' => '09:00',
        ]);

        $reserva2 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date2,
            'data_final' => $date2,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva2->id,
            'agenda_id' => $agenda->id,
            'data' => $date2,
            'horario_inicio' => '10:00',
            'horario_fim' => '11:00',
        ]);

        $response = $this->actingAs($user)->get('/reservas?data_inicio='.$date1.'&data_fim='.$date1);

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 1)
            ->where('reservas.data.0.id', $reserva1->id)
        );
    }

    /**
     * Test 8: Gestor listing with multi-agenda access filters correctly by date.
     */
    #[Test]
    public function it_filters_by_date_in_gestor_listing_with_multiple_agendas(): void
    {
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $agenda1 = Agenda::factory()->create(['user_id' => $gestor->id]);
        $agenda2 = Agenda::factory()->create(['user_id' => $gestor->id]);

        $date1 = now()->addDay()->toDateString();
        $date2 = now()->addDays(2)->toDateString();

        $reserva1 = Reserva::factory()->create([
            'user_id' => $user1->id,
            'data_inicial' => $date1,
            'data_final' => $date1,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva1->id,
            'agenda_id' => $agenda1->id,
            'data' => $date1,
            'horario_inicio' => '08:00',
            'horario_fim' => '09:00',
        ]);

        $reserva2 = Reserva::factory()->create([
            'user_id' => $user2->id,
            'data_inicial' => $date2,
            'data_final' => $date2,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva2->id,
            'agenda_id' => $agenda2->id,
            'data' => $date2,
            'horario_inicio' => '10:00',
            'horario_fim' => '11:00',
        ]);

        $response = $this->actingAs($gestor)->get('/gestor/reservas?data_inicio='.$date1.'&data_fim='.$date1);

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 1)
            ->where('reservas.data.0.id', $reserva1->id)
        );
    }

    /**
     * Test 9: Invalid date format (YYYY/MM/DD instead of YYYY-MM-DD) is ignored silently.
     * The filter is not applied; listing returns all user reservations.
     */
    #[Test]
    public function it_ignores_data_inicio_with_invalid_format(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $date1 = now()->addDay()->toDateString();
        $date2 = now()->addDays(2)->toDateString();

        $reserva1 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date1,
            'data_final' => $date1,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva1->id,
            'agenda_id' => $agenda->id,
            'data' => $date1,
        ]);

        $reserva2 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date2,
            'data_final' => $date2,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva2->id,
            'agenda_id' => $agenda->id,
            'data' => $date2,
        ]);

        $response = $this->actingAs($user)->get('/reservas?data_inicio=15/09/2026&data_fim=15/09/2026');

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 2)
        );
    }

    /**
     * Test 10: Non-existent date (e.g., Feb 30) is ignored silently.
     * The filter is not applied; listing returns all user reservations.
     */
    #[Test]
    public function it_ignores_data_inicio_with_non_existent_date(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();
        $date1 = now()->addDay()->toDateString();
        $date2 = now()->addDays(2)->toDateString();

        $reserva1 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date1,
            'data_final' => $date1,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva1->id,
            'agenda_id' => $agenda->id,
            'data' => $date1,
        ]);

        $reserva2 = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $date2,
            'data_final' => $date2,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva2->id,
            'agenda_id' => $agenda->id,
            'data' => $date2,
        ]);

        $response = $this->actingAs($user)->get('/reservas?data_inicio=2026-02-30&data_fim=2026-02-30');

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('reservas.data', 2)
        );
    }
}
