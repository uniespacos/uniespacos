<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Exceptions\ExceptionContext;
use App\Models\User;
use Illuminate\Log\Logger;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Monolog\Handler\TestHandler;
use Monolog\Logger as MonologLogger;
use RuntimeException;
use Tests\TestCase;

/**
 * Issue #112 — contexto anexado automaticamente a toda exceção logada.
 *
 * O caso da senha é o mais importante daqui. A issue pedia "request data" no
 * contexto, e atender isso literalmente gravaria senha em texto plano nos logs:
 * ConfirmPasswordRequest trafega o campo `password` para confirmar o
 * cancelamento de reserva. O teste trava a decisão de não incluir o payload.
 */
class ExceptionContextTest extends TestCase
{
    public function test_context_carries_the_authenticated_user(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $contexto = ExceptionContext::build();

        $this->assertSame($user->id, $contexto['user_id']);
    }

    public function test_context_is_null_user_when_unauthenticated(): void
    {
        $contexto = ExceptionContext::build();

        $this->assertNull($contexto['user_id']);
    }

    /**
     * Exercita o caminho de produção de ponta a ponta: uma exceção lançada
     * durante uma requisição HTTP real precisa chegar ao log já com o contexto.
     *
     * Chamar ExceptionContext::build() direto do teste não serviria — a suíte
     * roda via console, então runningInConsole() é sempre true e o ramo HTTP
     * nunca seria exercitado. Só uma requisição de verdade prova que a
     * amarração em bootstrap/app.php está de pé.
     */
    public function test_context_reaches_the_log_during_a_real_request(): void
    {
        $user = User::factory()->create();

        Route::middleware('web')->get('/__erro-de-teste', function () {
            throw new RuntimeException('falha proposital');
        });

        // Captura os registros de verdade, em vez de espiar um nome de método: o
        // handler do Laravel escolhe entre error() e log() conforme o nível.
        $capturado = new TestHandler;
        Log::swap(new Logger(new MonologLogger('teste', [$capturado])));

        $this->actingAs($user)->get('/__erro-de-teste')->assertStatus(500);

        // Outros registros podem ocorrer no mesmo ciclo, então localiza o da
        // exceção pela mensagem em vez de assumir a posição.
        $registro = collect($capturado->getRecords())
            ->first(fn ($r) => $r['message'] === 'falha proposital');

        $this->assertNotNull($registro, 'A exceção deveria ter sido registrada em log.');

        $contexto = $registro['context'];

        $this->assertSame($user->id, $contexto['user_id']);
        $this->assertSame('GET', $contexto['method']);
        $this->assertStringContainsString('__erro-de-teste', $contexto['url']);
        $this->assertArrayHasKey('route', $contexto);
        $this->assertArrayHasKey('ip', $contexto);
        $this->assertArrayHasKey('exception', $contexto);
    }

    /**
     * Guarda de segurança: nenhum campo sensível pode entrar no contexto, e o
     * corpo da requisição não é incluído de forma alguma.
     *
     * Os valores são canários gerados em runtime, e não literais. Dois motivos:
     * um valor único por execução não pode passar por acidente (um literal fixo
     * poderia coincidir com algo já presente no contexto), e não deixa no
     * arquivo uma string com formato de credencial — que os scanners de segredo
     * reportam como vazamento, ainda que seja fixture.
     */
    public function test_context_never_carries_request_payload_or_secrets(): void
    {
        $user = User::factory()->create();

        $canarioSenha = 'canario-senha-'.bin2hex(random_bytes(8));
        $canarioToken = 'canario-token-'.bin2hex(random_bytes(8));

        $this->actingAs($user)->post(route('reservas.destroy', 1), [
            'password' => $canarioSenha,
            '_token' => $canarioToken,
        ]);

        $contexto = ExceptionContext::build();

        $serializado = json_encode($contexto, JSON_THROW_ON_ERROR);

        $this->assertStringNotContainsString($canarioSenha, $serializado);
        $this->assertStringNotContainsString($canarioToken, $serializado);

        foreach (['password', 'password_confirmation', 'current_password', '_token', 'token'] as $campo) {
            $this->assertArrayNotHasKey($campo, $contexto);
        }
    }

    /**
     * Jobs e comandos não têm requisição: incluir rota/URL ali seria dado
     * enganoso, então só o user_id sobrevive.
     *
     * A suíte roda via console mas com env 'testing', o que libera o ramo HTTP.
     * Trocar o env por 'production' reproduz um queue:work de verdade.
     */
    public function test_context_omits_request_metadata_when_running_in_console(): void
    {
        $envOriginal = $this->app['env'];
        $this->app->instance('env', 'production');

        try {
            $contexto = ExceptionContext::build();
        } finally {
            $this->app->instance('env', $envOriginal);
        }

        $this->assertSame(['user_id' => null], $contexto);
    }

    public function test_context_includes_request_metadata_when_handling_http(): void
    {
        $contexto = ExceptionContext::build();

        $this->assertArrayHasKey('route', $contexto);
        $this->assertArrayHasKey('method', $contexto);
        $this->assertArrayHasKey('url', $contexto);
        $this->assertArrayHasKey('ip', $contexto);
    }
}
