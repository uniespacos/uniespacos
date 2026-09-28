<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class InstitucionalListagensSearchTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;

    protected Instituicao $instituicao;

    protected Unidade $unidade;

    protected Setor $setor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->instituicao = Instituicao::factory()->create([
            'nome' => 'Universidade Estadual de Teste',
            'sigla' => 'UET',
        ]);

        $this->unidade = Unidade::factory()->create([
            'instituicao_id' => $this->instituicao->id,
            'nome' => 'Campus Principal',
            'sigla' => 'CP',
        ]);

        $this->setor = Setor::factory()->create([
            'unidade_id' => $this->unidade->id,
            'nome' => 'Reitoria',
            'sigla' => 'REIT',
        ]);

        $this->admin = User::factory()->create([
            'setor_id' => $this->setor->id,
        ]);
        $this->admin->assignRole('institucional');
    }

    public function test_instituicoes_index_filters_by_search(): void
    {
        Instituicao::factory()->create(['nome' => 'Faculdade Alpha', 'sigla' => 'FA']);
        Instituicao::factory()->create(['nome' => 'Instituto Beta', 'sigla' => 'IB']);

        $response = $this->actingAs($this->admin)
            ->get(route('institucional.instituicoes.index', ['search' => 'Alpha']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('instituicoes.data', 1)
            ->where('instituicoes.data.0.sigla', 'FA')
            ->where('filters.search', 'Alpha')
        );
    }

    public function test_unidades_index_filters_by_search(): void
    {
        Unidade::factory()->create([
            'instituicao_id' => $this->instituicao->id,
            'nome' => 'Campus Leste',
            'sigla' => 'CL',
        ]);
        Unidade::factory()->create([
            'instituicao_id' => $this->instituicao->id,
            'nome' => 'Campus Oeste',
            'sigla' => 'CO',
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('institucional.unidades.index', ['search' => 'Leste']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('unidades.data', 1)
            ->where('unidades.data.0.sigla', 'CL')
            ->where('filters.search', 'Leste')
        );
    }

    public function test_modulos_index_filters_by_search_and_unidade(): void
    {
        $unidade2 = Unidade::factory()->create([
            'instituicao_id' => $this->instituicao->id,
            'nome' => 'Campus Norte',
            'sigla' => 'CN',
        ]);

        Modulo::factory()->create([
            'unidade_id' => $this->unidade->id,
            'nome' => 'Modulo de Ciencias',
        ]);
        Modulo::factory()->create([
            'unidade_id' => $this->unidade->id,
            'nome' => 'Modulo de Letras',
        ]);
        Modulo::factory()->create([
            'unidade_id' => $unidade2->id,
            'nome' => 'Modulo de Ciencias Norte',
        ]);

        // Busca por nome
        $response = $this->actingAs($this->admin)
            ->get(route('institucional.modulos.index', ['search' => 'Letras']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('modulos.data', 1)
            ->where('modulos.data.0.nome', 'Modulo de Letras')
        );

        // Busca combinada com unidade
        $responseCombined = $this->actingAs($this->admin)
            ->get(route('institucional.modulos.index', [
                'search' => 'Ciencias',
                'unidade' => 'Campus Norte',
            ]));

        $responseCombined->assertOk();
        $responseCombined->assertInertia(fn (AssertableInertia $page) => $page
            ->has('modulos.data', 1)
            ->where('modulos.data.0.nome', 'Modulo de Ciencias Norte')
        );
    }
}
