<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\ExclusaoDeContaService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_login_screen_can_be_rendered()
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_users_can_authenticate_using_the_login_screen()
    {
        $user = User::factory()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password()
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }

    public function test_login_com_senha_errada_responde_igual_para_conta_existente_e_inexistente(): void
    {
        $usuario = User::factory()->create();

        $existente = $this->from('/login')->post('/login', ['email' => $usuario->email, 'password' => 'senha-errada']);
        $inexistente = $this->from('/login')->post('/login', ['email' => 'inexistente@test.local', 'password' => 'senha-errada']);

        $this->assertSame($existente->status(), $inexistente->status());
        $this->assertSame($existente->headers->get('Location'), $inexistente->headers->get('Location'));

        $existente->assertRedirect('/login')->assertSessionHasErrors(['email' => __('auth.failed')]);
        $inexistente->assertRedirect('/login')->assertSessionHasErrors(['email' => __('auth.failed')]);

        $this->assertGuest();
    }

    public function test_login_json_responde_igual_para_conta_existente_e_inexistente(): void
    {
        $usuario = User::factory()->create();

        $existente = $this->postJson('/login', ['email' => $usuario->email, 'password' => 'senha-errada']);
        $inexistente = $this->postJson('/login', ['email' => 'inexistente@test.local', 'password' => 'senha-errada']);

        $this->assertSame($existente->status(), $inexistente->status());
        $existente->assertUnprocessable()->assertJsonValidationErrors(['email' => __('auth.failed')]);
        $inexistente->assertUnprocessable()->assertJsonValidationErrors(['email' => __('auth.failed')]);
    }

    public function test_login_de_conta_anonimizada_responde_igual_a_email_inexistente(): void
    {
        Notification::fake();

        $titular = User::factory()->create(['email' => 'titular-anonimizado@test.local']);
        $emailOriginal = $titular->email;
        app(ExclusaoDeContaService::class)->anonimizar($titular);

        $anonimizada = $this->from('/login')->post('/login', ['email' => $emailOriginal, 'password' => 'password']);
        $inexistente = $this->from('/login')->post('/login', ['email' => 'inexistente@test.local', 'password' => 'password']);

        $this->assertSame($anonimizada->status(), $inexistente->status());
        $this->assertSame($anonimizada->headers->get('Location'), $inexistente->headers->get('Location'));

        $anonimizada->assertRedirect('/login')->assertSessionHasErrors(['email' => __('auth.failed')]);
        $inexistente->assertRedirect('/login')->assertSessionHasErrors(['email' => __('auth.failed')]);

        $this->assertGuest();
    }

    public function test_login_com_conta_existente_executa_uma_verificacao_de_hash(): void
    {
        $usuario = User::factory()->create();

        Hash::spy();

        $this->post('/login', ['email' => $usuario->email, 'password' => 'senha-errada']);

        Hash::shouldHaveReceived('check')->once();
    }

    public function test_login_com_conta_inexistente_tambem_executa_uma_verificacao_de_hash(): void
    {
        Hash::spy();

        $this->post('/login', ['email' => 'inexistente@test.local', 'password' => 'senha-errada']);

        Hash::shouldHaveReceived('check')
            ->once()
            ->with('senha-errada', Mockery::type('string'));
    }
}
