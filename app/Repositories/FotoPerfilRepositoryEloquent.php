<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class FotoPerfilRepositoryEloquent implements FotoPerfilRepositoryInterface
{
    public function percorrerFotosDeUsuarios(int $tamanhoLote, callable $porLote): void
    {
        User::query()
            ->select(['id', 'profile_pic'])
            ->where('profile_pic', '!=', '')
            ->chunkById($tamanhoLote, function (Collection $usuarios) use ($porLote): void {
                $porLote(array_values($usuarios
                    ->map(fn (User $usuario): array => [
                        'id' => $usuario->id,
                        'caminho' => $this->caminhoBruto($usuario),
                    ])
                    ->all()));
            });
    }

    public function caminhosReferenciados(): array
    {
        return array_values(array_filter(
            User::query()
                ->toBase()
                ->where('profile_pic', '!=', '')
                ->distinct()
                ->pluck('profile_pic')
                ->all(),
            is_string(...),
        ));
    }

    public function trocarFoto(int $id, string $caminhoAtual, string $novoCaminho): bool
    {
        return User::query()
            ->whereKey($id)
            ->where('profile_pic', $caminhoAtual)
            ->update(['profile_pic' => $novoCaminho]) === 1;
    }

    private function caminhoBruto(User $usuario): string
    {
        $caminho = $usuario->getRawOriginal('profile_pic');

        return is_string($caminho) ? $caminho : '';
    }
}
