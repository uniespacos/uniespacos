<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InstitucionalRoleAuthorizationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'secao.gestao-roles', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'roles.listar', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'roles.criar', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'roles.atualizar', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'roles.gerenciar-permissoes', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'roles.deletar', 'guard_name' => 'web']);
    }

    public function test_user_without_roles_criar_cannot_create_role(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('secao.gestao-roles');

        $response = $this->actingAs($user)
            ->post(route('institucional.roles.store'), [
                'name' => 'novo-papel-teste',
                'description' => 'Descrição do papel',
            ]);

        $response->assertForbidden();
    }

    public function test_user_with_roles_criar_can_create_role(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['secao.gestao-roles', 'roles.criar']);

        $response = $this->actingAs($user)
            ->post(route('institucional.roles.store'), [
                'name' => 'papel-autorizado-teste',
                'description' => 'Descrição do papel',
            ]);

        $response->assertRedirect(route('institucional.roles.index'));
        $this->assertDatabaseHas('roles', ['name' => 'papel-autorizado-teste']);
    }

    public function test_user_without_roles_atualizar_cannot_update_role(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('secao.gestao-roles');
        $role = Role::create(['name' => 'papel-para-atualizar', 'guard_name' => 'web']);

        $response = $this->actingAs($user)
            ->put(route('institucional.roles.update', $role->id), [
                'name' => 'papel-atualizado-sem-permissao',
            ]);

        $response->assertForbidden();
    }

    public function test_user_with_roles_atualizar_can_update_role(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['secao.gestao-roles', 'roles.atualizar']);
        $role = Role::create(['name' => 'papel-para-atualizar-2', 'guard_name' => 'web']);

        $response = $this->actingAs($user)
            ->from(route('institucional.roles.index'))
            ->put(route('institucional.roles.update', $role->id), [
                'name' => 'papel-atualizado-com-sucesso',
            ]);

        $response->assertRedirect(route('institucional.roles.index'));
        $this->assertDatabaseHas('roles', ['name' => 'papel-atualizado-com-sucesso']);
    }

    public function test_user_without_roles_atualizar_cannot_sync_role_permissions(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['secao.gestao-roles', 'roles.gerenciar-permissoes']);
        $role = Role::create(['name' => 'papel-sync-teste', 'guard_name' => 'web']);
        $permission = Permission::firstOrCreate(['name' => 'usuarios.listar', 'guard_name' => 'web']);

        $response = $this->actingAs($user)
            ->put(route('institucional.roles.syncpermissions', $role->id), [
                'permissions' => [$permission->name],
            ]);

        $response->assertForbidden();
    }

    public function test_user_with_roles_atualizar_and_gerenciar_permissoes_can_sync_role_permissions(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['secao.gestao-roles', 'roles.atualizar', 'roles.gerenciar-permissoes']);
        $role = Role::create(['name' => 'papel-sync-teste-2', 'guard_name' => 'web']);
        $permission = Permission::firstOrCreate(['name' => 'usuarios.listar', 'guard_name' => 'web']);

        $response = $this->actingAs($user)
            ->from(route('institucional.roles.index'))
            ->put(route('institucional.roles.syncpermissions', $role->id), [
                'permissions' => [$permission->name],
            ]);

        $response->assertRedirect(route('institucional.roles.index'));
        $this->assertTrue($role->fresh()->hasPermissionTo('usuarios.listar'));
    }
}
