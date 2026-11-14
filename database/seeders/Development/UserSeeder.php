<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\Setor;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $setorId = Setor::pluck('id')->random();

        $users = [
            ['name' => 'Institucional', 'email' => 'institucional@gmail.com', 'role' => 'institucional'],
            ['name' => 'Gestor',        'email' => 'gestor@gmail.com',        'role' => 'gestor'],
            ['name' => 'Comum',         'email' => 'comum@gmail.com',         'role' => 'comum'],
        ];

        foreach ($users as $data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'email_verified_at' => now(),
                'profile_pic' => '',
                'telefone' => fake()->phoneNumber(),
                'password' => Hash::make('123123123'),
                'setor_id' => $setorId,
                'remember_token' => Str::random(10),
            ]);

            $user->assignRole($data['role']);
        }

        User::factory()->count(15)->create([
            'password' => Hash::make('123123123'),
        ])->each(fn (User $user) => $user->assignRole('comum'));
    }
}
