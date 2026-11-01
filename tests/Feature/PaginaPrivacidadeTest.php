<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class PaginaPrivacidadeTest extends TestCase
{
    public function test_visitante_acessa_a_politica_de_privacidade_com_versao_e_data(): void
    {
        $this->get('/privacidade')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Privacidade/PoliticaPrivacidadePage')
                ->has('versao')
                ->has('data_versao')
                ->where('versao', config('privacidade.versao'))
                ->where('data_versao', config('privacidade.data_versao'))
            );
    }

    public function test_usuario_autenticado_acessa_a_politica_de_privacidade(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/privacidade')
            ->assertOk();
    }

    public function test_usuario_nao_verificado_acessa_a_politica_de_privacidade_sem_redirecionamento(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->get('/privacidade')
            ->assertOk();
    }

    public function test_politica_de_privacidade_responde_404_quando_a_flag_esta_desligada(): void
    {
        config(['privacidade.pagina_habilitada' => false]);

        $this->get('/privacidade')->assertNotFound();
    }

    public function test_rota_de_privacidade_declara_throttle_e_nome(): void
    {
        $rota = Route::getRoutes()->getByName('privacidade');

        $this->assertNotNull($rota);
        $this->assertSame('privacidade', $rota->getName());
        $this->assertContains('throttle:60,1', $rota->gatherMiddleware());
    }
}
