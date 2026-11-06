<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Setor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $setor = Setor::factory()->create();
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'phone' => '7799999999',
            'setor_id' => $setor->id,
        ]);

        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticated();

        // After redirecting to dashboard, the verified middleware should kick in
        $dashboardResponse = $this->get(route('dashboard'));
        $dashboardResponse->assertRedirect(route('verification.notice'));
    }

    public function test_cadastro_com_email_ja_existente_orienta_a_redefinir_a_senha(): void
    {
        app()->setLocale('pt');
        $setor = Setor::factory()->create();
        User::factory()->create(['email' => 'ja-cadastrado@example.com']);

        $response = $this->post('/register', [
            'name' => 'Outra Pessoa',
            'email' => 'ja-cadastrado@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'phone' => '7799999999',
            'setor_id' => $setor->id,
        ]);

        $response->assertSessionHasErrors([
            'email' => 'Já existe uma conta com este e-mail. Se não lembra a senha, use “Esqueceu sua senha” para redefini-la.',
        ]);
        $this->assertGuest();
    }
}
