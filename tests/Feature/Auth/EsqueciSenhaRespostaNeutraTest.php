<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\Auth\ResetPasswordQueued;
use App\Services\ExclusaoDeContaService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
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

    public function test_conta_anonimizada_recebe_a_mesma_resposta_que_email_inexistente(): void
    {
        Notification::fake();

        $titular = User::factory()->create(['email' => 'titular-anonimizado@test.local']);
        $emailOriginal = $titular->email;
        app(ExclusaoDeContaService::class)->anonimizar($titular);

        $anonimizada = $this->post(route('password.email'), ['email' => $emailOriginal]);
        $inexistente = $this->post(route('password.email'), ['email' => self::EMAIL_INEXISTENTE]);

        $this->assertSame($anonimizada->status(), $inexistente->status());
        $this->assertSame($anonimizada->headers->get('Location'), $inexistente->headers->get('Location'));
        $anonimizada->assertSessionHas('status', $this->mensagemNeutra());
        $inexistente->assertSessionHas('status', $this->mensagemNeutra());

        Notification::assertNothingSent();
    }

    public function test_email_de_redefinicao_e_enfileirado_so_para_conta_existente(): void
    {
        Queue::fake();

        $usuario = User::factory()->create();

        $this->post(route('password.email'), ['email' => self::EMAIL_INEXISTENTE]);
        Queue::assertNothingPushed();

        $this->post(route('password.email'), ['email' => $usuario->email]);
        Queue::assertPushed(SendQueuedNotifications::class, 1);
    }

    public function test_notificacao_de_redefinicao_implementa_should_queue(): void
    {
        $this->assertTrue(is_a(ResetPasswordQueued::class, ShouldQueue::class, true));
    }
}
