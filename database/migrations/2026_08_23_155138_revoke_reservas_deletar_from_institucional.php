<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        $role = Role::findByName('institucional', 'web');
        $permission = Permission::where('name', 'reservas.deletar')->first();
        if ($permission) {
            $role->revokePermissionTo($permission);
        }
    }

    public function down(): void
    {
        $role = Role::findByName('institucional', 'web');
        $permission = Permission::where('name', 'reservas.deletar')->first();
        if ($permission) {
            $role->givePermissionTo($permission);
        }
    }
};
