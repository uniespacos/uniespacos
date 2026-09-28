<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\Role;
use App\Models\User;
use App\Services\RoleService;
use Tests\TestCase;

class RoleServiceTest extends TestCase
{
    private RoleService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(RoleService::class);
    }

    public function test_create_persists_role_with_is_system_false_and_permissions(): void
    {
        $permissionNames = ['espacos.visualizar', 'espacos.listar'];

        $role = $this->service->create([
            'name' => 'Moderador',
            'description' => 'Moderador de espaços',
            'permissions' => $permissionNames,
        ]);

        $this->assertFalse($role->is_system);
        $this->assertSame('Moderador', $role->name);
        $this->assertSame('Moderador de espaços', $role->description);
        $this->assertSame('web', $role->guard_name);

        $persistedRole = Role::findByName('Moderador', 'web');
        $this->assertNotNull($persistedRole);
        $this->assertFalse($persistedRole->is_system);

        $permissionList = $persistedRole->permissions->pluck('name')->toArray();
        foreach ($permissionNames as $permName) {
            $this->assertContains($permName, $permissionList);
        }
    }

    public function test_create_without_permissions_key_creates_role_with_no_permissions(): void
    {
        $role = $this->service->create([
            'name' => 'Espectador',
            'description' => 'Apenas visualiza',
        ]);

        $this->assertFalse($role->is_system);
        $this->assertSame(0, $role->permissions->count());

        $persistedRole = Role::findByName('Espectador', 'web');
        $this->assertSame(0, $persistedRole->permissions->count());
    }

    public function test_update_alters_name_and_description_preserving_absent_keys(): void
    {
        $role = $this->service->create([
            'name' => 'Antigo',
            'description' => 'Descrição antiga',
        ]);

        $updated = $this->service->update($role, [
            'name' => 'Novo',
        ]);

        $this->assertSame('Novo', $updated->name);
        $this->assertSame('Descrição antiga', $updated->description);

        $persistedRole = Role::findByName('Novo', 'web');
        $this->assertSame('Descrição antiga', $persistedRole->description);
    }

    public function test_update_preserves_permissions_when_permissions_key_absent(): void
    {
        $permissionNames = ['usuarios.visualizar', 'usuarios.listar'];
        $role = $this->service->create([
            'name' => 'Original',
            'description' => 'Descrição original',
            'permissions' => $permissionNames,
        ]);

        $updated = $this->service->update($role, [
            'name' => 'Renomeada',
        ]);

        $permissionList = $updated->permissions->pluck('name')->toArray();
        foreach ($permissionNames as $permName) {
            $this->assertContains($permName, $permissionList);
        }

        $persistedRole = Role::findByName('Renomeada', 'web');
        $persistedPermList = $persistedRole->permissions->pluck('name')->toArray();
        foreach ($permissionNames as $permName) {
            $this->assertContains($permName, $persistedPermList);
        }
    }

    public function test_delete_migrates_users_to_comum_and_removes_role(): void
    {
        $customRole = $this->service->create([
            'name' => 'CustomRole',
            'description' => 'Uma role customizada',
        ]);

        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $user1->assignRole($customRole);
        $user2->assignRole($customRole);

        $this->assertTrue($user1->hasRole($customRole));
        $this->assertTrue($user2->hasRole($customRole));

        $deleted = $this->service->delete($customRole);

        $this->assertTrue($deleted);

        $user1->refresh();
        $user2->refresh();

        $this->assertFalse($user1->hasRole($customRole));
        $this->assertFalse($user2->hasRole($customRole));

        $this->assertTrue($user1->hasRole('comum'));
        $this->assertTrue($user2->hasRole('comum'));

        $roleExists = Role::where('name', 'CustomRole')->where('guard_name', 'web')->exists();
        $this->assertFalse($roleExists);
    }
}
