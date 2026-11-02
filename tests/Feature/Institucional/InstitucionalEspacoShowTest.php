<?php

declare(strict_types=1);

namespace Tests\Feature\Institucional;

use App\Models\Agenda;
use App\Models\Andar;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Reserva;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Carbon\Carbon;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InstitucionalEspacoShowTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function criarInstitucional(): array
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);
        $modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);
        $andar = Andar::factory()->create(['modulo_id' => $modulo->id]);

        $admin = User::factory()->create(['setor_id' => $setor->id]);
        $admin->assignRole('institucional');

        return [$admin, $andar];
    }

    private function criarEspacoSemGestor(Andar $andar): Espaco
    {
        return Espaco::create([
            'andar_id' => $andar->id,
            'nome' => 'Sala Sem Gestor',
            'descricao' => 'Descrição',
            'capacidade_pessoas' => 20,
        ]);
    }

    private function criarEspacoComGestor(Andar $andar): Espaco
    {
        $espaco = $this->criarEspacoSemGestor($andar);

        $setor = Setor::factory()->create(['unidade_id' => $andar->modulo->unidade_id]);
        $gestor = User::factory()->create(['setor_id' => $setor->id]);

        Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
            'turno' => 'manha',
        ]);

        return $espaco;
    }

    #[Test]
    public function institucional_acessa_show_de_espaco_com_gestor_com_payload_semanal(): void
    {
        Carbon::setTestNow('2026-06-10 12:00:00');

        [$admin, $andar] = $this->criarInstitucional();
        $espaco = $this->criarEspacoComGestor($andar);

        $response = $this->actingAs($admin)
            ->get(route('institucional.espacos.show', $espaco));

        $response->assertOk();
        $response->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('Espacos/VisualizarEspacoPage')
                ->where('semana.referencia', '2026-06-10')
                ->where('semana.inicio', '2026-06-08')
                ->where('semana.fim', '2026-06-14')
                ->has('espaco')
        );
    }

    #[Test]
    public function institucional_show_aceita_semana_na_query_string(): void
    {
        [$admin, $andar] = $this->criarInstitucional();
        $espaco = $this->criarEspacoComGestor($andar);

        $response = $this->actingAs($admin)
            ->get(route('institucional.espacos.show', ['espaco' => $espaco, 'semana' => '2026-06-03']));

        $response->assertOk();
        $response->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('Espacos/VisualizarEspacoPage')
                ->where('semana.referencia', '2026-06-03')
                ->where('semana.inicio', '2026-06-01')
                ->where('semana.fim', '2026-06-07')
        );
    }

    #[Test]
    public function institucional_show_carrega_apenas_horarios_da_semana_solicitada(): void
    {
        [$admin, $andar] = $this->criarInstitucional();
        $espaco = $this->criarEspacoComGestor($andar);
        $agenda = $espaco->agendas()->first();

        $solicitante = User::factory()->create(['setor_id' => $admin->setor_id]);
        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'situacao' => 'deferida',
            'data_inicial' => '2026-06-03',
            'data_final' => '2026-06-03',
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => '2026-06-03',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => '2026-07-20',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        $response = $this->actingAs($admin)
            ->get(route('institucional.espacos.show', ['espaco' => $espaco, 'semana' => '2026-06-03']));

        $response->assertOk();
        $response->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('semana.referencia', '2026-06-03')
                ->has('espaco.agendas.0.horarios', 1)
        );
    }

    #[Test]
    public function institucional_show_redireciona_espaco_sem_gestor_para_listagem(): void
    {
        [$admin, $andar] = $this->criarInstitucional();
        $espaco = $this->criarEspacoSemGestor($andar);

        $response = $this->actingAs($admin)
            ->get(route('institucional.espacos.show', $espaco));

        $response->assertRedirect(route('espacos.index'));
        $response->assertSessionHas('error', 'Este espaço ainda não possui um gestor definido.');
    }
}
