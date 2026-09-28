<?php

declare(strict_types=1);

namespace Database\Seeders\Production;

use App\Models\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();

        $institucional = Role::firstOrCreate(
            ['name' => 'institucional', 'guard_name' => 'web'],
            ['is_system' => true]
        );

        $gestor = Role::firstOrCreate(
            ['name' => 'gestor', 'guard_name' => 'web'],
            ['is_system' => true]
        );

        Role::firstOrCreate(
            ['name' => 'comum', 'guard_name' => 'web'],
            ['is_system' => true]
        );

        // 'reservas.atualizar' fica de fora deliberadamente: a gestão de reservas
        // (editar dados de terceiros) é exclusiva do gestor da agenda via avaliação.
        // O institucional edita apenas a própria reserva, como qualquer usuário comum
        // (ver ReservaPolicy::update()).
        $institucional->syncPermissions(
            Permission::where('guard_name', 'web')
                ->where('name', '!=', 'reservas.deletar')
                ->where('name', '!=', 'reservas.atualizar')
                ->pluck('name')
                ->toArray()
        );

        $gestor->syncPermissions([
            'usuarios.listar',
            'usuarios.visualizar',
            'reservas.avaliar',
            'secao.dashboard-gestor',
            'secao.gestao-reservas',
            'relatorios.reservas-periodo',
            'relatorios.ocupacao-espacos',
            'relatorios.inventario-espacos',
            'relatorios.escopo-agendas',
            'secao.relatorios',
        ]);
    }
}
