<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Instituicao;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

final class InstitucionalRelatoriosTest extends TestCase
{
    private function criarAdmin(): User
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $admin = User::factory()->create(['setor_id' => $setor->id]);
        $admin->assignRole('institucional');

        return $admin;
    }

    private function criarGestor(): User
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $gestor = User::factory()->create(['setor_id' => $setor->id]);
        $gestor->assignRole('gestor');

        $espaco = Espaco::factory()->create();
        Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
        ]);

        return $gestor;
    }

    public function test_institucional_pode_acessar_index_de_relatorios(): void
    {
        $admin = $this->criarAdmin();

        $response = $this->actingAs($admin)
            ->get(route('institucional.relatorios.index'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Administrativo/Relatorios/RelatoriosInstitucionalPage')
            ->has('tipos_disponiveis')
            ->has('opcoes_inventario')
        );
    }

    public function test_institucional_pode_consultar_dados_de_relatorio(): void
    {
        $admin = $this->criarAdmin();

        $response = $this->actingAs($admin)
            ->postJson(route('institucional.relatorios.dados'), [
                'tipo' => 'indicadores_consolidados',
            ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'titulo',
            'colunas',
            'linhas',
            'sumario',
        ]);
    }

    public function test_institucional_pode_gerar_exportacao_pdf(): void
    {
        $admin = $this->criarAdmin();

        $response = $this->actingAs($admin)
            ->post(route('institucional.relatorios.gerar'), [
                'tipo' => 'indicadores_consolidados',
                'formato' => 'pdf',
            ]);

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_gestor_pode_acessar_index_de_relatorios(): void
    {
        $gestor = $this->criarGestor();

        $response = $this->actingAs($gestor)
            ->get(route('gestor.relatorios.index'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Gestor/Relatorios/RelatoriosGestorPage')
            ->has('tipos_disponiveis')
            ->has('opcoes_inventario')
        );
    }

    public function test_gestor_pode_consultar_dados_de_relatorio(): void
    {
        $gestor = $this->criarGestor();

        $response = $this->actingAs($gestor)
            ->postJson(route('gestor.relatorios.dados'), [
                'tipo' => 'reservas_periodo',
            ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'titulo',
            'colunas',
            'linhas',
            'sumario',
        ]);
    }
}
