<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Http\Responses\CustomVerifyEmailResponse;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Log\Logger;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\URL;
use Monolog\Handler\TestHandler;
use Monolog\Logger as MonologLogger;
use Monolog\LogRecord;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LogsDeAuthSemDadosSensiveisTest extends TestCase
{
    private const EMAIL = 'segredo-logs-auth@exemplo-teste.local';

    private TestHandler $capturado;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-06-15 12:00:00');

        $this->capturado = new TestHandler;
        Log::swap(new Logger(new MonologLogger('teste', [$this->capturado])));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    #[Test]
    public function login_com_verificacao_pendente_loga_so_o_user_id(): void
    {
        $user = User::factory()->unverified()->create(['email' => self::EMAIL]);
        $url = $this->urlDeVerificacao($user);

        $this->withSession(['url.email-verification.intended' => $url])
            ->post('/login', ['email' => self::EMAIL, 'password' => 'password'])
            ->assertRedirect($url);

        $registros = $this->registrosDoRequest();
        $this->assertLogContendo(
            $registros,
            'Login com verificação de e-mail pendente, redirecionando para a verificação',
            ['user_id' => $user->id],
        );
        $this->assertNenhumDadoSensivel($registros, $user);
    }

    #[Test]
    public function login_sem_verificacao_pendente_nao_loga_url_nem_email(): void
    {
        $user = User::factory()->create(['email' => self::EMAIL]);

        $this->post('/login', ['email' => self::EMAIL, 'password' => 'password'])
            ->assertRedirect();

        $this->assertNenhumDadoSensivel($this->registrosDoRequest(), $user);
    }

    #[Test]
    public function hit_do_link_autenticado_loga_so_o_user_id(): void
    {
        $user = User::factory()->unverified()->create(['email' => self::EMAIL]);
        $url = $this->urlDeVerificacao($user);

        $this->actingAs($user)->get($url)->assertRedirect('/dashboard?verified=1');

        $registros = $this->registrosDoRequest();
        $this->assertLogContendo($registros, 'Verification hit', ['user_id' => $user->id]);
        $this->assertLogContendo($registros, 'Authenticated user verified, redirecting to dashboard', ['user_id' => $user->id]);
        $this->assertNenhumDadoSensivel($registros, $user);
    }

    #[Test]
    public function hit_do_link_autenticado_em_json_nao_loga_url_nem_email(): void
    {
        $user = User::factory()->unverified()->create(['email' => self::EMAIL]);
        $url = $this->urlDeVerificacao($user);

        $this->actingAs($user)->getJson($url)->assertNoContent();

        $registros = $this->registrosDoRequest();
        $this->assertLogContendo($registros, 'Verification hit', ['user_id' => $user->id]);
        $this->assertNenhumDadoSensivel($registros, $user);
    }

    #[Test]
    public function hit_do_link_nao_autenticado_nao_loga_url_nem_email(): void
    {
        $user = User::factory()->unverified()->create(['email' => self::EMAIL]);
        $url = $this->urlDeVerificacao($user);

        $this->get($url)->assertRedirect();

        $this->assertNenhumDadoSensivel($this->registrosDoRequest(), $user);
    }

    #[Test]
    public function resposta_de_verificacao_nao_autenticada_guarda_url_na_sessao_sem_logar_a_url(): void
    {
        $user = User::factory()->unverified()->create(['email' => self::EMAIL]);
        $url = $this->urlDeVerificacao($user);

        $request = Request::create($url);
        $request->setLaravelSession(app('session.store'));

        $resposta = (new CustomVerifyEmailResponse)->toResponse($request);

        $this->assertSame(route('login'), $resposta->getTargetUrl());
        $this->assertSame($request->fullUrl(), Session::get('url.email-verification.intended'));

        $registros = $this->registrosDoRequest();
        $this->assertLogContendo($registros, 'Unauthenticated user hit verification link, redirecting to login', []);
        $this->assertNenhumDadoSensivel($registros, $user);
    }

    private function urlDeVerificacao(User $user): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );
    }

    /**
     * @return array<int, LogRecord>
     */
    private function registrosDoRequest(): array
    {
        return $this->capturado->getRecords();
    }

    /**
     * @param  array<int, LogRecord>  $registros
     * @param  array<string, mixed>  $contextoEsperado
     */
    private function assertLogContendo(array $registros, string $mensagem, array $contextoEsperado): void
    {
        $encontrados = array_values(array_filter(
            $registros,
            fn (LogRecord $registro): bool => $registro->message === $mensagem,
        ));

        $this->assertNotEmpty($encontrados, "Nenhum log com a mensagem \"{$mensagem}\" foi registrado.");
        $this->assertSame($contextoEsperado, Arr::only($encontrados[0]->context, array_keys($contextoEsperado)));
    }

    /**
     * @param  array<int, LogRecord>  $registros
     */
    private function assertNenhumDadoSensivel(array $registros, User $user): void
    {
        foreach ($registros as $registro) {
            $serializado = $registro->message.' '.json_encode($registro->context, JSON_THROW_ON_ERROR);

            $this->assertArrayNotHasKey('url', $registro->context, $registro->message);
            $this->assertArrayNotHasKey('headers', $registro->context, $registro->message);
            $this->assertDoesNotMatchRegularExpression('#https?://#', $serializado, $registro->message);
            $this->assertStringNotContainsString('signature', $serializado, $registro->message);
            $this->assertStringNotContainsString('expires', $serializado, $registro->message);
            $this->assertStringNotContainsString(self::EMAIL, $serializado, $registro->message);
            $this->assertStringNotContainsString(sha1($user->email), $serializado, $registro->message);
            $this->assertStringNotContainsString('@', $serializado, $registro->message);
        }
    }
}
