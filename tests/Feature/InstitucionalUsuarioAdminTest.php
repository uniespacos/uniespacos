<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Covers the changes made to optimize the "Gerenciar Usuários" page: server-side
 * pagination/search/filter (replacing a full-collection load), the previously
 * unimplemented edit flow (name/email/telefone), and the new admin-triggered
 * email verification resend / password reset actions.
 */
class InstitucionalUsuarioAdminTest extends TestCase
{
    private function criarAdmin(Setor $setor): User
    {
        $admin = User::factory()->create(['setor_id' => $setor->id]);
        $admin->assignRole('institucional');

        return $admin;
    }

    public function test_index_pagina_a_listagem_de_usuarios(): void
    {
        $setor = Setor::factory()->create();
        $admin = $this->criarAdmin($setor);
        User::factory()->count(14)->create(['setor_id' => $setor->id]);

        $response = $this->actingAs($admin)->get(route('institucional.usuarios.index'));

        $response->assertOk();
        $response->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('users.data', 10)
                ->has('users.links')
        );
    }

    /**
     * A listagem carregava a árvore inteira de instituições e todos os setores
     * com seus usuários/agendas (~700KB por request, dezenas de segundos).
     * Esses dados agora só existem no endpoint de contexto do modal.
     */
    public function test_index_nao_carrega_dados_pesados_do_modal_de_permissoes(): void
    {
        $setor = Setor::factory()->create();
        $admin = $this->criarAdmin($setor);
        User::factory()->count(3)->create(['setor_id' => $setor->id]);

        $response = $this->actingAs($admin)->get(route('institucional.usuarios.index'));

        $response->assertInertia(
            fn (AssertableInertia $page) => $page
                ->missing('instituicoes')
                ->missing('permissionCatalog')
                ->missing('users.data.0.agendas')
                ->missing('users.data.0.permissions')
        );
    }

    public function test_contexto_de_permissoes_traz_agendas_e_catalogo_do_usuario(): void
    {
        $setor = Setor::factory()->create();
        $admin = $this->criarAdmin($setor);
        $usuario = User::factory()->create(['setor_id' => $setor->id]);
        $usuario->assignRole('gestor');

        $response = $this->actingAs($admin)->getJson(route('institucional.usuarios.permission-context', ['usuario' => $usuario->id]));

        $response->assertOk();
        $response->assertJsonStructure([
            'user' => ['id', 'name', 'roles', 'permissions', 'direct_permissions', 'agendas'],
            'instituicoes',
            'permissionCatalog',
        ]);
        $this->assertSame(['gestor'], $response->json('user.roles'));
    }

    public function test_contexto_de_permissoes_exige_autorizacao(): void
    {
        $setor = Setor::factory()->create();
        $comum = User::factory()->create(['setor_id' => $setor->id]);
        $comum->assignRole('comum');
        $alvo = User::factory()->create(['setor_id' => $setor->id]);

        $response = $this->actingAs($comum)->getJson(route('institucional.usuarios.permission-context', ['usuario' => $alvo->id]));

        $this->assertContains($response->status(), [403, 404]);
    }

    public function test_busca_encontra_usuario_fora_da_primeira_pagina(): void
    {
        $setor = Setor::factory()->create();
        $admin = $this->criarAdmin($setor);
        User::factory()->count(14)->create(['setor_id' => $setor->id]);
        User::factory()->create(['setor_id' => $setor->id, 'name' => 'Zelia Buscavel Unica']);

        $response = $this->actingAs($admin)->get(route('institucional.usuarios.index', ['search' => 'Buscavel Unica']));

        $response->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('users.data', 1)
                ->where('users.data.0.name', 'Zelia Buscavel Unica')
        );
    }

    public function test_filtro_por_setor_restringe_a_listagem(): void
    {
        $setorA = Setor::factory()->create();
        $setorB = Setor::factory()->create(['unidade_id' => $setorA->unidade_id]);
        $admin = $this->criarAdmin($setorA);
        User::factory()->count(3)->create(['setor_id' => $setorA->id]);
        User::factory()->count(2)->create(['setor_id' => $setorB->id]);

        $response = $this->actingAs($admin)->get(route('institucional.usuarios.index', ['setor_id' => $setorB->id]));

        $response->assertInertia(fn (AssertableInertia $page) => $page->has('users.data', 2));
    }

    public function test_admin_atualiza_nome_email_e_telefone(): void
    {
        $setor = Setor::factory()->create();
        $admin = $this->criarAdmin($setor);
        $usuario = User::factory()->create(['setor_id' => $setor->id]);

        // O Referer simula o admin editando a partir de uma listagem filtrada:
        // o update precisa devolvê-lo para a mesma busca/página, não para o topo.
        $origem = route('institucional.usuarios.index', ['search' => 'Nome', 'page' => 2]);

        $response = $this->actingAs($admin)
            ->from($origem)
            ->put(route('institucional.usuarios.update', ['usuario' => $usuario->id]), [
                'name' => 'Nome Atualizado',
                'email' => 'atualizado@example.com',
                'phone' => '(11) 90000-0000',
            ]);

        $response->assertRedirect($origem);
        $response->assertSessionHas('success');
        $usuario->refresh();
        $this->assertSame('Nome Atualizado', $usuario->name);
        $this->assertSame('atualizado@example.com', $usuario->email);
        $this->assertSame('(11) 90000-0000', $usuario->telefone);
    }

    public function test_reenvia_verificacao_para_usuario_nao_verificado(): void
    {
        Notification::fake();

        $setor = Setor::factory()->create();
        $admin = $this->criarAdmin($setor);
        $usuario = User::factory()->create(['setor_id' => $setor->id, 'email_verified_at' => null]);

        $response = $this->actingAs($admin)->post(route('institucional.usuarios.resend-verification', ['usuario' => $usuario->id]));

        $response->assertRedirect();
        $response->assertSessionHas('success');
        Notification::assertSentTo($usuario, VerifyEmail::class);
    }

    public function test_nao_reenvia_verificacao_para_usuario_ja_verificado(): void
    {
        Notification::fake();

        $setor = Setor::factory()->create();
        $admin = $this->criarAdmin($setor);
        $usuario = User::factory()->create(['setor_id' => $setor->id, 'email_verified_at' => now()]);

        $response = $this->actingAs($admin)->post(route('institucional.usuarios.resend-verification', ['usuario' => $usuario->id]));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        Notification::assertNothingSent();
    }

    public function test_solicita_redefinicao_de_senha(): void
    {
        Notification::fake();

        $setor = Setor::factory()->create();
        $admin = $this->criarAdmin($setor);
        $usuario = User::factory()->create(['setor_id' => $setor->id]);

        $response = $this->actingAs($admin)->post(route('institucional.usuarios.reset-password', ['usuario' => $usuario->id]));

        $response->assertRedirect();
        $response->assertSessionHas('success');
        Notification::assertSentTo($usuario, ResetPassword::class);
    }
}
