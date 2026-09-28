<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Revoga a permissão 'reservas.atualizar' do role 'institucional' (admin).
     *
     * A gestão de reservas (editar dados de terceiros) é exclusiva do gestor
     * de agenda via avaliação. O admin edita apenas a própria reserva, igual
     * a um usuário comum (ver ReservaPolicy::update()).
     *
     * A permissão continua existindo na tabela — apenas não é mais concedida
     * ao institucional — porque ReservaPolicy::update() chama
     * hasPermissionTo('reservas.atualizar') incondicionalmente para todo
     * usuário; deletar a permissão faria essa chamada lançar
     * PermissionDoesNotExist para qualquer edição de reserva.
     */
    public function up(): void
    {
        $role = Role::where('name', 'institucional')->where('guard_name', 'web')->first();
        $permission = Permission::where('name', 'reservas.atualizar')->where('guard_name', 'web')->first();

        if ($role && $permission) {
            $role->revokePermissionTo($permission);
        }
    }

    /**
     * Devolve a permissão ao role institucional (estado anterior).
     */
    public function down(): void
    {
        $role = Role::where('name', 'institucional')->where('guard_name', 'web')->first();
        $permission = Permission::where('name', 'reservas.atualizar')->where('guard_name', 'web')->first();

        if ($role && $permission) {
            $role->givePermissionTo($permission);
        }
    }
};
