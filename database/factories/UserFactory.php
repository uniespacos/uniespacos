<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Setor;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Garante que existe pelo menos um setor antes de tentar buscar um ID aleatório.
        if (Setor::count() === 0) {
            Setor::factory()->create();
        }

        // fake()->unique() só garante ausência de repetição dentro do mesmo método de teste —
        // o TestCase recria a aplicação (e o gerador do Faker) a cada teste, então a marca
        // d'água de "já usado" não sobrevive entre métodos. Com centenas de usuários criados ao
        // longo da suíte, dois testes diferentes eventualmente sorteiam o mesmo nome+domínio e o
        // insert quebra com UniqueConstraintViolationException — intermitente, não relacionado a
        // quem tocou o código por último. Str::random() usa random_bytes() (CSPRNG), não o
        // gerador do Faker, então o sufixo garante unicidade real entre testes.
        [$local, $domain] = explode('@', fake()->safeEmail(), 2);

        return [
            'name' => fake()->name(),
            // O projeto exige e-mail em minúsculas (regra 'lowercase' em
            // ProfileUpdateRequest/StoreRegisterRequest) — Str::random() gera
            // maiúsculas e minúsculas por padrão, então precisa de Str::lower().
            'email' => Str::lower($local.'.'.Str::random(10).'@'.$domain),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'telefone' => fake()->phoneNumber(),
            'profile_pic' => '[https://placehold.co/400x400/000000/FFFFFF?text=](https://placehold.co/400x400/000000/FFFFFF?text=)'.fake()->lexify('??'),
            'setor_id' => Setor::pluck('id')->random(),
            'remember_token' => Str::random(10),
        ];
    }

    public function comRole(string $roleName): static
    {
        return $this->afterCreating(function (User $user) use ($roleName) {
            $user->assignRole($roleName);
        });
    }

    /**
     * Indicate that the user belongs to a setor.
     */
    public function withSetor(): static
    {
        return $this->state(fn (array $attributes) => [
            'setor_id' => Setor::factory(),
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
