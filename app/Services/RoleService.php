<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use App\Repositories\PermissionRepositoryInterface;
use App\Repositories\RoleRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

class RoleService
{
    public function __construct(
        protected RoleRepositoryInterface $repoRole,
        protected PermissionRepositoryInterface $repoPermission,
    ) {}

    /**
     * Returns roles with eager-loaded permissions/counts and all permissions grouped.
     *
     * @return array{roles: array<int, array<string, mixed>>, permissions: array<string, array<int, array{id: int, name: string, group: string}>>}
     */
    /**
     * @return array<string, array<int, array{id: int, name: string, group: string}>>
     */
    public function getGroupedPermissions(): array
    {
        return $this->repoPermission->getAllGroupedByPrefix();
    }

    public function getIndexData(): array
    {
        $roles = $this->repoRole->getAllWithCounts()
            ->map(fn (Role $role) => array_merge($role->toArray(), [
                'permissions' => $role->permissions->pluck('name')->toArray(),
            ]))
            ->toArray();

        $permissions = $this->repoPermission->getAllGroupedByPrefix();

        return [
            'roles' => $roles,
            'permissions' => $permissions,
        ];
    }

    public function create(array $data): Role
    {
        return DB::transaction(function () use ($data) {
            $role = $this->repoRole->create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'guard_name' => 'web',
                'is_system' => false,
            ]);

            if (isset($data['permissions']) && is_array($data['permissions'])) {
                $role->syncPermissions($data['permissions']);
            }

            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return $role;
        });
    }

    public function update(Role $role, array $data): Role
    {
        return DB::transaction(function () use ($role, $data) {
            $this->repoRole->update($role, [
                'name' => $data['name'] ?? $role->name,
                'description' => $data['description'] ?? $role->description,
            ]);

            if (array_key_exists('permissions', $data)) {
                $role->syncPermissions($data['permissions'] ?? []);
            }

            $role->refresh();

            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return $role;
        });
    }

    public function delete(Role $role): bool
    {
        return DB::transaction(function () use ($role) {
            $commonRole = Role::findByName('comum', 'web');

            User::role($role)->get()->each(function (User $user) use ($role, $commonRole) {
                $user->removeRole($role);
                if (! $user->hasRole($commonRole)) {
                    $user->assignRole($commonRole);
                }
            });

            $deleted = $this->repoRole->delete($role);

            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return $deleted;
        });
    }

    public function syncPermissions(Role $role, array $permissionNames): Role
    {
        return DB::transaction(function () use ($role, $permissionNames) {
            $role->syncPermissions($permissionNames);

            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return $role->refresh();
        });
    }
}
