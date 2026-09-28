<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Carbon\Carbon;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Regression guard for issue #222 (notification link opens the wrong week).
 *
 * ReservaController::show redirected to reservas.index without a 'semana'
 * parameter, so the listing fell back to 'today' and the detail modal opened on
 * the current week — empty whenever the reservation belongs to another period.
 *
 * The reservations here are deliberately placed OUTSIDE the current week: that
 * gap between "today" and the reservation's real period is precisely what the
 * bug was hiding.
 */
class ReservaSemanaNotificacaoTest extends TestCase
{
    /**
     * Builds a reservation whose slots sit a given number of weeks away from today.
     *
     * @param  int  $semanasNoFuturo  distance from the current week; must be non-zero
     *                                for the negative cases to be meaningful
     */
    private function criarReservaEm(User $dono, User $gestorDaAgenda, int $semanasNoFuturo): Reserva
    {
        $dataDoSlot = Carbon::today()->addWeeks($semanasNoFuturo)->startOfWeek(Carbon::MONDAY);

        $espaco = Espaco::factory()->create();

        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestorDaAgenda->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => 'em_analise',
            'data_inicial' => $dataDoSlot->toDateString(),
            'data_final' => $dataDoSlot->copy()->addDays(2)->toDateString(),
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => $dataDoSlot->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return $reserva->fresh();
    }

    public function test_show_redirects_with_the_week_of_the_reservation(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();

        $reserva = $this->criarReservaEm($dono, $gestor, 4);
        $dataEsperada = Carbon::today()->addWeeks(4)->startOfWeek(Carbon::MONDAY)->toDateString();

        $response = $this->actingAs($dono)->get(route('reservas.show', $reserva->id));

        $response->assertRedirect(route('reservas.index', [
            'reserva' => $reserva->id,
            'semana' => $dataEsperada,
        ]));
    }

    /**
     * The user-visible symptom: following the notification link must land on a
     * modal that actually has the slots, not an empty calendar.
     */
    public function test_following_the_show_redirect_returns_the_reservation_slots(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();

        $reserva = $this->criarReservaEm($dono, $gestor, 4);

        $response = $this->actingAs($dono)
            ->followingRedirects()
            ->get(route('reservas.show', $reserva->id));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('reservaToShow.id', $reserva->id)
            ->has('reservaToShow.horarios', 1)
        );
    }

    /**
     * ReservasDetalhes.tsx seeds the visible week from props.semana.referencia,
     * so this is the value that decides which week the modal opens on.
     */
    public function test_week_reference_points_to_the_reservation_not_today(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();

        $reserva = $this->criarReservaEm($dono, $gestor, 4);
        $dataEsperada = Carbon::today()->addWeeks(4)->startOfWeek(Carbon::MONDAY)->toDateString();

        $response = $this->actingAs($dono)
            ->followingRedirects()
            ->get(route('reservas.show', $reserva->id));

        $response->assertInertia(fn (AssertableInertia $page) => $page->where('semana.referencia', $dataEsperada));
    }

    public function test_reservation_without_slots_falls_back_to_data_inicial(): void
    {
        $dono = User::factory()->create();
        $dataInicial = Carbon::today()->addWeeks(3)->startOfWeek(Carbon::MONDAY);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => 'em_analise',
            'data_inicial' => $dataInicial->toDateString(),
            'data_final' => $dataInicial->copy()->addDays(2)->toDateString(),
            'recorrencia' => 'unica',
        ]);

        $response = $this->actingAs($dono)->get(route('reservas.show', $reserva->id));

        $response->assertRedirect(route('reservas.index', [
            'reserva' => $reserva->id,
            'semana' => $dataInicial->toDateString(),
        ]));
    }

    /**
     * Pins the choice of "first horario" over "data_inicial".
     *
     * Editing a single occurrence rewrites data_inicial with the smallest slot of
     * the edited week (use-agenda-selection-usecase.ts:78-79 feeding
     * UpdateReservaJob.php:56), so it can drift ahead of the reservation's real
     * first slot. Anchoring on data_inicial would reopen #222 for those.
     */
    public function test_first_slot_wins_over_a_drifted_data_inicial(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();

        $primeiroSlot = Carbon::today()->addWeeks(2)->startOfWeek(Carbon::MONDAY);
        $dataInicialDessincronizada = Carbon::today()->addWeeks(6)->startOfWeek(Carbon::MONDAY);

        $espaco = Espaco::factory()->create();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => 'em_analise',
            'data_inicial' => $dataInicialDessincronizada->toDateString(),
            'data_final' => $dataInicialDessincronizada->copy()->addDays(2)->toDateString(),
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => $primeiroSlot->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        $response = $this->actingAs($dono)->get(route('reservas.show', $reserva->fresh()->id));

        $response->assertRedirect(route('reservas.index', [
            'reserva' => $reserva->id,
            'semana' => $primeiroSlot->toDateString(),
        ]));
    }

    /**
     * Week navigation inside the modal sends an explicit 'semana'
     * (ReservasDetalhes.tsx:81-95); the fix must not override it.
     */
    public function test_explicit_semana_parameter_is_still_honoured(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();

        $reserva = $this->criarReservaEm($dono, $gestor, 4);
        $semanaEscolhida = Carbon::today()->addWeeks(5)->startOfWeek(Carbon::MONDAY)->toDateString();

        $response = $this->actingAs($dono)->get(route('reservas.index', [
            'reserva' => $reserva->id,
            'semana' => $semanaEscolhida,
        ]));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where('semana.referencia', $semanaEscolhida));
    }

    /**
     * Passo 4 — guards the flow itself.
     *
     * With data_inicial and the first slot in agreement, this passes both before
     * and after the change: that is the point. It is the regression guard proving
     * the gestor evaluation screen keeps rendering its slots untouched.
     */
    public function test_gestor_review_page_opens_on_the_reservation_week(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');

        $reserva = $this->criarReservaEm($dono, $gestor, 4);
        $dataEsperada = Carbon::today()->addWeeks(4)->startOfWeek(Carbon::MONDAY)->toDateString();

        $response = $this->actingAs($gestor)->get(route('gestor.reservas.show', $reserva->id));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('semana.referencia', $dataEsperada)
            ->where('reserva.id', $reserva->id)
            ->has('reserva.horarios', 1)
        );
    }

    /**
     * Passo 4 — the case that actually exercises it.
     *
     * With a drifted data_inicial the gestor screen used to open on a week with
     * no slots, leaving the evaluator with an empty calendar for a reservation
     * that does have pending slots.
     */
    public function test_gestor_review_page_survives_a_drifted_data_inicial(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');

        $primeiroSlot = Carbon::today()->addWeeks(2)->startOfWeek(Carbon::MONDAY);
        $dataInicialDessincronizada = Carbon::today()->addWeeks(6)->startOfWeek(Carbon::MONDAY);

        $espaco = Espaco::factory()->create();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => 'em_analise',
            'data_inicial' => $dataInicialDessincronizada->toDateString(),
            'data_final' => $dataInicialDessincronizada->copy()->addDays(2)->toDateString(),
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => $primeiroSlot->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        $response = $this->actingAs($gestor)->get(route('gestor.reservas.show', $reserva->fresh()->id));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('semana.referencia', $primeiroSlot->toDateString())
            ->has('reserva.horarios', 1)
        );
    }
}
