<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Setor;
use App\Models\User;
use App\Notifications\Auth\ResetPasswordQueued;
use App\Notifications\Auth\VerifyEmailQueued;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class EmailsDeAuthEmFilaTest extends TestCase
{
    private function criarAdmin(Setor $setor): User
    {
        $admin = User::factory()->create(['setor_id' => $setor->id]);
        $admin->assignRole('institucional');

        return $admin;
    }

    public function test_verificacao_reenviada_pelo_usuario_vai_para_a_fila(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');

        try {
            Queue::fake();

            $user = User::factory()->unverified()->create();

            $response = $this->actingAs($user)->post(route('verification.send'));

            Queue::assertPushed(SendQueuedNotifications::class, function ($job) use ($user) {
                return $job->notification instanceof VerifyEmailQueued
                    && $job->notifiables->contains($user);
            });

            $response->assertRedirect();
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_esqueci_a_senha_vai_para_a_fila(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');

        try {
            Queue::fake();

            $user = User::factory()->create();

            $response = $this->post(route('password.email'), ['email' => $user->email]);

            Queue::assertPushed(SendQueuedNotifications::class, function ($job) use ($user) {
                return $job->notification instanceof ResetPasswordQueued
                    && $job->notifiables->contains($user);
            });

            $response->assertRedirect();
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_reenvio_de_verificacao_pelo_admin_vai_para_a_fila(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');

        try {
            Queue::fake();

            $setor = Setor::factory()->create();
            $admin = $this->criarAdmin($setor);
            $usuario = User::factory()->unverified()->create(['setor_id' => $setor->id]);

            $response = $this->actingAs($admin)->post(route('institucional.usuarios.resend-verification', ['usuario' => $usuario->id]));

            Queue::assertPushed(SendQueuedNotifications::class, function ($job) use ($usuario) {
                return $job->notification instanceof VerifyEmailQueued
                    && $job->notifiables->contains($usuario);
            });

            $response->assertSessionHas('success', 'E-mail de verificação reenviado.');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_reset_pelo_admin_vai_para_a_fila(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');

        try {
            Queue::fake();

            $setor = Setor::factory()->create();
            $admin = $this->criarAdmin($setor);
            $usuario = User::factory()->create(['setor_id' => $setor->id]);

            $response = $this->actingAs($admin)->post(route('institucional.usuarios.reset-password', ['usuario' => $usuario->id]));

            Queue::assertPushed(SendQueuedNotifications::class, function ($job) use ($usuario) {
                return $job->notification instanceof ResetPasswordQueued
                    && $job->notifiables->contains($usuario);
            });

            $response->assertSessionHas('success', 'Link de redefinição de senha enviado.');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_link_de_verificacao_gerado_verifica_o_email(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');

        try {
            $user = User::factory()->unverified()->create();

            $notification = new VerifyEmailQueued;
            $mailMessage = $notification->toMail($user);
            $url = $mailMessage->actionUrl;

            $response = $this->actingAs($user)->get($url);

            $response->assertRedirect('/dashboard?verified=1');
            $this->assertTrue($user->fresh()->hasVerifiedEmail());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_link_de_verificacao_expirado_nao_verifica(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');

        try {
            $user = User::factory()->unverified()->create();

            $notification = new VerifyEmailQueued;
            $mailMessage = $notification->toMail($user);
            $url = $mailMessage->actionUrl;

            $expiryMinutes = config('auth.verification.expire', 60);
            Carbon::setTestNow(now()->addMinutes($expiryMinutes + 1));

            $response = $this->actingAs($user)->get($url);

            $response->assertStatus(403);
            $this->assertFalse($user->fresh()->hasVerifiedEmail());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_token_de_reset_sobrevive_a_serializacao_da_fila(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');

        try {
            Notification::fake();

            $user = User::factory()->create();
            // Gerada em tempo de execução: nenhuma senha literal no código-fonte.
            $novaSenha = Str::password(16);

            Password::sendResetLink(['email' => $user->email]);

            Notification::assertSentTo($user, ResetPasswordQueued::class, function ($notification) use ($user, $novaSenha) {
                $copia = unserialize(serialize($notification));

                $response = $this->post('/reset-password', [
                    'token' => $copia->token,
                    'email' => $user->email,
                    'password' => $novaSenha,
                    'password_confirmation' => $novaSenha,
                ]);

                $response->assertRedirect(route('login'));
                $this->assertTrue(Hash::check($novaSenha, $user->fresh()->password));

                return true;
            });
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_falha_no_envio_do_reset_pelo_admin_nao_vira_500_nem_vaza_detalhe(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');

        try {
            Exceptions::fake();

            $setor = Setor::factory()->create();
            $admin = $this->criarAdmin($setor);
            $usuario = User::factory()->create(['setor_id' => $setor->id]);

            Password::shouldReceive('sendResetLink')
                ->once()
                ->andThrow(new \RuntimeException('smtp down: segredo'));

            $response = $this->actingAs($admin)->post(route('institucional.usuarios.reset-password', ['usuario' => $usuario->id]));

            $response->assertStatus(302);
            $response->assertSessionHas('error', 'Não foi possível enviar o link de redefinição.');
            $this->assertStringNotContainsString('segredo', json_encode(session()->all()));

            Exceptions::assertReported(fn (\RuntimeException $e) => $e->getMessage() === 'smtp down: segredo');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_troca_de_email_pelo_fortify_vai_para_a_fila(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');

        try {
            Queue::fake();

            $setor = Setor::factory()->create();
            $user = User::factory()->create([
                'setor_id' => $setor->id,
                'email' => 'original@example.com',
                'email_verified_at' => now(),
            ]);

            $response = $this->actingAs($user)->put(route('user-profile-information.update'), [
                'name' => $user->name,
                'email' => 'newuser@example.com',
                'phone' => '(11) 99999-9999',
                'setor_id' => $setor->id,
            ]);

            Queue::assertPushed(SendQueuedNotifications::class, function ($job) use ($user) {
                return $job->notification instanceof VerifyEmailQueued
                    && $job->notifiables->contains($user);
            });

            $this->assertNull($user->fresh()->email_verified_at);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_timeout_smtp_padrao_e_10_segundos(): void
    {
        $this->assertSame(10, config('mail.mailers.smtp.timeout'));
    }
}
