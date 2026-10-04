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
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReservaEdicaoPrivacidadeTest extends TestCase
{
    private function criarReservaEditavelComOutroSolicitante(): array
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);

        $setorGestor = Setor::factory()->create([
            'unidade_id' => $unidade->id,
            'nome' => 'Setor de Gestão de Espaços',
            'sigla' => 'SGE',
        ]);

        $setorSolicitante = Setor::factory()->create([
            'unidade_id' => $unidade->id,
            'nome' => 'Setor de Pesquisa e Inovação',
            'sigla' => 'SPI',
        ]);

        $gestor = User::factory()->create([
            'setor_id' => $setorGestor->id,
            'email' => 'gestor@exemplo-teste.local',
            'telefone' => '11-9999-9999',
            'two_factor_secret' => 'secret-gestor-12345',
            'two_factor_recovery_codes' => json_encode(['code1', 'code2']),
            'email_verified_at' => now(),
            'profile_pic' => 'gestor.jpg',
        ]);

        $solicitante1 = User::factory()->create([
            'setor_id' => $setorSolicitante->id,
            'email' => 'solicitante1@exemplo-teste.local',
            'telefone' => '11-8888-8888',
            'two_factor_secret' => 'secret-solicitante1-12345',
            'two_factor_recovery_codes' => json_encode(['code3', 'code4']),
            'email_verified_at' => now(),
            'profile_pic' => 'solicitante1.jpg',
        ]);

        $solicitante2 = User::factory()->create([
            'setor_id' => $setorSolicitante->id,
            'email' => 'solicitante2@exemplo-teste.local',
            'telefone' => '11-7777-7777',
            'two_factor_secret' => 'secret-solicitante2-12345',
            'two_factor_recovery_codes' => json_encode(['code5', 'code6']),
            'email_verified_at' => now(),
            'profile_pic' => 'solicitante2.jpg',
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

        $semana = '2026-06-01'; // segunda-feira fixa

        // Reserva editável (em_analise) do solicitante1
        $reservaEditavel = Reserva::factory()->create([
            'user_id' => $solicitante1->id,
            'situacao' => 'em_analise',
            'data_inicial' => $semana,
            'data_final' => $semana,
            'recorrencia' => 'unica',
            'titulo' => 'Reserva Editável',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reservaEditavel->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => $semana,
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        // Reserva deferida de outro solicitante (solicitante2) na mesma semana
        $reservaDeferida = Reserva::factory()->create([
            'user_id' => $solicitante2->id,
            'situacao' => 'deferida',
            'data_inicial' => $semana,
            'data_final' => $semana,
            'recorrencia' => 'unica',
            'titulo' => 'Reserva de Outro Solicitante',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reservaDeferida->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => $semana,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '12:00:00',
        ]);

        return [
            'espaco' => $espaco->fresh(),
            'agenda' => $agenda,
            'gestor' => $gestor,
            'solicitante1' => $solicitante1,
            'solicitante2' => $solicitante2,
            'reservaEditavel' => $reservaEditavel->fresh(),
            'semana' => $semana,
        ];
    }

    #[Test]
    public function reserva_edit_nao_expoe_dados_pessoais_de_terceiros(): void
    {
        $dados = $this->criarReservaEditavelComOutroSolicitante();
        $reserva = $dados['reservaEditavel'];
        $gestor = $dados['gestor'];
        $solicitante2 = $dados['solicitante2'];
        $semana = $dados['semana'];

        $response = $this->actingAs($dados['solicitante1'])
            ->get(route('reservas.edit', ['reserva' => $reserva, 'semana' => $semana]));

        $response->assertOk();

        $content = $response->getContent();

        // E-mail do solicitante2 (outro solicitante) não deveria estar exposto
        $this->assertStringNotContainsString(
            $solicitante2->email,
            $content,
            'Email do outro solicitante não deveria estar exposto na resposta'
        );

        // Telefone do solicitante2 não deveria estar exposto
        $this->assertStringNotContainsString(
            $solicitante2->telefone,
            $content,
            'Telefone do outro solicitante não deveria estar exposto na resposta'
        );

        // Telefone do gestor não deveria estar exposto (apenas email)
        $this->assertStringNotContainsString(
            $gestor->telefone,
            $content,
            'Telefone do gestor não deveria estar exposto na resposta'
        );

        // two_factor_* não deveriam estar presentes
        $this->assertStringNotContainsString(
            'two_factor_secret',
            $content,
            'two_factor_secret não deveria estar exposto'
        );

        $this->assertStringNotContainsString(
            'two_factor_recovery_codes',
            $content,
            'two_factor_recovery_codes não deveria estar exposto'
        );

        // Validação estrutural exata
        $espacoProp = $response->viewData('page')['props']['espaco'] ?? null;
        $this->assertNotNull($espacoProp, 'Prop espaco deveria estar presente');

        // Validar estrutura exata de agendas[].user (gestor)
        $this->assertArrayHasKey('agendas', $espacoProp);
        $agendas = $espacoProp['agendas'];
        $this->assertIsArray($agendas);
        $this->assertGreaterThan(0, count($agendas), 'Deveria ter pelo menos uma agenda');

        $gestorUser = $agendas[0]['user'] ?? null;
        $this->assertNotNull($gestorUser, 'User do gestor da agenda deveria estar presente');
        $this->assertEquals(['id', 'name', 'email', 'setor_id', 'setor'], array_keys($gestorUser),
            'agendas[].user deveria ter apenas {id, name, email, setor_id, setor}'
        );

        $gestorSetor = $gestorUser['setor'] ?? null;
        $this->assertNotNull($gestorSetor, 'Setor do gestor deveria estar presente');
        $this->assertEquals(['id', 'nome', 'sigla'], array_keys($gestorSetor),
            'agendas[].user.setor deveria ter apenas {id, nome, sigla}'
        );

        // Validar estrutura exata de horarios[].reserva (da outra reserva).
        // Sem condicionais: o cenário garante o horário deferido; se ele sumir do payload, o teste deve falhar.
        $this->assertNotEmpty($agendas[0]['horarios'] ?? [], 'O horário deferido do outro solicitante deveria estar presente');
        $horario = $agendas[0]['horarios'][0];
        $this->assertArrayHasKey('reserva', $horario);
        $reservaOutro = $horario['reserva'];
        $this->assertEquals(
            ['id', 'titulo', 'situacao', 'observacao', 'user_id', 'user'],
            array_keys($reservaOutro),
            'horarios[].reserva deveria ter apenas {id, titulo, situacao, observacao, user_id, user}'
        );

        $userSolicitante = $reservaOutro['user'] ?? null;
        $this->assertNotNull($userSolicitante, 'User da reserva deveria estar presente');
        $this->assertEquals(['id', 'name', 'setor_id', 'setor'], array_keys($userSolicitante),
            'horarios[].reserva.user deveria ter apenas {id, name, setor_id, setor}'
        );

        $setorSolicitante = $userSolicitante['setor'] ?? null;
        $this->assertNotNull($setorSolicitante, 'Setor do solicitante deveria estar presente');
        $this->assertEquals(['id', 'nome', 'sigla'], array_keys($setorSolicitante),
            'horarios[].reserva.user.setor deveria ter apenas {id, nome, sigla}'
        );

        // Validar estrutura da reserva sendo editada
        $reservaProp = $response->viewData('page')['props']['reserva'] ?? null;
        $this->assertNotNull($reservaProp, 'Prop reserva deveria estar presente');
        $this->assertArrayHasKey('user', $reservaProp, 'Reserva deveria ter user');
        $userReserva = $reservaProp['user'];
        $this->assertEquals(['id', 'name', 'setor_id', 'setor'], array_keys($userReserva),
            'reserva.user deveria ter apenas {id, name, setor_id, setor}'
        );
    }

    #[Test]
    public function reserva_edit_exibe_email_do_gestor_e_mantem_dados_da_agenda(): void
    {
        $dados = $this->criarReservaEditavelComOutroSolicitante();
        $reserva = $dados['reservaEditavel'];
        $gestor = $dados['gestor'];
        $solicitante2 = $dados['solicitante2'];
        $semana = $dados['semana'];

        $response = $this->actingAs($dados['solicitante1'])
            ->get(route('reservas.edit', ['reserva' => $reserva, 'semana' => $semana]));

        $response->assertOk();

        // E-mail do gestor DEVE aparecer (B31)
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('espaco.agendas')
            ->where('espaco.agendas.0.user.email', $gestor->email)
            ->where('espaco.agendas.0.user.name', $gestor->name)
            ->where('espaco.agendas.0.user.setor.nome', $gestor->setor->nome)
        );

        // Validar que horarios[].reserva tem dados da agenda do outro solicitante
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('espaco.agendas.0.horarios')
            ->where('espaco.agendas.0.horarios.0.reserva.titulo', $solicitante2->email === 'solicitante2@exemplo-teste.local' ? 'Reserva de Outro Solicitante' : null)
            ->where('espaco.agendas.0.horarios.0.reserva.user.name', $solicitante2->name)
            ->where('espaco.agendas.0.horarios.0.reserva.user.setor.nome', $solicitante2->setor->nome)
        );
    }
}
