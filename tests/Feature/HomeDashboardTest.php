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

    public function test_usuario_comum_recebe_espacos_recentes_distintos_do_mais_recente_ao_mais_antigo(): void
    {
        // Os espaços vêm antes do usuário: o afterCreating do EspacoFactory sorteia um
        // usuário existente da instituição como gestor das agendas e lhe dá o papel
        // `gestor`. Se o solicitante já existisse, podia ser sorteado e o painel
        // renderizado passaria a ser o do gestor (falha intermitente).
        $espacoA = Espaco::factory()->create();
        $espacoB = Espaco::factory()->create();
        $espacoInativo = Espaco::factory()->create();
        $espacoD = Espaco::factory()->create();

        $user = User::factory()->create();

        Carbon::setTestNow('2026-01-10 10:00:00');
        $this->reservaEmEspaco($user, 'em_analise', $espacoA);

        Carbon::setTestNow('2026-01-11 10:00:00');
        $this->reservaEmEspaco($user, 'deferida', $espacoB);

        Carbon::setTestNow('2026-01-12 10:00:00');
        $this->reservaEmEspaco($user, 'deferida', $espacoA);

        Carbon::setTestNow('2026-01-13 10:00:00');
        $this->reservaEmEspaco($user, 'inativa', $espacoInativo);

        Carbon::setTestNow('2026-01-14 10:00:00');
        $this->reservaEmEspaco($user, 'parcialmente_deferida', $espacoD);

        $this->assertFalse($user->fresh()?->hasRole('gestor'), 'O solicitante não pode ter virado gestor pelas factories.');

        Carbon::setTestNow('2026-01-15 10:00:00');
        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $recentes = $response->viewData('page')['props']['espacosRecentes'];

        $this->assertSame([$espacoD->id, $espacoA->id, $espacoB->id], array_column($recentes, 'id'));
        $this->assertSame($espacoD->nome, $recentes[0]['nome']);
        $this->assertSame(
            $espacoD->andar->modulo->nome,
            $recentes[0]['andar']['modulo']['nome'],
        );
        $this->assertSame(['id', 'nome', 'andar'], array_keys($recentes[0]));
    }

    public function test_usuario_sem_reservas_recebe_espacos_recentes_vazio(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $this->assertSame([], $response->viewData('page')['props']['espacosRecentes']);
    }

    private function reservaEmEspaco(User $user, string $situacao, Espaco $espaco): Espaco
    {
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'turno' => 'manha',
            'user_id' => User::factory()->create()->id,
        ]);
        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'situacao' => $situacao,
        ]);
        Horario::create([
            'agenda_id' => $agenda->id,
            'reserva_id' => $reserva->id,
            'data' => '2026-02-02',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
            'situacao' => 'deferida',
        ]);

        return $espaco;
    }
}
