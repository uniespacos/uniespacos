<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HistoricoNavegadorTest extends TestCase
{
    private function usuarioVerificado(): User
    {
        return User::factory()->create([
            'setor_id' => Setor::factory()->create()->id,
            'email_verified_at' => now(),
        ]);
    }

    #[Test]
    public function pagina_autenticada_cifra_o_historico_do_navegador(): void
    {
        $response = $this->actingAs($this->usuarioVerificado())->get(route('dashboard'));

        $response->assertOk();
        $this->assertTrue($response->viewData('page')['encryptHistory']);
    }

    #[Test]
    public function pagina_de_visitante_nao_cifra_o_historico_do_navegador(): void
    {
        $response = $this->get(route('login'));

        $response->assertOk();
        $this->assertFalse($response->viewData('page')['encryptHistory']);
    }

    #[Test]
    public function logout_limpa_o_historico_do_navegador_na_proxima_resposta_inertia(): void
    {
        $this->actingAs($this->usuarioVerificado());

        $this->post(route('logout'))->assertRedirect('/');

        $response = $this->get(route('login'));

        $response->assertOk();
        $this->assertTrue($response->viewData('page')['clearHistory']);
    }

    #[Test]
    public function autoexclusao_de_conta_limpa_o_historico_do_navegador(): void
    {
        $usuario = $this->usuarioVerificado();

        $this->actingAs($usuario)
            ->delete(route('settings.profile.destroy'), ['password' => 'password'])
            ->assertRedirect('/');

        $response = $this->get(route('login'));

        $response->assertOk();
        $this->assertTrue($response->viewData('page')['clearHistory']);
    }

    #[Test]
    public function limpeza_do_historico_nao_se_repete_na_resposta_seguinte(): void
    {
        $this->actingAs($this->usuarioVerificado());
        $this->post(route('logout'));

        $this->get(route('login'))->assertOk();
        $proxima = $this->get(route('login'));

        $proxima->assertOk();
        $this->assertFalse($proxima->viewData('page')['clearHistory']);
    }
}
