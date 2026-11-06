<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\Auth\ResetPasswordQueued;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use DatabaseTransactions;

    public function test_reset_password_link_screen_can_be_rendered()
    {
        $response = $this->get('/forgot-password');

        $response->assertStatus(200);
    }

    public function test_reset_password_link_can_be_requested()
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPasswordQueued::class);
    }

    public function test_reset_password_screen_can_be_rendered()
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPasswordQueued::class, function ($notification) {
            $response = $this->get('/reset-password/'.$notification->token);

            $response->assertStatus(200);

            return true;
        });
    }

    public function test_password_can_be_reset_with_valid_token()
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPasswordQueued::class, function ($notification) use ($user) {
            $response = $this->post('/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

            $response
                ->assertSessionHasNoErrors()
                ->assertRedirect(route('login'));

            return true;
        });
    }

    public function test_redefinicao_com_token_invalido_responde_igual_para_conta_existente_e_inexistente(): void
    {
        $usuario = User::factory()->create();

        $existente = $this->from('/reset-password/token-invalido')->post('/reset-password', $this->dadosDeRedefinicao($usuario->email));
        $inexistente = $this->from('/reset-password/token-invalido')->post('/reset-password', $this->dadosDeRedefinicao('inexistente@test.local'));

        $this->assertSame($existente->status(), $inexistente->status());
        $this->assertSame($existente->headers->get('Location'), $inexistente->headers->get('Location'));

        $existente->assertRedirect()->assertSessionHasErrors(['email' => __('passwords.token')]);
        $inexistente->assertRedirect()->assertSessionHasErrors(['email' => __('passwords.token')]);

        $this->assertGuest();
    }

    public function test_redefinicao_com_token_invalido_json_responde_igual_para_conta_existente_e_inexistente(): void
    {
        $usuario = User::factory()->create();

        $this->postJson('/reset-password', $this->dadosDeRedefinicao($usuario->email))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => __('passwords.token')]);

        $this->postJson('/reset-password', $this->dadosDeRedefinicao('inexistente@test.local'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => __('passwords.token')]);
    }

    /**
     * @return array<string, string>
     */
    private function dadosDeRedefinicao(string $email): array
    {
        return [
            'token' => 'token-invalido',
            'email' => $email,
            'password' => 'nova-senha-123',
            'password_confirmation' => 'nova-senha-123',
        ];
    }
}
