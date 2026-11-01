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
        config(['privacidade.pagina_habilitada' => true]);

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
        config(['privacidade.pagina_habilitada' => true]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/privacidade')
            ->assertOk();
    }

    public function test_usuario_nao_verificado_acessa_a_politica_de_privacidade_sem_redirecionamento(): void
    {
        config(['privacidade.pagina_habilitada' => true]);

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

    public function test_default_do_arquivo_de_config_deixa_a_politica_de_privacidade_desligada(): void
    {
        $this->assertFalse($this->padraoDoArquivoDeConfig());
    }

    public function test_politica_de_privacidade_responde_404_com_o_padrao_do_arquivo_de_config(): void
    {
        config(['privacidade.pagina_habilitada' => $this->padraoDoArquivoDeConfig()]);

        $this->get('/privacidade')->assertNotFound();
    }

    public function test_prop_privacidade_habilitada_e_false_com_a_pagina_desligada(): void
    {
        config(['privacidade.pagina_habilitada' => false]);

        $this->get('/login')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('privacidadeHabilitada', false)
            );
    }

    public function test_prop_privacidade_habilitada_e_true_com_a_pagina_ligada(): void
    {
        config(['privacidade.pagina_habilitada' => true]);

        $this->get('/login')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('privacidadeHabilitada', true)
            );
    }

    public function test_rota_de_privacidade_declara_throttle_e_nome(): void
    {
        $rota = Route::getRoutes()->getByName('privacidade');

        $this->assertNotNull($rota);
        $this->assertSame('privacidade', $rota->getName());
        $this->assertContains('throttle:60,1', $rota->gatherMiddleware());
    }

    private function padraoDoArquivoDeConfig(): bool
    {
        $variavel = 'PRIVACY_PAGE_ENABLED';
        $envOriginal = $_ENV[$variavel] ?? null;
        $serverOriginal = $_SERVER[$variavel] ?? null;
        $putenvOriginal = getenv($variavel);

        unset($_ENV[$variavel], $_SERVER[$variavel]);
        putenv($variavel);

        try {
            $configuracao = require config_path('privacidade.php');

            return (bool) $configuracao['pagina_habilitada'];
        } finally {
            if ($envOriginal !== null) {
                $_ENV[$variavel] = $envOriginal;
            }
            if ($serverOriginal !== null) {
                $_SERVER[$variavel] = $serverOriginal;
            }
            if ($putenvOriginal !== false) {
                putenv("{$variavel}={$putenvOriginal}");
            }
        }
    }
}
