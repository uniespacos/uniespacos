<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Services\HomeService;
use Carbon\Carbon;
use Tests\TestCase;

class HomeServiceTest extends TestCase
{
    protected HomeService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new HomeService;
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_institucional_dashboard_reservas_mes_counts_only_current_month_and_year(): void
    {
        Carbon::setTestNow('2026-01-15 10:00:00');

        $institucionalUser = User::factory()->create();
        $institucionalUser->givePermissionTo('secao.dashboard-institucional');

        // Create reservas from current month (January 2026)
        Reserva::factory()->count(3)->create([
            'created_at' => Carbon::now(),
        ]);

        // Create reservas from previous month (December 2025) - should NOT count
        Reserva::factory()->count(2)->create([
            'created_at' => Carbon::now()->subMonth(),
        ]);

        // Create reservas from same month previous year (January 2025) - should NOT count
        Reserva::factory()->count(4)->create([
            'created_at' => Carbon::now()->subYear(),
        ]);

        $data = $this->service->getDashboardData($institucionalUser);

        /** @var array<string, int> $stats */
        $stats = $data['estatisticasPainel'];
        $this->assertSame(3, $stats['reservas_mes']);
    }

    public function test_institucional_dashboard_reservas_mes_same_month_different_year_excluded(): void
    {
        Carbon::setTestNow('2026-01-15 10:00:00');

        $institucionalUser = User::factory()->create();
        $institucionalUser->givePermissionTo('secao.dashboard-institucional');

        // Create 5 reservas in January 2025
        Reserva::factory()->count(5)->create([
            'created_at' => Carbon::parse('2025-01-10 09:00:00'),
        ]);

        $data = $this->service->getDashboardData($institucionalUser);

        /** @var array<string, int> $stats */
        $stats = $data['estatisticasPainel'];
        // Count should be zero because we're in 2026, not 2025
        $this->assertSame(0, $stats['reservas_mes']);
    }

    public function test_institucional_dashboard_structure(): void
    {
        Carbon::setTestNow('2026-01-15 10:00:00');

        $institucionalUser = User::factory()->create();
        $institucionalUser->givePermissionTo('secao.dashboard-institucional');

        $data = $this->service->getDashboardData($institucionalUser);

        // Verify all required keys exist for institucional dashboard
        $this->assertArrayHasKey('reservas', $data);
        $this->assertArrayHasKey('espacosFavoritos', $data);
        $this->assertArrayHasKey('user', $data);
        $this->assertArrayHasKey('users', $data);
        $this->assertArrayHasKey('gestores', $data);
        $this->assertArrayHasKey('espacos', $data);
        $this->assertArrayHasKey('unidades', $data);
        $this->assertArrayHasKey('estatisticasPainel', $data);

        // Verify statistics structure
        $stats = $data['estatisticasPainel'];
        $this->assertIsArray($stats);
        $this->assertArrayHasKey('total_espacos', $stats);
        $this->assertArrayHasKey('total_gestores', $stats);
        $this->assertArrayHasKey('reservas_mes', $stats);

        // Verify statistics are integers
        $this->assertIsInt($stats['total_espacos']);
        $this->assertIsInt($stats['total_gestores']);
        $this->assertIsInt($stats['reservas_mes']);
    }

    public function test_gestor_dashboard_counts_only_own_agendas(): void
    {
        Carbon::setTestNow('2026-01-15 10:00:00');

        // First gestor with their own space and agenda
        $gestorUser = User::factory()->create();
        $gestorUser->givePermissionTo('secao.dashboard-gestor');

        $espaco = Espaco::factory()->make();
        $espaco->save();
        $this->assertSame(0, $espaco->agendas()->count());

        $agenda = Agenda::factory()->create([
            'user_id' => $gestorUser->id,
            'espaco_id' => $espaco->id,
        ]);

        // Create pending reservation in first gestor's agenda
        $reservaPendente = Reserva::factory()->create([
            'situacao' => 'em_analise',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reservaPendente->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => Carbon::now()->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        // Create evaluated reservation from today in first gestor's agenda
        $reservaAvaliada = Reserva::factory()->create([
            'situacao' => 'deferida',
            'updated_at' => today(),
        ]);

        Horario::factory()->create([
            'reserva_id' => $reservaAvaliada->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => Carbon::now()->toDateString(),
            'horario_inicio' => '10:30:00',
            'horario_fim' => '12:00:00',
        ]);

        // Create evaluated reservation from yesterday (should not count for avaliadas_hoje)
        $reservaYesterday = Reserva::factory()->create([
            'situacao' => 'deferida',
            'updated_at' => today()->subDay(),
        ]);

        Horario::factory()->create([
            'reserva_id' => $reservaYesterday->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => Carbon::now()->toDateString(),
            'horario_inicio' => '13:00:00',
            'horario_fim' => '14:30:00',
        ]);

        // Second gestor with their own space and agenda (should not affect first gestor's counts)
        $segundoGestor = User::factory()->create();
        $segundoGestor->givePermissionTo('secao.dashboard-gestor');

        $espacoSegundo = Espaco::factory()->make();
        $espacoSegundo->save();
        $this->assertSame(0, $espacoSegundo->agendas()->count());

        $agendaSegundo = Agenda::factory()->create([
            'user_id' => $segundoGestor->id,
            'espaco_id' => $espacoSegundo->id,
        ]);

        // Create a pending and a deferida today for the second gestor
        $reservaPendenteSegundo = Reserva::factory()->create([
            'situacao' => 'em_analise',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reservaPendenteSegundo->id,
            'agenda_id' => $agendaSegundo->id,
            'situacao' => 'em_analise',
            'data' => Carbon::now()->toDateString(),
            'horario_inicio' => '14:00:00',
            'horario_fim' => '15:30:00',
        ]);

        $reservaAvaliataSegundo = Reserva::factory()->create([
            'situacao' => 'deferida',
            'updated_at' => today(),
        ]);

        Horario::factory()->create([
            'reserva_id' => $reservaAvaliataSegundo->id,
            'agenda_id' => $agendaSegundo->id,
            'situacao' => 'deferida',
            'data' => Carbon::now()->toDateString(),
            'horario_inicio' => '16:00:00',
            'horario_fim' => '17:30:00',
        ]);

        // Get data for first gestor and verify counts only include their own agenda
        $data = $this->service->getDashboardData($gestorUser);

        /** @var array<string, int> $status */
        $status = $data['statusDasReservas'];
        $this->assertSame(1, $status['pendentes']);
        $this->assertSame(1, $status['avaliadas_hoje']);
        $this->assertSame(1, $status['total_espacos']);

        // Verify all required keys
        $this->assertArrayHasKey('user', $data);
        $this->assertArrayHasKey('espacosFavoritos', $data);
        $this->assertArrayHasKey('agendas', $data);
        $this->assertArrayHasKey('reservasPendentes', $data);

        // Verify second gestor has different counts
        $dataSegundo = $this->service->getDashboardData($segundoGestor);
        /** @var array<string, int> $statusSegundo */
        $statusSegundo = $dataSegundo['statusDasReservas'];
        $this->assertSame(1, $statusSegundo['pendentes']);
        $this->assertSame(1, $statusSegundo['avaliadas_hoje']);
        $this->assertSame(1, $statusSegundo['total_espacos']);

        // Confirm first gestor's counts haven't changed
        $this->assertSame(1, $status['pendentes']);
        $this->assertSame(1, $status['avaliadas_hoje']);
        $this->assertSame(1, $status['total_espacos']);
    }

    public function test_common_user_dashboard_counts_only_own_reservations(): void
    {
        Carbon::setTestNow('2026-01-15 10:00:00');

        $user = User::factory()->create();
        $otherUser = User::factory()->create();

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

        // Create reservations for another user (should NOT be counted)
        Reserva::factory()->count(3)->create([
            'user_id' => $otherUser->id,
            'situacao' => 'em_analise',
        ]);

        $data = $this->service->getDashboardData($user);

        /** @var array<string, int> $status */
        $status = $data['statusDasReservas'];
        $this->assertSame(1, $status['em_analise']);
        $this->assertSame(1, $status['parcialmente_deferida']);
        $this->assertSame(1, $status['deferida']);
        $this->assertSame(1, $status['indeferida']);

        // Verify all required keys
        $this->assertArrayHasKey('user', $data);
        $this->assertArrayHasKey('espacosFavoritos', $data);
        $this->assertArrayHasKey('reservas', $data);
    }

    public function test_common_user_dashboard_excludes_inactive_reservations(): void
    {
        Carbon::setTestNow('2026-01-15 10:00:00');

        $user = User::factory()->create();

        // Create active reservation
        Reserva::factory()->create([
            'user_id' => $user->id,
            'situacao' => 'deferida',
        ]);

        // Create inactive reservation - should still be counted in status
        Reserva::factory()->create([
            'user_id' => $user->id,
            'situacao' => 'inativa',
        ]);

        $data = $this->service->getDashboardData($user);

        /** @var array<string, int> $status */
        $status = $data['statusDasReservas'];
        $this->assertSame(1, $status['deferida']);
        $this->assertSame(0, $status['em_analise']);
        $this->assertSame(0, $status['parcialmente_deferida']);
        $this->assertSame(0, $status['indeferida']);

        // But the `reservas` list should not include inactive
        /** @var array<array<string, mixed>> $reservas */
        $reservas = $data['reservas'];
        foreach ($reservas as $reserva) {
            $this->assertNotSame('inativa', $reserva['situacao']);
        }
    }
}
