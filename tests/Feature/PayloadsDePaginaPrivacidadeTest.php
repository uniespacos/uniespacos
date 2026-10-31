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
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PayloadsDePaginaPrivacidadeTest extends TestCase
{
    private const SEMANA = '2026-06-01';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::now());
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function assertChavesExatas(array $esperadas, array $obtido, string $mensagem = ''): void
    {
        $esperadas = array_values($esperadas);
        $obtido = array_values(array_keys($obtido));
        sort($esperadas);
        sort($obtido);

        $this->assertSame($esperadas, $obtido, $mensagem);
    }

    private function unidadeComSetor(): Setor
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);

        return Setor::factory()->create(['unidade_id' => $unidade->id]);
    }

    private function espacoComAgenda(User $gestor, Setor $setor): array
    {
        $modulo = Modulo::factory()->create(['unidade_id' => $setor->unidade_id]);
        $andar = Andar::factory()->create(['modulo_id' => $modulo->id]);
        $espaco = Espaco::create([
            'andar_id' => $andar->id,
            'nome' => 'Sala de Payload',
            'descricao' => 'Descrição',
            'capacidade_pessoas' => 20,
        ]);
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
            'turno' => 'manha',
        ]);

        return [$espaco, $agenda];
    }

    private function admin(Setor $setor): User
    {
        $admin = User::factory()->create([
            'setor_id' => $setor->id,
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('institucional');

        return $admin;
    }

    #[Test]
    public function reservas_index_modal_nao_expoe_telefone_nem_foto_do_gestor_da_agenda(): void
    {
        $setor = $this->unidadeComSetor();

        $gestor = User::factory()->create([
            'setor_id' => $setor->id,
            'email' => 'gestor-modal@exemplo-teste.local',
            'telefone' => '11-5555-0001',
            'profile_pic' => 'gestor-modal.jpg',
        ]);
        $solicitante = User::factory()->create([
            'setor_id' => $setor->id,
            'email_verified_at' => now(),
        ]);

        [, $agenda] = $this->espacoComAgenda($gestor, $setor);

        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'situacao' => 'em_analise',
            'data_inicial' => self::SEMANA,
            'data_final' => self::SEMANA,
            'recorrencia' => 'unica',
            'titulo' => 'Reserva do Modal',
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => self::SEMANA,
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        $response = $this->actingAs($solicitante)
            ->get(route('reservas.index', ['reserva' => $reserva->id, 'semana' => self::SEMANA]));

        $response->assertOk();
        $horarios = $response->viewData('page')['props']['reservaToShow']['horarios'];
        $this->assertCount(1, $horarios);

        $gestorPayload = $horarios[0]['agenda']['user'];
        $this->assertChavesExatas(['id', 'name', 'email', 'setor_id'], $gestorPayload,
            'agenda.user do modal deveria ter só id, name, email e setor_id');
        $this->assertSame($gestor->id, $gestorPayload['id']);
        $this->assertArrayNotHasKey('telefone', $gestorPayload);
        $this->assertArrayNotHasKey('profile_pic', $gestorPayload);
    }

    #[Test]
    public function auth_user_expoe_contagem_de_notificacoes_e_nunca_a_lista(): void
    {
        $setor = $this->unidadeComSetor();
        $usuario = User::factory()->create(['setor_id' => $setor->id, 'email_verified_at' => now()]);

        foreach (range(1, 3) as $indice) {
            $usuario->notifications()->create([
                'id' => (string) Str::uuid(),
                'type' => 'App\\Notifications\\Teste',
                'data' => ['mensagem' => 'nao-lida-'.$indice],
                'read_at' => null,
            ]);
        }
        $usuario->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\Teste',
            'data' => ['mensagem' => 'ja-lida'],
            'read_at' => now(),
        ]);

        $response = $this->actingAs($usuario)->get(route('dashboard'));

        $response->assertOk();
        $authUser = $response->viewData('page')['props']['auth']['user'];

        $this->assertArrayNotHasKey('unread_notifications', $authUser);
        $this->assertSame(3, $authUser['unread_notifications_count']);
    }

    #[Test]
    public function combobox_de_gestores_da_listagem_de_espacos_recebe_so_as_colunas_usadas(): void
    {
        $setor = $this->unidadeComSetor();
        $admin = $this->admin($setor);

        $gestor = User::factory()->create([
            'setor_id' => $setor->id,
            'email' => 'combo-gestor@exemplo-teste.local',
            'telefone' => '11-5555-0002',
            'profile_pic' => 'combo.jpg',
        ]);
        $this->espacoComAgenda($gestor, $setor);

        $response = $this->actingAs($admin)->get(route('institucional.espacos.index'));

        $response->assertOk();
        $usuarios = $response->viewData('page')['props']['users'];
        $gestorPayload = collect($usuarios)->firstWhere('id', $gestor->id);

        $this->assertNotNull($gestorPayload, 'O gestor deveria estar na lista de usuários');
        $this->assertChavesExatas(
            ['id', 'name', 'email', 'profile_pic', 'setor_id', 'agendas', 'setor'],
            $gestorPayload,
            'users deveria ter só as colunas do combobox e as relações agendas e setor'
        );
        $this->assertArrayNotHasKey('telefone', $gestorPayload);
        $this->assertArrayNotHasKey('email_verified_at', $gestorPayload);
        $this->assertChavesExatas(['id', 'espaco_id', 'turno', 'user_id'], $gestorPayload['agendas'][0]);
        $this->assertChavesExatas(['id', 'nome', 'sigla'], $gestorPayload['setor']);
    }

    #[Test]
    public function listagem_de_espacos_admin_expoe_no_gestor_apenas_id_nome_e_foto(): void
    {
        $setor = $this->unidadeComSetor();
        $admin = $this->admin($setor);

        $gestor = User::factory()->create([
            'setor_id' => $setor->id,
            'email' => 'lista-gestor@exemplo-teste.local',
            'telefone' => '11-5555-0003',
            'profile_pic' => 'lista-gestor.jpg',
        ]);
        [$espaco] = $this->espacoComAgenda($gestor, $setor);

        $response = $this->actingAs($admin)->get(route('institucional.espacos.index'));

        $response->assertOk();
        $espacos = $response->viewData('page')['props']['espacos']['data'];
        $espacoPayload = collect($espacos)->firstWhere('id', $espaco->id);

        $this->assertNotNull($espacoPayload, 'O espaço deveria estar na listagem');
        $this->assertChavesExatas(['id', 'espaco_id', 'turno', 'user_id', 'user'], $espacoPayload['agendas'][0]);
        $this->assertChavesExatas(['id', 'name', 'profile_pic'], $espacoPayload['agendas'][0]['user']);
        $this->assertSame($gestor->id, $espacoPayload['agendas'][0]['user']['id']);
    }

    #[Test]
    public function dashboard_institucional_expoe_so_o_que_desenha_dos_usuarios_e_gestores(): void
    {
        $setor = $this->unidadeComSetor();
        $admin = $this->admin($setor);
        $admin->givePermissionTo('secao.dashboard-institucional');

        $gestor = User::factory()->create([
            'setor_id' => $setor->id,
            'email' => 'dash-gestor@exemplo-teste.local',
            'telefone' => '11-5555-0004',
            'profile_pic' => 'dash-gestor.jpg',
        ]);
        $gestor->givePermissionTo('secao.gestao-reservas');
        [$espaco] = $this->espacoComAgenda($gestor, $setor);

        $response = $this->actingAs($admin)->get(route('dashboard'));

        $response->assertOk();
        $props = $response->viewData('page')['props'];

        $gestorPayload = collect($props['gestores'])->firstWhere('id', $gestor->id);
        $this->assertNotNull($gestorPayload, 'O gestor deveria estar no dashboard');
        $this->assertChavesExatas(['id', 'name', 'email'], $gestorPayload, 'gestores deveria ter só id, name e email');
        $this->assertArrayNotHasKey('telefone', $gestorPayload);

        foreach ($props['users'] as $usuario) {
            $this->assertChavesExatas(['id', 'name'], $usuario, 'users deveria ter só id e name');
        }

        $espacoPayload = collect($props['espacos'])->firstWhere('id', $espaco->id);
        $this->assertNotNull($espacoPayload, 'O espaço deveria estar no dashboard');
        $this->assertChavesExatas(['id', 'espaco_id', 'turno', 'user_id', 'user'], $espacoPayload['agendas'][0]);
        $this->assertChavesExatas(['id', 'name'], $espacoPayload['agendas'][0]['user']);
    }
}
