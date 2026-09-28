<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Critério de ordenação (data de solicitação / situação) nas listagens de
 * reserva do usuário comum e do gestor.
 *
 * `data_solicitacao` é o comportamento histórico (`->latest()`) — coberto só
 * como guarda de regressão. `situacao` é o caso novo: pendente e parcial
 * primeiro, deferida e arquivada por último, mesmo quando a mais recente foi
 * criada por último.
 */
class ReservaOrdenacaoTest extends TestCase
{
    private function criarReserva(User $dono, User $gestorDaAgenda, string $situacao, string $titulo, Carbon|string|null $criadaEm = null): Reserva
    {
        $espaco = Espaco::factory()->create();

        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestorDaAgenda->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'titulo' => $titulo,
            'situacao' => $situacao,
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
            'created_at' => $criadaEm ?? now(),
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => $situacao,
            'data' => now()->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return $reserva->fresh();
    }

    /**
     * @return array<int, string>
     */
    private function titulosNaListagem(AssertableInertia $page): array
    {
        /** @var array<int, array<string, mixed>> $linhas */
        $linhas = $page->toArray()['props']['reservas']['data'];

        return array_column($linhas, 'titulo');
    }

    public function test_usuario_comum_ordena_por_situacao_com_pendente_primeiro(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();

        // Deferida criada por último — se a ordenação ainda fosse por data,
        // ela apareceria primeiro.
        $this->criarReserva($dono, $gestor, 'em_analise', 'Pendente', now()->subDays(3));
        $this->criarReserva($dono, $gestor, 'deferida', 'Deferida Recente', now());

        $response = $this->actingAs($dono)->get(route('reservas.index', ['ordenar' => 'situacao']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where('reservas.data.0.titulo', 'Pendente'));
    }

    public function test_usuario_comum_ordena_por_data_de_solicitacao_por_padrao(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();

        $this->criarReserva($dono, $gestor, 'deferida', 'Mais Antiga', now()->subDays(3));
        $this->criarReserva($dono, $gestor, 'em_analise', 'Mais Recente', now());

        $response = $this->actingAs($dono)->get(route('reservas.index'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where('reservas.data.0.titulo', 'Mais Recente'));
    }

    public function test_gestor_ordena_por_situacao_com_pendente_primeiro(): void
    {
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $solicitante = User::factory()->create();

        $this->criarReserva($solicitante, $gestor, 'deferida', 'Deferida Recente', now());
        $this->criarReserva($solicitante, $gestor, 'em_analise', 'Pendente', now()->subDays(3));

        $response = $this->actingAs($gestor)->get(route('gestor.reservas.index', ['ordenar' => 'situacao']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where('reservas.data.0.titulo', 'Pendente'));
    }

    public function test_valor_invalido_de_ordenar_cai_no_padrao(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();

        $this->criarReserva($dono, $gestor, 'deferida', 'Mais Antiga', now()->subDays(3));
        $this->criarReserva($dono, $gestor, 'em_analise', 'Mais Recente', now());

        $response = $this->actingAs($dono)->get(route('reservas.index', ['ordenar' => 'xyz']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where('filters.ordenar', 'data_solicitacao')
            ->where('reservas.data.0.titulo', 'Mais Recente'));
    }
}
