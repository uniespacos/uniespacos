<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Regression guard for issue #119 (IDOR in reservation details/editing).
 *
 * These checks were originally added in 725d76f and silently dropped by the
 * layered-architecture refactor in 214c437. They exist so that a future refactor
 * moving logic between controller/service/repository fails loudly instead of
 * reopening the vulnerability.
 *
 * Negative cases prove the vulnerability is closed; positive cases prove the fix
 * is not overly restrictive (the 'institucional' role legitimately reads other
 * users' reservations, and gestores must still evaluate their own agendas).
 */
class ReservaAuthorizationTest extends TestCase
{
    /**
     * Builds a coherent Reserva + Agenda + Horario trio for the current week.
     *
     * The horario must fall inside the current week because getListingForUser
     * filters slots by the resolved week (defaults to 'today'); otherwise the
     * detail modal would come back empty for reasons unrelated to authorization.
     */
    private function criarReservaCom(User $dono, User $gestorDaAgenda): Reserva
    {
        $espaco = Espaco::factory()->create();

        // user_id is passed explicitly: AgendaFactory defaults to
        // User::pluck('id')->random(), which is order-dependent and would not
        // reliably tie the agenda to the intended gestor.
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestorDaAgenda->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => 'em_analise',
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
        ]);

        // reserva_id and situacao are not part of HorarioFactory's definition.
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

    /**
     * @return array<string, mixed>
     */
    private function payloadDeAvaliacao(Reserva $reserva): array
    {
        return [
            'situacao' => 'deferida',
            'motivo' => null,
            'observacao' => 'Avaliado em teste.',
            'evaluation_scope' => 'single',
            'horarios_avaliados' => $reserva->horarios->map(fn (Horario $h) => [
                'id' => $h->id,
                'status' => 'deferida',
            ])->all(),
        ];
    }

    // ---------------------------------------------------------------------
    // Negative cases — the vulnerability itself
    // ---------------------------------------------------------------------

    public function test_user_cannot_view_another_users_reservation_via_query_param(): void
    {
        $vitima = User::factory()->create();
        $atacante = User::factory()->create();
        $gestor = User::factory()->create();

        $reserva = $this->criarReservaCom($vitima, $gestor);

        $response = $this->actingAs($atacante)
            ->get(route('reservas.index', ['reserva' => $reserva->id]));

        $response->assertForbidden();
    }

    public function test_user_cannot_show_another_users_reservation(): void
    {
        $vitima = User::factory()->create();
        $atacante = User::factory()->create();
        $gestor = User::factory()->create();

        $reserva = $this->criarReservaCom($vitima, $gestor);

        $response = $this->actingAs($atacante)
            ->get(route('reservas.show', $reserva->id));

        $response->assertForbidden();
    }

    public function test_user_cannot_open_edit_page_of_another_users_reservation(): void
    {
        $vitima = User::factory()->create();
        $atacante = User::factory()->create();
        $gestor = User::factory()->create();

        $reserva = $this->criarReservaCom($vitima, $gestor);

        $response = $this->actingAs($atacante)
            ->get(route('reservas.edit', $reserva->id));

        $response->assertForbidden();
    }

    /**
     * Guards the PII finding: findWithWeekSlots eager loads the full User model,
     * and User::$hidden only hides password/remember_token — so email and
     * telefone would otherwise reach the attacker in the Inertia payload.
     *
     * Asserted separately from the status code on purpose: if someone ever
     * swaps the 403 for a silent null, the status assertion above could be
     * "fixed" while the data still leaks. This one fails either way.
     */
    public function test_reservation_modal_does_not_leak_other_users_personal_data(): void
    {
        $vitima = User::factory()->create([
            'email' => 'vitima-idor-119@uesb.edu.br',
            'telefone' => '77999990001',
        ]);
        $atacante = User::factory()->create();
        $gestor = User::factory()->create();

        $reserva = $this->criarReservaCom($vitima, $gestor);

        $response = $this->actingAs($atacante)
            ->get(route('reservas.index', ['reserva' => $reserva->id]));

        $response->assertForbidden();
        $response->assertDontSee('vitima-idor-119@uesb.edu.br');
        $response->assertDontSee('77999990001');
    }

    /**
     * Privilege escalation found during the #119 audit (not in the issue body).
     *
     * Defense in depth: even if a gestor bypasses the policy authorization,
     * AvaliarReservaRequest now validates that each horario belongs to managed agendas.
     * The intruding gestor is redirected with a validation error.
     */
    public function test_gestor_cannot_evaluate_reservation_outside_their_agendas(): void
    {
        $dono = User::factory()->create();
        $gestorDono = User::factory()->create();
        $gestorIntruso = User::factory()->create();
        $gestorIntruso->assignRole('gestor');

        $reserva = $this->criarReservaCom($dono, $gestorDono);

        $response = $this->actingAs($gestorIntruso)
            ->patch(route('gestor.reservas.update', $reserva->id), $this->payloadDeAvaliacao($reserva));

        $response->assertRedirect();
        $response->assertSessionHasErrors('horarios_avaliados');
    }

    /**
     * Issue #265: 'inativa' is a terminal, archived state — evaluating it
     * would resurrect it with a live situacao. This is the entry guard: even
     * with a direct ID and a legitimate gestor of the agenda, the route must
     * refuse once the reservation is archived.
     */
    public function test_gestor_cannot_evaluate_archived_reservation(): void
    {
        $dono = User::factory()->create();
        $gestorDono = User::factory()->create();
        $gestorDono->assignRole('gestor');

        $reserva = $this->criarReservaCom($dono, $gestorDono);
        $reserva->horarios()->update(['situacao' => 'inativa']);
        $reserva->update(['situacao' => 'inativa']);

        $response = $this->actingAs($gestorDono)
            ->patch(route('gestor.reservas.update', $reserva->id), $this->payloadDeAvaliacao($reserva));

        $response->assertForbidden();
        $this->assertDatabaseHas('reservas', ['id' => $reserva->id, 'situacao' => 'inativa']);
    }

    public function test_gestor_modal_does_not_return_reservation_outside_their_agendas(): void
    {
        $dono = User::factory()->create();
        $gestorDono = User::factory()->create();
        $gestorIntruso = User::factory()->create();
        $gestorIntruso->assignRole('gestor');

        $reserva = $this->criarReservaCom($dono, $gestorDono);

        $response = $this->actingAs($gestorIntruso)
            ->get(route('gestor.reservas.index', ['reserva' => $reserva->id]));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where('reservaToShow', null));
    }

    // ---------------------------------------------------------------------
    // Positive cases — guard against over-correcting
    // ---------------------------------------------------------------------

    public function test_owner_can_view_own_reservation_modal(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();

        $reserva = $this->criarReservaCom($dono, $gestor);

        $response = $this->actingAs($dono)
            ->get(route('reservas.index', ['reserva' => $reserva->id]));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where('reservaToShow.id', $reserva->id));
    }

    /**
     * The 'institucional' role receives every permission, including
     * 'reservas.visualizar'. ReservaPolicy::view() honours that on purpose —
     * see the anchor comment there before "simplifying" it to user_id only.
     */
    public function test_institucional_can_view_any_reservation(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $institucional = User::factory()->create();
        $institucional->assignRole('institucional');

        $reserva = $this->criarReservaCom($dono, $gestor);

        $response = $this->actingAs($institucional)
            ->get(route('reservas.index', ['reserva' => $reserva->id]));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where('reservaToShow.id', $reserva->id));
    }

    /**
     * Asserts only that authorization did not block the request; the evaluation
     * job itself is covered by AvaliarReservaJobTest.
     */
    public function test_gestor_can_evaluate_reservation_in_their_agenda(): void
    {
        $dono = User::factory()->create();
        $gestorDono = User::factory()->create();
        $gestorDono->assignRole('gestor');

        $reserva = $this->criarReservaCom($dono, $gestorDono);

        $response = $this->actingAs($gestorDono)
            ->patch(route('gestor.reservas.update', $reserva->id), $this->payloadDeAvaliacao($reserva));

        $response->assertStatus(302);
    }
}
