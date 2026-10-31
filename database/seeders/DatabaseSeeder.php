<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Database\Seeders\Development\EspacoSeeder;
use Database\Seeders\Development\ReservaSeeder;
use Database\Seeders\Development\UserSeeder;
use Database\Seeders\Production\InstituicaoSeeder;
use Database\Seeders\Production\PermissionSeeder;
use Database\Seeders\Production\RoleSeeder;
use Database\Seeders\Production\SetorSeeder;
use Database\Seeders\Production\UnidadeSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    private const AMBIENTES_DE_DESENVOLVIMENTO = ['local', 'development', 'testing'];

    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            InstituicaoSeeder::class,
            UnidadeSeeder::class,
            SetorSeeder::class,
        ]);

        if (! app()->environment(self::AMBIENTES_DE_DESENVOLVIMENTO)) {
            $this->command?->warn('Seeders de desenvolvimento ignorados no ambiente '.app()->environment().'. Contas de teste não foram criadas.');

            return;
        }

        $this->call([
            UserSeeder::class,
            EspacoSeeder::class,
            ReservaSeeder::class,
        ]);

        $this->sincronizarPapeisDosUsuariosDeTeste();
    }

    /**
     * Roda depois do EspacoSeeder, que pode ter dado papel 'gestor' extra a esses usuários.
     */
    private function sincronizarPapeisDosUsuariosDeTeste(): void
    {
        $usuariosDeTeste = [
            'institucional@gmail.com' => 'institucional',
            'gestor@gmail.com' => 'gestor',
            'comum@gmail.com' => 'comum',
        ];

        foreach ($usuariosDeTeste as $email => $papel) {
            $user = User::where('email', $email)->first();
            $user?->syncRoles([$papel]);
        }
    }
}
