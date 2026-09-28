<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Instituicao;
use App\Models\Role;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

final class RelatorioPolicyTest extends TestCase
{
    public function test_gate_retorna_escopo_institucional_para_usuario_institucional(): void
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $institucional = User::factory()->create(['setor_id' => $setor->id]);
        $institucional->assignRole('institucional');

        $escopo = Gate::forUser($institucional)->raw('aplicarEscopoParaUsuario');

        $this->assertIsArray($escopo);
        $this->assertEquals('institucional', $escopo['tipo']);
        $this->assertEquals($instituicao->id, $escopo['instituicaoId']);
        $this->assertEmpty($escopo['agendaIds']);
    }

    public function test_gate_retorna_escopo_de_agendas_para_usuario_gestor(): void
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $gestor = User::factory()->create(['setor_id' => $setor->id]);
        $gestor->assignRole('gestor');

        $espaco = Espaco::factory()->create();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
        ]);

        $escopo = Gate::forUser($gestor)->raw('aplicarEscopoParaUsuario');

        $this->assertIsArray($escopo);
        $this->assertEquals('gestor', $escopo['tipo']);
        $this->assertNull($escopo['instituicaoId']);
        $this->assertContains($agenda->id, $escopo['agendaIds']);
    }

    public function test_gate_retorna_escopo_vazio_para_usuario_comum(): void
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $comum = User::factory()->create(['setor_id' => $setor->id]);
        $comum->assignRole('comum');

        $escopo = Gate::forUser($comum)->raw('aplicarEscopoParaUsuario');

        $this->assertIsArray($escopo);
        $this->assertEmpty($escopo);
    }

    public function test_novo_papel_com_permissao_pbac_funciona_automaticamente(): void
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        // Criar um papel customizado "coordenador"
        $roleCoordenador = Role::create(['name' => 'coordenador', 'guard_name' => 'web']);
        $roleCoordenador->givePermissionTo('relatorios.escopo-agendas');

        $usuarioCustom = User::factory()->create(['setor_id' => $setor->id]);
        $usuarioCustom->assignRole('coordenador');

        $espaco = Espaco::factory()->create();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $usuarioCustom->id,
        ]);

        $escopo = Gate::forUser($usuarioCustom)->raw('aplicarEscopoParaUsuario');

        $this->assertIsArray($escopo);
        $this->assertEquals('gestor', $escopo['tipo'], 'Papel customizado com permissão de agenda deve receber escopo de gestor.');
        $this->assertContains($agenda->id, $escopo['agendaIds']);
    }
}
