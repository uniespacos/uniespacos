<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_email_verification_screen_can_be_rendered()
    {
        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user)->get('/email/verify');

        $response->assertStatus(200);
    }

    public function test_email_can_be_verified()
    {
        $user = User::factory()->unverified()->create();

        Event::fake();

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $response = $this->actingAs($user)->get($verificationUrl);

        Event::assertDispatched(Verified::class);
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $response->assertRedirect('/dashboard?verified=1');
    }

    public function test_email_is_not_verified_with_invalid_hash()
    {
        $user = User::factory()->unverified()->create();

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1('wrong-email')]
        );

        $this->actingAs($user)->get($verificationUrl);

        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_unauthenticated_user_can_verify_email_after_login()
    {
        $user = User::factory()->unverified()->create();

        Event::fake();

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        // 1. Log in the user directly.
        $this->actingAs($user);

        // 2. Hit the verification URL as the authenticated user.
        $response = $this->get($verificationUrl);

        // 3. Assert that verification happened and user is redirected.
        Event::assertDispatched(Verified::class);
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $response->assertRedirect('/dashboard?verified=1');
    }

    public function test_reenvio_de_verificacao_exige_sessao_e_responde_igual_para_qualquer_conta_nao_verificada(): void
    {
        $this->post(route('verification.send'))->assertRedirect(route('login'));

        $primeiraConta = User::factory()->unverified()->create();
        $segundaConta = User::factory()->unverified()->create();

        $primeira = $this->actingAs($primeiraConta)->from('/verify-email')->post(route('verification.send'));
        $segunda = $this->actingAs($segundaConta)->from('/verify-email')->post(route('verification.send'));

        $this->assertSame($primeira->status(), $segunda->status());
        $this->assertSame($primeira->headers->get('Location'), $segunda->headers->get('Location'));
        $primeira->assertSessionHas('status', 'verification-link-sent');
        $segunda->assertSessionHas('status', 'verification-link-sent');
    }
}
