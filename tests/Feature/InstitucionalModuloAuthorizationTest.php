<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InstitucionalModuloAuthorizationTest extends TestCase
{
    protected Unidade $unidade;

    protected Setor $setor;

    protected Modulo $modulo;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'secao.gestao-modulos', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'modulos.listar', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'modulos.criar', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'modulos.atualizar', 'guard_name' => 'web']);

        $instituicao = Instituicao::factory()->create();
        $this->unidade = Unidade::factory()->create([
            'instituicao_id' => $instituicao->id,
        ]);
        $this->setor = Setor::factory()->create([
            'unidade_id' => $this->unidade->id,
        ]);
        $this->modulo = Modulo::factory()->create([
            'nome' => 'Módulo Original',
            'unidade_id' => $this->unidade->id,
        ]);
        $this->modulo->andars()->create([
            'nome' => 'terreo',
            'tipo_acesso' => ['terreo'],
        ]);
    }

    public function test_user_with_only_modulos_atualizar_can_update_modulo(): void
    {
        $user = User::factory()->create(['setor_id' => $this->setor->id]);
        $user->givePermissionTo(['secao.gestao-modulos', 'modulos.atualizar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.modulos.update', $this->modulo->id), [
                'nome' => 'Módulo Atualizado',
                'unidade_id' => $this->unidade->id,
                'andares' => [
                    [
                        'nome' => 'terreo',
                        'tipo_acesso' => ['terreo', 'rampa'],
                    ],
                ],
            ]);

        $response->assertRedirect(route('institucional.modulos.index'));
        $this->assertDatabaseHas('modulos', [
            'id' => $this->modulo->id,
            'nome' => 'Módulo Atualizado',
        ]);
    }

    public function test_user_with_only_modulos_criar_cannot_update_modulo(): void
    {
        $user = User::factory()->create(['setor_id' => $this->setor->id]);
        $user->givePermissionTo(['secao.gestao-modulos', 'modulos.criar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.modulos.update', $this->modulo->id), [
                'nome' => 'Módulo Não Autorizado',
                'unidade_id' => $this->unidade->id,
                'andares' => [
                    [
                        'nome' => 'terreo',
                        'tipo_acesso' => ['terreo'],
                    ],
                ],
            ]);

        $response->assertForbidden();
        $this->assertDatabaseHas('modulos', [
            'id' => $this->modulo->id,
            'nome' => 'Módulo Original',
        ]);
    }
}
