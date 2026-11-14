<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Setor;
use App\Models\User;
use App\Notifications\UserAssignedAsManagerNotification;
use App\Notifications\UserRemovedAsManagerNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class InstitucionalUsuarioPermissoesPapeisAcumuladosTest extends TestCase
{
    private Setor $setor;

    private Espaco $espaco;

    private User $institucional;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-06-15 10:00:00'));

        $this->setor = Setor::factory()->create();
        User::factory()->create(['setor_id' => $this->setor->id]);
        $this->espaco = Espaco::factory()->create();

        $this->institucional = User::factory()->create(['setor_id' => $this->setor->id]);
        $this->institucional->assignRole('institucional');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_usuario_com_comum_e_gestor_mantem_os_dois_papeis_e_as_agendas_ao_salvar_comum_e_depois_gestor(): void
    {
        $alvo = $this->criarUsuarioComPapeis(['comum', 'gestor']);
        $agenda1 = $this->criarAgenda($alvo);
        $agenda2 = $this->criarAgenda($alvo);

        $this->salvarPermissoes($alvo, 'comum', [$agenda1, $agenda2])->assertSessionHas('success');

        $this->assertPapeis($alvo, ['comum', 'gestor']);
        $this->assertDonoDaAgenda($agenda1, $alvo);
        $this->assertDonoDaAgenda($agenda2, $alvo);

        $this->salvarPermissoes($alvo, 'gestor', [$agenda1, $agenda2])->assertSessionHas('success');

        $this->assertPapeis($alvo, ['comum', 'gestor']);
        $this->assertDonoDaAgenda($agenda1, $alvo);
        $this->assertDonoDaAgenda($agenda2, $alvo);
    }

    public function test_usuario_com_dois_papeis_desvincula_so_a_agenda_que_a_request_deixou_de_listar(): void
    {
        $alvo = $this->criarUsuarioComPapeis(['comum', 'gestor']);
        $agenda1 = $this->criarAgenda($alvo);
        $agenda2 = $this->criarAgenda($alvo);
        Notification::fake();

        $this->salvarPermissoes($alvo, 'gestor', [$agenda1])->assertSessionHas('success');

        $this->assertPapeis($alvo, ['comum', 'gestor']);
        $this->assertDonoDaAgenda($agenda1, $alvo);
        $this->assertDonoDaAgenda($agenda2, null);
        Notification::assertNotSentTo($alvo, UserRemovedAsManagerNotification::class);
    }

    public function test_papel_unico_comum_vira_gestor_vincula_as_agendas_e_notifica_atribuicao(): void
    {
        $alvo = $this->criarUsuarioComPapeis(['comum']);
        $agenda1 = $this->criarAgenda(null);
        $agenda2 = $this->criarAgenda(null);
        Notification::fake();

        $this->salvarPermissoes($alvo, 'gestor', [$agenda1, $agenda2])->assertSessionHas('success');

        $this->assertPapeis($alvo, ['gestor']);
        $this->assertDonoDaAgenda($agenda1, $alvo);
        $this->assertDonoDaAgenda($agenda2, $alvo);
        Notification::assertSentTo($alvo, UserAssignedAsManagerNotification::class);
        Notification::assertNotSentTo($alvo, UserRemovedAsManagerNotification::class);
    }

    public function test_papel_unico_gestor_vira_comum_desvincula_as_agendas_e_notifica_remocao(): void
    {
        $alvo = $this->criarUsuarioComPapeis(['gestor']);
        $agenda1 = $this->criarAgenda($alvo);
        $agenda2 = $this->criarAgenda($alvo);
        Notification::fake();

        $this->salvarPermissoes($alvo, 'comum', [])->assertSessionHas('success');

        $this->assertPapeis($alvo, ['comum']);
        $this->assertDonoDaAgenda($agenda1, null);
        $this->assertDonoDaAgenda($agenda2, null);
        Notification::assertSentTo($alvo, UserRemovedAsManagerNotification::class);
        Notification::assertNotSentTo($alvo, UserAssignedAsManagerNotification::class);
    }

    public function test_papel_unico_comum_sem_mudanca_nao_notifica_remocao(): void
    {
        $alvo = $this->criarUsuarioComPapeis(['comum']);
        Notification::fake();

        $this->salvarPermissoes($alvo, 'comum', [])->assertSessionHas('success');

        $this->assertPapeis($alvo, ['comum']);
        Notification::assertNotSentTo($alvo, UserRemovedAsManagerNotification::class);
        Notification::assertNotSentTo($alvo, UserAssignedAsManagerNotification::class);
    }

    public function test_papel_unico_gestor_sem_mudanca_nao_reenvia_atribuicao(): void
    {
        $alvo = $this->criarUsuarioComPapeis(['gestor']);
        $agenda = $this->criarAgenda($alvo);
        Notification::fake();

        $this->salvarPermissoes($alvo, 'gestor', [$agenda])->assertSessionHas('success');

        $this->assertPapeis($alvo, ['gestor']);
        $this->assertDonoDaAgenda($agenda, $alvo);
        Notification::assertNotSentTo($alvo, UserAssignedAsManagerNotification::class);
        Notification::assertNotSentTo($alvo, UserRemovedAsManagerNotification::class);
    }

    public function test_papel_unico_gestor_que_ganha_agenda_nova_recebe_notificacao_de_atribuicao(): void
    {
        $alvo = $this->criarUsuarioComPapeis(['gestor']);
        $agenda1 = $this->criarAgenda($alvo);
        $agenda2 = $this->criarAgenda(null);
        Notification::fake();

        $this->salvarPermissoes($alvo, 'gestor', [$agenda1, $agenda2])->assertSessionHas('success');

        $this->assertPapeis($alvo, ['gestor']);
        $this->assertDonoDaAgenda($agenda2, $alvo);
        Notification::assertSentTo($alvo, UserAssignedAsManagerNotification::class);
        Notification::assertNotSentTo($alvo, UserRemovedAsManagerNotification::class);
    }

    /**
     * @param  array<int, string>  $papeis
     */
    private function criarUsuarioComPapeis(array $papeis): User
    {
        $usuario = User::factory()->create(['setor_id' => $this->setor->id]);
        $usuario->assignRole($papeis);

        return $usuario;
    }

    private function criarAgenda(?User $responsavel): Agenda
    {
        return Agenda::create([
            'espaco_id' => $this->espaco->id,
            'turno' => 'manha',
            'user_id' => $responsavel?->id,
        ]);
    }

    /**
     * @param  array<int, Agenda>  $agendas
     */
    private function salvarPermissoes(User $alvo, string $papel, array $agendas): TestResponse
    {
        return $this->actingAs($this->institucional)
            ->put(route('institucional.usuarios.updatepermissions', ['user' => $alvo->id]), [
                'role_name' => $papel,
                'agendas' => array_map(fn (Agenda $agenda): int => $agenda->id, $agendas),
            ]);
    }

    /**
     * @param  array<int, string>  $esperados
     */
    private function assertPapeis(User $usuario, array $esperados): void
    {
        $this->assertEqualsCanonicalizing($esperados, $usuario->fresh()->getRoleNames()->all());
    }

    private function assertDonoDaAgenda(Agenda $agenda, ?User $esperado): void
    {
        $this->assertSame($esperado?->id, $agenda->fresh()->user_id);
    }
}
