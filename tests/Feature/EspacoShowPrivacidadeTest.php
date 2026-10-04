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

class EspacoShowPrivacidadeTest extends TestCase
{
    private function criarEspacoComAgendaEReserva(): array
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);

        // Criar setores distintos com nomes/siglas reconhecíveis
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

        // Gestor: email e telefone distintos, com two_factor_secret preenchido
        $gestor = User::factory()->create([
            'setor_id' => $setorGestor->id,
            'email' => 'gestor@exemplo-teste.local',
            'telefone' => '11-9999-9999',
            'two_factor_secret' => 'secret-gestor-12345',
            'two_factor_recovery_codes' => json_encode(['code1', 'code2']),
            'email_verified_at' => now(),
            'profile_pic' => 'gestor.jpg',
        ]);

        // Solicitante: email e telefone distintos
        $solicitante = User::factory()->create([
            'setor_id' => $setorSolicitante->id,
            'email' => 'solicitante@exemplo-teste.local',
            'telefone' => '11-8888-8888',
            'two_factor_secret' => 'secret-solicitante-12345',
            'two_factor_recovery_codes' => json_encode(['code3', 'code4']),
            'email_verified_at' => now(),
            'profile_pic' => 'solicitante.jpg',
        ]);

        // Usuário logado (terceiro)
        $usuarioLogado = User::factory()->create([
            'setor_id' => $setorGestor->id,
            'email' => 'logado@exemplo-teste.local',
            'telefone' => '11-7777-7777',
        ]);

        // Criar espaço sem factory (para evitar criar gestor automático)
        $modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);
        $andar = Andar::factory()->create(['modulo_id' => $modulo->id]);
        $espaco = Espaco::create([
            'andar_id' => $andar->id,
            'nome' => 'Sala de Teste',
            'descricao' => 'Descrição teste',
            'capacidade_pessoas' => 20,
        ]);

        // Criar agenda com gestor
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
            'turno' => 'manha',
        ]);

        // Usar data FIXA de segunda-feira para garantir consistência
        $semana = '2026-06-01'; // segunda-feira

        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'situacao' => 'deferida',
            'data_inicial' => $semana,
            'data_final' => $semana,
            'recorrencia' => 'unica',
            'titulo' => 'Reserva de Teste',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => $semana,
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return [
            'espaco' => $espaco->fresh(),
            'gestor' => $gestor,
            'solicitante' => $solicitante,
            'usuarioLogado' => $usuarioLogado,
            'semana' => $semana,
        ];
    }

    #[Test]
    public function espaco_show_nao_expoe_dados_pessoais_alem_do_email_do_gestor(): void
    {
        // B31: O e-mail do gestor da agenda deve ser visível para agendamento (AgendaHeader.tsx).
        // Solicitantes não devem ter email/telefone expostos.
        $dados = $this->criarEspacoComAgendaEReserva();
        $espaco = $dados['espaco'];
        $gestor = $dados['gestor'];
        $solicitante = $dados['solicitante'];
        $usuarioLogado = $dados['usuarioLogado'];
        $semana = $dados['semana'];

        $response = $this->actingAs($usuarioLogado)
            ->get(route('espacos.show', ['espaco' => $espaco, 'semana' => $semana]));

        $response->assertOk();

        $content = $response->getContent();

        // E-mail do solicitante NÃO deveria estar exposto
        $this->assertStringNotContainsString(
            $solicitante->email,
            $content,
            'Email do solicitante não deveria estar exposto na resposta'
        );

        // Telefone do solicitante NÃO deveria estar exposto
        $this->assertStringNotContainsString(
            $solicitante->telefone,
            $content,
            'Telefone do solicitante não deveria estar exposto na resposta'
        );

        // Telefone do gestor NÃO deveria estar exposto (apenas email é permitido)
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
        $spacoProp = $response->viewData('page')['props']['espaco'] ?? null;
        $this->assertNotNull($spacoProp, 'Prop espaco deveria estar presente');

        // Validar estrutura exata de agendas[].user (gestor)
        $this->assertArrayHasKey('agendas', $spacoProp);
        $agendas = $spacoProp['agendas'];
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

        // Validar estrutura exata de horarios[].reserva.user (solicitante).
        // Sem condicionais: o cenário garante o horário deferido; se ele sumir do payload, o teste deve falhar.
        $this->assertNotEmpty($agendas[0]['horarios'] ?? [], 'O horário deferido do solicitante deveria estar presente');
        $horario = $agendas[0]['horarios'][0];
        $this->assertArrayHasKey('reserva', $horario);
        $reserva = $horario['reserva'];
        $this->assertEquals(
            ['id', 'titulo', 'situacao', 'observacao', 'user_id', 'user'],
            array_keys($reserva),
            'horarios[].reserva deveria ter apenas {id, titulo, situacao, observacao, user_id, user}'
        );

        $userSolicitante = $reserva['user'] ?? null;
        $this->assertNotNull($userSolicitante, 'User da reserva deveria estar presente');
        $this->assertEquals(['id', 'name', 'setor_id', 'setor'], array_keys($userSolicitante),
            'horarios[].reserva.user deveria ter apenas {id, name, setor_id, setor}'
        );

        $setorSolicitante = $userSolicitante['setor'] ?? null;
        $this->assertNotNull($setorSolicitante, 'Setor do solicitante deveria estar presente');
        $this->assertEquals(['id', 'nome', 'sigla'], array_keys($setorSolicitante),
            'horarios[].reserva.user.setor deveria ter apenas {id, nome, sigla}'
        );
    }

    #[Test]
    public function espaco_show_exibe_email_do_gestor_na_agenda(): void
    {
        // B31: Confirma que o e-mail do gestor da agenda está visível
        $dados = $this->criarEspacoComAgendaEReserva();
        $espaco = $dados['espaco'];
        $gestor = $dados['gestor'];
        $usuarioLogado = $dados['usuarioLogado'];
        $semana = $dados['semana'];

        $response = $this->actingAs($usuarioLogado)
            ->get(route('espacos.show', ['espaco' => $espaco, 'semana' => $semana]));

        $response->assertOk();

        // E-mail do gestor DEVE aparecer na resposta
        $this->assertStringContainsString(
            $gestor->email,
            $response->getContent(),
            'Email do gestor deveria estar exposto na resposta (B31)'
        );

        // Verificar estrutura Inertia
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('espaco.agendas.0.user.email', $gestor->email)
            ->where('espaco.agendas.0.user.name', $gestor->name)
            ->where('espaco.agendas.0.user.setor.nome', $gestor->setor->nome)
            ->where('espaco.agendas.0.user.setor.sigla', $gestor->setor->sigla)
        );
    }

    #[Test]
    public function espaco_show_mantem_nome_e_setor_na_agenda(): void
    {
        $dados = $this->criarEspacoComAgendaEReserva();
        $espaco = $dados['espaco'];
        $gestor = $dados['gestor'];
        $usuarioLogado = $dados['usuarioLogado'];
        $semana = $dados['semana'];

        $response = $this->actingAs($usuarioLogado)
            ->get(route('espacos.show', ['espaco' => $espaco, 'semana' => $semana]));

        $response->assertOk();

        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('espaco.agendas')
            // Verificar que o user da agenda tem id, name e setor
            ->where('espaco.agendas.0.user.id', $gestor->id)
            ->where('espaco.agendas.0.user.name', $gestor->name)
            ->where('espaco.agendas.0.user.setor.nome', $gestor->setor->nome)
            ->where('espaco.agendas.0.user.setor.sigla', $gestor->setor->sigla)
        );
    }

    #[Test]
    public function espaco_show_mantem_reserva_e_user_na_agenda(): void
    {
        $dados = $this->criarEspacoComAgendaEReserva();
        $espaco = $dados['espaco'];
        $solicitante = $dados['solicitante'];
        $usuarioLogado = $dados['usuarioLogado'];
        $semana = $dados['semana'];

        $response = $this->actingAs($usuarioLogado)
            ->get(route('espacos.show', ['espaco' => $espaco, 'semana' => $semana]));

        $response->assertOk();

        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('espaco.agendas.0.horarios.0.reserva')
            ->has('espaco.agendas.0.horarios.0.reserva.user')
            // Verificar propriedades da reserva
            ->has('espaco.agendas.0.horarios.0.reserva.id')
            ->has('espaco.agendas.0.horarios.0.reserva.titulo')
            ->has('espaco.agendas.0.horarios.0.reserva.situacao')
            ->where('espaco.agendas.0.horarios.0.reserva.titulo', 'Reserva de Teste')
            // Verificar propriedades do user da reserva
            ->where('espaco.agendas.0.horarios.0.reserva.user.id', $solicitante->id)
            ->where('espaco.agendas.0.horarios.0.reserva.user.name', $solicitante->name)
            // Verificar setor do solicitante (user da reserva)
            ->where('espaco.agendas.0.horarios.0.reserva.user.setor.nome', $solicitante->setor->nome)
            ->where('espaco.agendas.0.horarios.0.reserva.user.setor.sigla', $solicitante->setor->sigla)
        );
    }

    #[Test]
    public function user_serializado_nao_expoe_colunas_de_2fa(): void
    {
        // Criar user com two_factor_secret e two_factor_recovery_codes preenchidos
        $user = User::factory()->create([
            'two_factor_secret' => 'secret-para-teste-12345',
            'two_factor_recovery_codes' => json_encode(['code1', 'code2', 'code3']),
        ]);

        // Validar que toArray() não expõe os atributos 2FA
        $array = $user->toArray();
        $this->assertArrayNotHasKey('two_factor_secret', $array,
            'toArray() não deveria expor two_factor_secret'
        );
        $this->assertArrayNotHasKey('two_factor_recovery_codes', $array,
            'toArray() não deveria expor two_factor_recovery_codes'
        );

        // Validar que toJson() não expõe os atributos 2FA
        $json = $user->toJson();
        $this->assertStringNotContainsString('two_factor_secret', $json,
            'toJson() não deveria expor two_factor_secret'
        );
        $this->assertStringNotContainsString('two_factor_recovery_codes', $json,
            'toJson() não deveria expor two_factor_recovery_codes'
        );

        // Validar que acesso direto ao atributo ainda funciona (defesa em profundidade)
        $this->assertSame('secret-para-teste-12345', $user->two_factor_secret,
            'Acesso direto ao atributo deveria continuar funcionando internamente'
        );
        $this->assertIsString($user->two_factor_recovery_codes);
    }
}
