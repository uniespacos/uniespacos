<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Carbon\Carbon;
use Tests\TestCase;

class HomeDashboardTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_institucional_user_can_access_home_dashboard(): void
    {
        Carbon::setTestNow('2026-01-15 10:00:00');

        $user = User::factory()->create();
        $user->givePermissionTo('secao.dashboard-institucional');

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($assert) => $assert
            ->component('Dashboard/DashboardInstitucionalPage')
            ->has('estatisticasPainel')
            ->has('user')
            ->has('espacosFavoritos')
            ->has('reservas')
            ->has('users')
            ->has('gestores')
            ->has('espacos')
            ->has('unidades')
        );

        // Verify estadisticasPainel has all required keys
        $response->assertInertia(fn ($assert) => $assert
            ->where('estatisticasPainel.total_espacos', fn ($value) => is_int($value))
            ->where('estatisticasPainel.total_gestores', fn ($value) => is_int($value))
            ->where('estatisticasPainel.reservas_mes', fn ($value) => is_int($value))
        );
    }

    public function test_institucional_dashboard_reservas_mes_counts_only_current_year(): void
    {
        Carbon::setTestNow('2026-01-15 10:00:00');

        $user = User::factory()->create();
        $user->givePermissionTo('secao.dashboard-institucional');

        // Capture the count BEFORE test data
        $countBefore = Reserva::whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->count();

        // Create 3 reservas in January 2026 (current month/year)
        Reserva::factory()->count(3)->create([
            'created_at' => Carbon::parse('2026-01-10 09:00:00'),
        ]);

        // Create 4 reservas in January 2025 (same month, DIFFERENT year) - these should NOT be counted
        Reserva::factory()->count(4)->create([
            'created_at' => Carbon::parse('2025-01-10 09:00:00'),
        ]);

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($assert) => $assert
            ->where('estatisticasPainel.reservas_mes', $countBefore + 3)
        );
    }

    public function test_gestor_user_can_access_home_dashboard(): void
    {
        Carbon::setTestNow('2026-01-15 10:00:00');

        $gestorUser = User::factory()->create();
        $gestorUser->givePermissionTo('secao.dashboard-gestor');

        // Create space and agenda for this gestor
        $espaco = Espaco::factory()->make();
        $espaco->save();
        $this->assertSame(0, $espaco->agendas()->count());
        $agenda = Agenda::factory()->create([
            'user_id' => $gestorUser->id,
            'espaco_id' => $espaco->id,
        ]);

        // Create pending reservations
        $reservaPendente = Reserva::factory()->create([
            'situacao' => 'em_analise',
            'created_at' => Carbon::now(),
        ]);

        // Create horario linked to this agenda
        Horario::factory()->create([
            'reserva_id' => $reservaPendente->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => Carbon::now()->toDateString(),
            'horario_inicio' => '08:00',
            'horario_fim' => '10:00',
        ]);

        // Create evaluated reservation from today
        $reservaAvaliada = Reserva::factory()->create([
            'situacao' => 'deferida',
            'updated_at' => today(),
            'created_at' => Carbon::now(),
        ]);

        Horario::factory()->create([
            'reserva_id' => $reservaAvaliada->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => Carbon::now()->toDateString(),
            'horario_inicio' => '10:30',
            'horario_fim' => '12:00',
        ]);

        $response = $this->actingAs($gestorUser)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($assert) => $assert
            ->component('Dashboard/DashboardGestorPage')
            ->has('statusDasReservas')
            ->where('statusDasReservas.pendentes', 1)
            ->where('statusDasReservas.avaliadas_hoje', 1)
            ->where('statusDasReservas.total_espacos', 1)
        );
    }

    public function test_common_user_can_access_home_dashboard(): void
    {
        Carbon::setTestNow('2026-01-15 10:00:00');

        $user = User::factory()->create();

        // Create reservations for this user
        Reserva::factory()->create([
            'user_id' => $user->id,
            'situacao' => 'em_analise',
        ]);

        Reserva::factory()->create([
            'user_id' => $user->id,
            'situacao' => 'parcialmente_deferida',
        ]);

        Reserva::factory()->create([
            'user_id' => $user->id,
            'situacao' => 'deferida',
        ]);

        Reserva::factory()->create([
            'user_id' => $user->id,
            'situacao' => 'indeferida',
        ]);

        // Create reservation for another user (should not be counted)
        $otherUser = User::factory()->create();
        Reserva::factory()->create([
            'user_id' => $otherUser->id,
            'situacao' => 'em_analise',
        ]);

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($assert) => $assert
            ->component('Dashboard/DashboardUsuarioPage')
            ->has('statusDasReservas')
            ->where('statusDasReservas.em_analise', 1)
            ->where('statusDasReservas.parcialmente_deferida', 1)
            ->where('statusDasReservas.deferida', 1)
            ->where('statusDasReservas.indeferida', 1)
        );
    }
}
