<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Instituicao;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InstitucionalSetorTest extends TestCase
{
    protected Instituicao $instituicao;

    protected Unidade $unidade;

    protected Setor $setor;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'secao.gestao-setores', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'setores.listar', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'setores.visualizar', 'guard_name' => 'web']);

        $this->instituicao = Instituicao::factory()->create();
        $this->unidade = Unidade::factory()->create(['instituicao_id' => $this->instituicao->id]);
        $this->setor = Setor::factory()->create(['unidade_id' => $this->unidade->id]);

        $this->admin = User::factory()->create(['setor_id' => $this->setor->id]);
        $this->admin->givePermissionTo(['secao.gestao-setores', 'setores.listar', 'setores.visualizar']);
    }

    public function test_index_does_not_return_all_users_payload(): void
    {
        User::factory()->count(5)->create(['setor_id' => $this->setor->id]);

        $response = $this->actingAs($this->admin)->get(route('institucional.setors.index'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('instituicao')
            ->has('unidades')
            ->has('setores')
            ->missing('usuarios')
        );
    }

    public function test_index_paginates_setores_and_filters_by_search(): void
    {
        Setor::factory()->create(['unidade_id' => $this->unidade->id, 'nome' => 'Almoxarifado Geral', 'sigla' => 'ALMOX']);
        Setor::factory()->create(['unidade_id' => $this->unidade->id, 'nome' => 'Recursos Humanos', 'sigla' => 'RH']);

        $response = $this->actingAs($this->admin)->get(route('institucional.setors.index', ['search' => 'Almoxarifado']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('setores.data', 1)
            ->where('setores.data.0.sigla', 'ALMOX')
            ->where('filters.search', 'Almoxarifado')
        );
    }

    public function test_usuarios_endpoint_returns_json_users_for_sector(): void
    {
        $user1 = User::factory()->create(['setor_id' => $this->setor->id, 'name' => 'Usuario Alfa']);
        $user2 = User::factory()->create(['setor_id' => $this->setor->id, 'name' => 'Usuario Beta']);

        $otherSetor = Setor::factory()->create(['unidade_id' => $this->unidade->id]);
        $userOther = User::factory()->create(['setor_id' => $otherSetor->id, 'name' => 'Outro Usuario']);

        $response = $this->actingAs($this->admin)->getJson(route('institucional.setors.usuarios', $this->setor->id));

        $response->assertOk();
        $response->assertJsonCount(3); // admin + user1 + user2
        $response->assertJsonFragment(['name' => 'Usuario Alfa']);
        $response->assertJsonFragment(['name' => 'Usuario Beta']);
        $response->assertJsonMissing(['name' => 'Outro Usuario']);
    }

    public function test_usuarios_endpoint_requires_permission(): void
    {
        $commonUser = User::factory()->create();

        $response = $this->actingAs($commonUser)->getJson(route('institucional.setors.usuarios', $this->setor->id));

        $response->assertForbidden();
    }
}
