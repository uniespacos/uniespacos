<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Http\Responses\CustomVerifyEmailResponse;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\URL;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VerificacaoEmailLogTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-06-15 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    #[Test]
    public function verificacao_nao_loga_headers_nem_url_assinada(): void
    {
        Log::spy();

        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $this->actingAs($user)
            ->withHeaders([
                'X-Segredo-Teste' => 'SEGREDO123',
                'Cookie' => 'laravel_session=SEGREDO123',
            ])
            ->get($url);

        Log::shouldNotHaveReceived('info', [
            Mockery::any(),
            Mockery::on(fn ($ctx) => is_array($ctx) && (
                array_key_exists('headers', $ctx)
                || array_key_exists('url', $ctx)
                || str_contains((string) json_encode($ctx), 'SEGREDO123')
                || str_contains((string) json_encode($ctx), 'signature=')
            )),
        ]);
    }

    #[Test]
    public function nao_autenticado_loga_sem_url_e_continua_guardando_a_url_para_o_login(): void
    {
        Log::spy();

        $request = Request::create('/email/verify/1/abc?expires=1&signature=SEGREDO123');
        $request->setLaravelSession(app('session.store'));

        $resposta = (new CustomVerifyEmailResponse)->toResponse($request);

        $this->assertSame(route('login'), $resposta->getTargetUrl());
        $this->assertSame($request->fullUrl(), Session::get('url.email-verification.intended'));

        Log::shouldNotHaveReceived('info', [
            Mockery::any(),
            Mockery::on(fn ($ctx) => is_array($ctx) && (
                array_key_exists('url', $ctx)
                || str_contains((string) json_encode($ctx), 'signature=')
            )),
        ]);
    }

    #[Test]
    public function usuario_autenticado_continua_indo_ao_dashboard_com_verified(): void
    {
        Log::spy();

        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $this->actingAs($user)->get($url)->assertRedirect('/dashboard?verified=1');

        Log::shouldHaveReceived('info')
            ->with('Authenticated user verified, redirecting to dashboard', ['user_id' => $user->id]);
    }

    #[Test]
    public function requisicao_json_continua_devolvendo_204(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $this->actingAs($user)->getJson($url)->assertNoContent();
    }
}
