<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    /**
     * Ver qualquer lista de usuários
     * Permite se for Institucional (1) ou Gestor (2)
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('usuarios.listar');
    }

    /**
     *   Ver um usuário específico
     * - Institucional (1) e Gestor (2) podem ver qualquer usuário
     * - O próprio usuário pode ver o seu perfil
     */
    public function view(User $user, User $model): bool
    {
        return $user->id === $model->id
            || $user->hasPermissionTo('usuarios.visualizar');
    }

    /**
     *  Criar usuários
     * Apenas Institucional (1) pode criar usuários
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('usuarios.criar');
    }

    /**
     *  Atualizar usuários
     * - O próprio usuário pode atualizar o seu perfil
     * - Conta anonimizada não é mais editável, nem por ela mesma nem pelo institucional
     */
    public function update(User $user, User $model): Response
    {
        if ($model->estaAnonimizado()) {
            return $this->negarContaAnonimizada();
        }

        return $user->id === $model->id || $user->hasPermissionTo('usuarios.atualizar')
            ? Response::allow()
            : Response::deny();
    }

    /**
     *  Atualizar permissões de outro usuário
     * Conta anonimizada não recebe papel nem permissão
     */
    public function updatePermissions(User $user, User $model): Response
    {
        if ($model->estaAnonimizado()) {
            return $this->negarContaAnonimizada();
        }

        return $user->hasPermissionTo('usuarios.gerenciar-permissoes')
            ? Response::allow()
            : Response::deny();
    }

    /**
     *  Deletar usuários
     * Apenas Institucional (1) pode deletar
     * Conta já anonimizada não é excluída de novo
     */
    public function delete(User $user, User $model): Response
    {
        if ($model->estaAnonimizado()) {
            return $this->negarContaAnonimizada();
        }

        return $user->hasPermissionTo('usuarios.deletar')
            ? Response::allow()
            : Response::deny();
    }

    /**
     *  Restaurar usuários
     * Apenas Institucional (1) pode
     */
    public function restore(User $user, User $model): bool
    {
        return $user->hasPermissionTo('usuarios.deletar');
    }

    /**
     *  Deletar permanentemente usuários
     * Apenas Institucional (1) pode
     */
    public function forceDelete(User $user, User $model): bool
    {
        return $user->hasPermissionTo('usuarios.deletar');
    }

    /**
     *  Permissão personalizada: é Comum?
     */
    public function isComum(User $user): bool
    {
        return ! $user->hasAnyPermission(['secao.gestao-reservas', 'secao.dashboard-institucional']);
    }

    /**
     *  Permissão personalizada: é Gestor?
     */
    public function isGestor(User $user): bool
    {
        return $user->hasPermissionTo('secao.gestao-reservas');
    }

    /**
     *  Permissão personalizada: é Institucional?
     */
    public function isInstitucional(User $user): bool
    {
        return $user->hasPermissionTo('secao.dashboard-institucional');
    }

    private function negarContaAnonimizada(): Response
    {
        return Response::deny(__('This account is anonymized and can no longer be changed.'));
    }
}
