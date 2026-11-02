<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\Auth\ResetPasswordQueued;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EsqueciSenhaRespostaNeutraTest extends TestCase
{
    use DatabaseTransactions;

    private const EMAIL_INEXISTENTE = 'inexistente@test.local';

    private function mensagemNeutra(): string
    {
        return __('If an account exists with this email, we will send a link to reset your password.');
    }

    public function test_resposta_e_identica_para_email_existente_e_inexistente(): void
    {
        Notification::fake();

        $usuario = User::factory()->create();

        $existente = $this->post(route('password.email'), ['email' => $usuario->email]);
        $inexistente = $this->post(route('password.email'), ['email' => self::EMAIL_INEXISTENTE]);

        $this->assertSame($existente->status(), $inexistente->status());
        $this->assertSame($existente->headers->get('Location'), $inexistente->headers->get('Location'));

        $existente->assertRedirect()->assertSessionHas('status', $this->mensagemNeutra())->assertSessionHasNoErrors();
        $inexistente->assertRedirect()->assertSessionHas('status', $this->mensagemNeutra())->assertSessionHasNoErrors();
    }

    public function test_resposta_json_e_identica_para_email_existente_e_inexistente(): void
    {
        Notification::fake();

        $usuario = User::factory()->create();

        $this->postJson(route('password.email'), ['email' => $usuario->email])
            ->assertOk()
            ->assertExactJson(['message' => $this->mensagemNeutra()]);

        $this->postJson(route('password.email'), ['email' => self::EMAIL_INEXISTENTE])
            ->assertOk()
            ->assertExactJson(['message' => $this->mensagemNeutra()]);
    }

    public function test_email_de_redefinicao_so_e_enviado_para_conta_existente(): void
    {
        Notification::fake();

        $usuario = User::factory()->create();

        $this->post(route('password.email'), ['email' => $usuario->email]);
        $this->post(route('password.email'), ['email' => self::EMAIL_INEXISTENTE]);

        Notification::assertSentToTimes($usuario, ResetPasswordQueued::class, 1);
        Notification::assertCount(1);
    }

    public function test_resposta_e_identica_quando_o_broker_esta_em_throttle_para_conta_existente(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');

        try {
            Notification::fake();

            $usuario = User::factory()->create();

            $primeira = $this->post(route('password.email'), ['email' => $usuario->email]);
            $segunda = $this->post(route('password.email'), ['email' => $usuario->email]);

            $this->assertSame($primeira->status(), $segunda->status());
            $this->assertSame($primeira->headers->get('Location'), $segunda->headers->get('Location'));
            $segunda->assertSessionHas('status', $this->mensagemNeutra())->assertSessionHasNoErrors();

            Notification::assertSentToTimes($usuario, ResetPasswordQueued::class, 1);
        } finally {
            Carbon::setTestNow();
        }
    }
}
