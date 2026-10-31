<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\Development\EspacoSeeder;
use Database\Seeders\Development\ReservaSeeder;
use Database\Seeders\Development\UserSeeder;
use Illuminate\Support\Collection;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DatabaseSeederAmbienteTest extends TestCase
{
    #[Test]
    public function em_production_nao_cria_usuarios_de_desenvolvimento(): void
    {
        $this->emProducao();
        $usuariosAntes = User::count();

        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])
            ->expectsOutputToContain('Seeders de desenvolvimento ignorados')
            ->assertExitCode(0);

        $this->assertSame($usuariosAntes, User::count());
    }

    #[Test]
    public function em_production_semeia_permissoes_e_papeis(): void
    {
        $this->emProducao();
        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])
            ->assertExitCode(0);

        $this->assertTrue(Permission::count() > 0);
        $this->assertTrue(Role::where('name', 'institucional')->exists());
        $this->assertTrue(Role::where('name', 'gestor')->exists());
        $this->assertTrue(Role::where('name', 'comum')->exists());
    }

    #[Test]
    public function em_production_nao_invoca_os_seeders_de_desenvolvimento(): void
    {
        $this->emProducao();
        $this->espionarSeeders(UserSeeder::class, EspacoSeeder::class, ReservaSeeder::class)
            ->each(fn (MockInterface $mock) => $mock->shouldNotReceive('__invoke'));

        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])
            ->assertExitCode(0);
    }

    #[Test]
    public function em_testing_invoca_os_seeders_de_desenvolvimento(): void
    {
        $this->espionarSeeders(UserSeeder::class, EspacoSeeder::class, ReservaSeeder::class)
            ->each(fn (MockInterface $mock) => $mock->shouldReceive('__invoke')->once());

        $this->seed(DatabaseSeeder::class);
    }

    /**
     * O app é recriado a cada teste, então trocar o ambiente aqui não vaza para outros casos.
     */
    private function emProducao(): void
    {
        $this->app->instance('env', 'production');
    }

    /**
     * Os seeders de desenvolvimento não rodam de verdade aqui: o banco semeado
     * da CI já tem as contas de teste e users.email é único. Um mock com
     * __invoke() prova a chamada sem tocar nos dados.
     *
     * @return Collection<int, MockInterface>
     */
    private function espionarSeeders(string ...$classes): Collection
    {
        return collect($classes)->map(fn (string $classe): MockInterface => $this->mock(
            $classe,
            function (MockInterface $mock): void {
                $mock->shouldReceive('setContainer')->andReturnSelf();
                $mock->shouldReceive('setCommand')->andReturnSelf();
            },
        ));
    }
}
