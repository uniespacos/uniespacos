<?php

declare(strict_types=1);

namespace Database\Seeders\Production;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    private const PERMISSIONS = [
        // Usuários
        'usuarios.listar',
        'usuarios.visualizar',
        'usuarios.criar',
        'usuarios.atualizar',
        'usuarios.deletar',
        'usuarios.gerenciar-permissoes',
        'usuarios.gerenciar-permissoes-diretas',
        // Espaços
        'espacos.listar',
        'espacos.visualizar',
        'espacos.criar',
        'espacos.atualizar',
        'espacos.deletar',
        'espacos.alterar-gestores',
        // Reservas
        'reservas.listar',
        'reservas.visualizar',
        'reservas.deletar',
        'reservas.avaliar',
        // Roles
        'roles.listar',
        'roles.visualizar',
        'roles.criar',
        'roles.atualizar',
        'roles.deletar',
        'roles.gerenciar-permissoes',
        // Instituições
        'instituicoes.listar',
        'instituicoes.visualizar',
        'instituicoes.criar',
        'instituicoes.atualizar',
        'instituicoes.deletar',
        // Unidades
        'unidades.listar',
        'unidades.visualizar',
        'unidades.criar',
        'unidades.atualizar',
        'unidades.deletar',
        // Módulos
        'modulos.listar',
        'modulos.visualizar',
        'modulos.criar',
        'modulos.atualizar',
        'modulos.deletar',
        // Setores
        'setores.listar',
        'setores.visualizar',
        'setores.criar',
        'setores.atualizar',
        'setores.deletar',
        // Andares
        'andares.criar',
        'andares.atualizar',
        // Sistema
        'sistema.telescope',
        // Relatórios
        'relatorios.reservas-periodo',
        'relatorios.ocupacao-espacos',
        'relatorios.inventario-espacos',
        'relatorios.indicadores-consolidados',
        'relatorios.escopo-instituicao',
        'relatorios.escopo-agendas',
        // Seções (UI access control)
        'secao.dashboard-institucional',
        'secao.dashboard-gestor',
        'secao.gestao-reservas',
        'secao.gestao-espacos',
        'secao.gestao-usuarios',
        'secao.gestao-instituicoes',
        'secao.gestao-unidades',
        'secao.gestao-modulos',
        'secao.gestao-setores',
        'secao.gestao-roles',
        'secao.relatorios',
    ];

    public function run(): void
    {
        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }
    }
}
