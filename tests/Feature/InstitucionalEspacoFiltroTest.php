<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Andar;
use App\Models\Espaco;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Covers the change that made institucional.espacos.index filter and paginate
 * server-side (instead of returning the full collection for the frontend to
 * slice in memory).
 */
class InstitucionalEspacoFiltroTest extends TestCase
{
    private function criarAdmin(Setor $setor): User
    {
        $admin = User::factory()->create(['setor_id' => $setor->id]);
        $admin->assignRole('institucional');

        return $admin;
    }

    private function criarAndar(Instituicao $instituicao): Andar
    {
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);

        return Andar::factory()->create(['modulo_id' => $modulo->id]);
    }

    public function test_index_pagina_a_listagem_de_espacos(): void
    {
        $instituicao = Instituicao::factory()->create();
        $andar = $this->criarAndar($instituicao);
        $setor = Setor::factory()->create(['unidade_id' => $andar->modulo->unidade_id]);
        $admin = $this->criarAdmin($setor);

        Espaco::factory()->count(15)->create(['andar_id' => $andar->id]);

        $response = $this->actingAs($admin)->get(route('institucional.espacos.index'));

        $response->assertOk();
        $response->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('espacos.data', 10)
                ->has('espacos.links')
                ->where('espacos.total', 15)
        );
    }

    public function test_filtro_por_unidade_restringe_a_listagem(): void
    {
        $instituicao = Instituicao::factory()->create();

        $andarA = $this->criarAndar($instituicao);
        $andarB = $this->criarAndar($instituicao);

        $setor = Setor::factory()->create(['unidade_id' => $andarA->modulo->unidade_id]);
        $admin = $this->criarAdmin($setor);

        Espaco::factory()->count(2)->create(['andar_id' => $andarA->id]);
        Espaco::factory()->count(3)->create(['andar_id' => $andarB->id]);

        $unidadeBId = $andarB->modulo->unidade_id;

        $response = $this->actingAs($admin)->get(route('institucional.espacos.index', ['unidade' => $unidadeBId]));

        $response->assertInertia(fn (AssertableInertia $page) => $page->has('espacos.data', 3));
    }

    public function test_filtro_por_capacidade_restringe_a_listagem(): void
    {
        $instituicao = Instituicao::factory()->create();
        $andar = $this->criarAndar($instituicao);
        $setor = Setor::factory()->create(['unidade_id' => $andar->modulo->unidade_id]);
        $admin = $this->criarAdmin($setor);

        Espaco::factory()->count(3)->create(['andar_id' => $andar->id, 'capacidade_pessoas' => 10]);
        Espaco::factory()->count(2)->create(['andar_id' => $andar->id, 'capacidade_pessoas' => 60]);

        $response = $this->actingAs($admin)->get(route('institucional.espacos.index', ['capacidade' => 50]));

        $response->assertInertia(fn (AssertableInertia $page) => $page->has('espacos.data', 2));
    }

    public function test_pagina_dois_retorna_o_restante_dos_espacos(): void
    {
        $instituicao = Instituicao::factory()->create();
        $andar = $this->criarAndar($instituicao);
        $setor = Setor::factory()->create(['unidade_id' => $andar->modulo->unidade_id]);
        $admin = $this->criarAdmin($setor);

        Espaco::factory()->count(15)->create(['andar_id' => $andar->id]);

        $response = $this->actingAs($admin)->get(route('institucional.espacos.index', ['page' => 2]));

        $response->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('espacos.data', 5)
                ->where('espacos.total', 15)
        );
    }

    public function test_filters_ecoam_a_query_string_enviada(): void
    {
        $instituicao = Instituicao::factory()->create();
        $andar = $this->criarAndar($instituicao);
        $setor = Setor::factory()->create(['unidade_id' => $andar->modulo->unidade_id]);
        $admin = $this->criarAdmin($setor);

        $unidadeId = $andar->modulo->unidade_id;

        $response = $this->actingAs($admin)->get(route('institucional.espacos.index', [
            'unidade' => $unidadeId,
            'capacidade' => 30,
        ]));

        $response->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('filters.unidade', (string) $unidadeId)
                ->where('filters.capacidade', '30')
        );
    }
}
