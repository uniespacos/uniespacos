<?php

declare(strict_types=1);

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permInst = Permission::firstOrCreate(['name' => 'relatorios.escopo-instituicao', 'guard_name' => 'web']);
        $permGest = Permission::firstOrCreate(['name' => 'relatorios.escopo-agendas', 'guard_name' => 'web']);

        $roleInst = Role::where('name', 'institucional')->where('guard_name', 'web')->first();
        if ($roleInst) {
            $roleInst->givePermissionTo($permInst);
        }

        $roleGest = Role::where('name', 'gestor')->where('guard_name', 'web')->first();
        if ($roleGest) {
            $roleGest->givePermissionTo($permGest);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::whereIn('name', ['relatorios.escopo-instituicao', 'relatorios.escopo-agendas'])->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
