<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Tests\TestCase;

class LimitesDeTaxaAuthTest extends TestCase
{
    use DatabaseTransactions;

    public function test_registro_responde_429_depois_do_limite_por_ip(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->post('/register', [])->assertRedirect();
        }

        $this->post('/register', [])->assertStatus(429);
    }

    public function test_esqueci_a_senha_responde_429_depois_do_limite_por_email(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->post('/forgot-password', ['email' => 'alvo@test.local'])->assertRedirect();
        }

        $this->post('/forgot-password', ['email' => 'alvo@test.local'])->assertStatus(429);
    }

    public function test_esqueci_a_senha_responde_429_depois_do_limite_por_ip(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->post('/forgot-password', ['email' => "alvo{$i}@test.local"])->assertRedirect();
        }

        $this->post('/forgot-password', ['email' => 'outro@test.local'])->assertStatus(429);
    }

    public function test_redefinir_senha_responde_429_depois_do_limite_por_email(): void
    {
        $dados = [
            'token' => 'token-invalido',
            'email' => 'alvo@test.local',
            'password' => 'nova-senha-123',
            'password_confirmation' => 'nova-senha-123',
        ];

        for ($i = 0; $i < 5; $i++) {
            $this->post('/reset-password', $dados)->assertRedirect();
        }

        $this->post('/reset-password', $dados)->assertStatus(429);
    }

    public function test_confirmar_senha_responde_429_depois_do_limite_por_usuario(): void
    {
        $usuario = User::factory()->create();

        for ($i = 0; $i < 5; $i++) {
            $this->actingAs($usuario)
                ->post('/user/confirm-password', ['password' => 'senha-errada'])
                ->assertSessionHasErrors();
        }

        $this->actingAs($usuario)
            ->post('/user/confirm-password', ['password' => 'senha-errada'])
            ->assertStatus(429);
    }

    public function test_locale_responde_429_depois_do_limite_por_ip(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->post('/locale/en')->assertRedirect();
        }

        $this->post('/locale/en')->assertStatus(429);
    }

    public function test_broadcasting_auth_responde_429_depois_do_limite_por_usuario(): void
    {
        $usuario = User::factory()->create();
        $dados = [
            'channel_name' => 'private-App.Models.User.'.$usuario->id,
            'socket_id' => '1234.5678',
        ];

        for ($i = 0; $i < 60; $i++) {
            $this->actingAs($usuario)->post('/broadcasting/auth', $dados);
        }

        $this->actingAs($usuario)->post('/broadcasting/auth', $dados)->assertStatus(429);
    }

    public function test_login_mantem_o_limite_proprio_de_cinco_tentativas(): void
    {
        $usuario = User::factory()->create();
        $tentativa = ['email' => $usuario->email, 'password' => 'senha-errada'];

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', $tentativa)->assertRedirect();
        }

        $this->post('/login', $tentativa)->assertStatus(429);
    }

    public function test_login_com_senha_correta_continua_funcionando_dentro_do_limite(): void
    {
        $usuario = User::factory()->create();

        $this->post('/login', ['email' => $usuario->email, 'password' => 'senha-errada'])->assertRedirect();
        $this->post('/login', ['email' => $usuario->email, 'password' => 'password'])
            ->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($usuario);
    }

    public function test_rotas_sensiveis_declaram_o_limitador_esperado(): void
    {
        $esperados = [
            'register.store' => 'throttle:register',
            'password.email' => 'throttle:forgot-password',
            'password.update' => 'throttle:reset-password',
            'password.confirm.store' => 'throttle:confirm-password',
            'locale.update' => 'throttle:locale',
            'login.store' => 'throttle:login',
        ];

        foreach ($esperados as $nome => $middleware) {
            $rota = $this->rotaPeloNome($nome);

            $this->assertContains($middleware, $rota->gatherMiddleware(), "Rota {$nome} sem {$middleware}");
        }
    }

    private function rotaPeloNome(string $nome): Route
    {
        foreach (RouteFacade::getRoutes()->getRoutes() as $rota) {
            if ($rota->getName() === $nome) {
                return $rota;
            }
        }

        $this->fail("Rota {$nome} não encontrada");
    }
}
