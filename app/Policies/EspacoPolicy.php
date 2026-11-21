<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Espaco;
use App\Models\User;

class EspacoPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('espacos.listar');
    }

    public function view(User $user, Espaco $espaco): bool
    {
        return $user->hasPermissionTo('espacos.visualizar');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('espacos.criar');
    }

    public function update(User $user, Espaco $espaco): bool
    {
        return $user->hasPermissionTo('espacos.atualizar');
    }

    public function updateGestores(User $user, Espaco $espaco): bool
    {
        return $user->hasPermissionTo('espacos.alterar-gestores');
    }

    public function delete(User $user, Espaco $espaco): bool
    {
        return $user->hasPermissionTo('espacos.deletar');
    }

    public function restore(User $user, Espaco $espaco): bool
    {
        return false;
    }

    public function forceDelete(User $user, Espaco $espaco): bool
    {
        return false;
    }
}
