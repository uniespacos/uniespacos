<?php

declare(strict_types=1);

namespace Tests\Feature;

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

/**
 * Corrigir a FK de Horario::avaliador() (B4) faz o avaliador passar a ser carregado de verdade.
 * Estes testes garantem que ele nunca volta com e-mail/telefone (não reabre o vazamento da S01).
 */
class HorarioAvaliadorPrivacidadeTest extends TestCase
{
    private const SEMANA = '2026-06-01'; // segunda-feira

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-05-25 12:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /**
     * @return array<string, mixed>
     */
    private function criarCenario(): array
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $gestor = User::factory()->create([
            'setor_id' => $setor->id,
            'email' => 'gestor-agenda@exemplo-teste.local',
            'telefone' => '11-9999-0001',
        ]);
        $avaliador = User::factory()->create([
            'setor_id' => $setor->id,
            'email' => 'avaliador@exemplo-teste.local',
            'telefone' => '11-9999-0002',
            'profile_pic' => 'avaliador.jpg',
        ]);
        $solicitante = User::factory()->create([
            'setor_id' => $setor->id,
            'email' => 'solicitante@exemplo-teste.local',
            'telefone' => '11-9999-0003',
        ]);
        $outro = User::factory()->create([
            'setor_id' => $setor->id,
            'email' => 'outro@exemplo-teste.local',
            'telefone' => '11-9999-0004',
        ]);

        $modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);
        $andar = Andar::factory()->create(['modulo_id' => $modulo->id]);
        $espaco = Espaco::create([
            'andar_id' => $andar->id,
            'nome' => 'Sala de Teste',
            'descricao' => 'Descrição teste',
            'capacidade_pessoas' => 20,
        ]);
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
            'turno' => 'manha',
        ]);

        // Reserva do solicitante, em análise (editável) e sem avaliador.
        $reservaEditavel = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'situacao' => 'em_analise',
            'data_inicial' => self::SEMANA,
            'data_final' => self::SEMANA,
            'recorrencia' => 'unica',
            'titulo' => 'Reserva Editável',
        ]);
        Horario::factory()->create([
            'reserva_id' => $reservaEditavel->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => self::SEMANA,
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        // Reserva deferida (de outro solicitante) avaliada por `avaliador`, na mesma agenda e semana.
        $reservaDeferida = Reserva::factory()->create([
            'user_id' => $outro->id,
            'situacao' => 'deferida',
            'data_inicial' => self::SEMANA,
            'data_final' => self::SEMANA,
            'recorrencia' => 'unica',
            'titulo' => 'Reserva Deferida',
        ]);
        Horario::factory()->create([
            'reserva_id' => $reservaDeferida->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => self::SEMANA,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '12:00:00',
            'user_id' => $avaliador->id,
        ]);

        return compact('espaco', 'gestor', 'avaliador', 'solicitante', 'outro', 'reservaEditavel', 'reservaDeferida');
    }

    private function assertSemDadosPessoaisDoAvaliador(string $content, User $avaliador): void
    {
        $this->assertStringNotContainsString($avaliador->email, $content, 'E-mail do avaliador exposto');
        $this->assertStringNotContainsString($avaliador->telefone, $content, 'Telefone do avaliador exposto');
        $this->assertStringNotContainsString('avaliador.jpg', $content, 'profile_pic do avaliador exposta');
    }

    #[Test]
    public function espaco_show_expoe_do_avaliador_apenas_id_e_name(): void
    {
        $c = $this->criarCenario();

        $response = $this->actingAs($c['solicitante'])
            ->get(route('espacos.show', ['espaco' => $c['espaco'], 'semana' => self::SEMANA]));

        $response->assertOk();
        $this->assertSemDadosPessoaisDoAvaliador($response->getContent(), $c['avaliador']);

        $horarios = $response->viewData('page')['props']['espaco']['agendas'][0]['horarios'];
        $this->assertCount(1, $horarios, 'Só o horário deferido aparece na agenda');
        $this->assertSame(['id', 'name'], array_keys($horarios[0]['avaliador']));
        $this->assertSame($c['avaliador']->id, $horarios[0]['avaliador']['id']);
        $this->assertSame($c['avaliador']->name, $horarios[0]['avaliador']['name']);
    }

    #[Test]
    public function reserva_edit_expoe_do_avaliador_apenas_id_e_name(): void
    {
        $c = $this->criarCenario();

        $response = $this->actingAs($c['solicitante'])
            ->get(route('reservas.edit', ['reserva' => $c['reservaEditavel'], 'semana' => self::SEMANA]));

        $response->assertOk();
        $this->assertSemDadosPessoaisDoAvaliador($response->getContent(), $c['avaliador']);

        $horarios = $response->viewData('page')['props']['espaco']['agendas'][0]['horarios'];
        $this->assertCount(1, $horarios, 'Só o horário deferido aparece na agenda');
        $this->assertSame(['id', 'name'], array_keys($horarios[0]['avaliador']));
        $this->assertSame($c['avaliador']->id, $horarios[0]['avaliador']['id']);
    }

    #[Test]
    public function reservas_index_modal_expoe_do_avaliador_apenas_id_e_name(): void
    {
        $c = $this->criarCenario();

        // O dono da reserva deferida abre o modal de detalhes.
        $response = $this->actingAs($c['outro'])
            ->get(route('reservas.index', ['reserva' => $c['reservaDeferida']->id, 'semana' => self::SEMANA]));

        $response->assertOk();
        $this->assertSemDadosPessoaisDoAvaliador($response->getContent(), $c['avaliador']);

        $horarios = $response->viewData('page')['props']['reservaToShow']['horarios'];
        $this->assertCount(1, $horarios);
        $this->assertSame(['id', 'name'], array_keys($horarios[0]['avaliador']));
        $this->assertSame($c['avaliador']->id, $horarios[0]['avaliador']['id']);
    }

    #[Test]
    public function gestor_reservas_index_modal_expoe_do_avaliador_apenas_id_e_name(): void
    {
        $c = $this->criarCenario();
        $c['gestor']->givePermissionTo('secao.gestao-reservas');

        $response = $this->actingAs($c['gestor'])
            ->get(route('gestor.reservas.index', ['reserva' => $c['reservaDeferida']->id, 'semana' => self::SEMANA]));

        $response->assertOk();
        $this->assertSemDadosPessoaisDoAvaliador($response->getContent(), $c['avaliador']);

        $horarios = $response->viewData('page')['props']['reservaToShow']['horarios'];
        $this->assertCount(1, $horarios);
        $this->assertSame(['id', 'name'], array_keys($horarios[0]['avaliador']));
        $this->assertSame($c['avaliador']->id, $horarios[0]['avaliador']['id']);
    }

    #[Test]
    public function horario_em_analise_serializa_avaliador_nulo(): void
    {
        $c = $this->criarCenario();

        $response = $this->actingAs($c['solicitante'])
            ->get(route('reservas.index', ['reserva' => $c['reservaEditavel']->id, 'semana' => self::SEMANA]));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('reservaToShow.horarios.0.avaliador', null)
        );
    }
}
