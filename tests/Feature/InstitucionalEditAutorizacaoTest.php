<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InstitucionalEditAutorizacaoTest extends TestCase
{
    private Instituicao $instituicao;

    private Unidade $unidade;

    private Setor $setor;

    private Modulo $modulo;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['secao.gestao-unidades', 'secao.gestao-modulos', 'secao.gestao-instituicoes', 'unidades.atualizar', 'modulos.atualizar', 'instituicoes.atualizar'] as $permissao) {
            Permission::firstOrCreate(['name' => $permissao, 'guard_name' => 'web']);
        }

        $this->instituicao = Instituicao::factory()->create();
        $this->unidade = Unidade::factory()->create(['instituicao_id' => $this->instituicao->id]);
        $this->setor = Setor::factory()->create(['unidade_id' => $this->unidade->id]);
        $this->modulo = Modulo::factory()->create(['unidade_id' => $this->unidade->id]);
    }

    #[Test]
    public function edit_de_unidade_sem_permissao_de_atualizar_retorna_403(): void
    {
        $usuario = $this->usuarioCom(['secao.gestao-unidades']);

        $this->actingAs($usuario)
            ->get(route('institucional.unidades.edit', $this->unidade))
            ->assertForbidden();
    }

    #[Test]
    public function edit_de_unidade_com_permissao_de_atualizar_renderiza(): void
    {
        $usuario = $this->usuarioCom(['secao.gestao-unidades', 'unidades.atualizar']);

        $this->actingAs($usuario)
            ->get(route('institucional.unidades.edit', $this->unidade))
            ->assertOk();
    }

    #[Test]
    public function edit_de_modulo_sem_permissao_de_atualizar_retorna_403(): void
    {
        $usuario = $this->usuarioCom(['secao.gestao-modulos']);

        $this->actingAs($usuario)
            ->get(route('institucional.modulos.edit', $this->modulo))
            ->assertForbidden();
    }

    #[Test]
    public function edit_de_modulo_com_permissao_de_atualizar_renderiza(): void
    {
        $usuario = $this->usuarioCom(['secao.gestao-modulos', 'modulos.atualizar']);

        $this->actingAs($usuario)
            ->get(route('institucional.modulos.edit', $this->modulo))
            ->assertOk();
    }

    #[Test]
    public function edit_de_instituicao_sem_permissao_de_atualizar_retorna_403(): void
    {
        $usuario = $this->usuarioCom(['secao.gestao-instituicoes']);

        $this->actingAs($usuario)
            ->get(route('institucional.instituicoes.edit', $this->instituicao))
            ->assertForbidden();
    }

    #[Test]
    public function edit_de_instituicao_com_permissao_de_atualizar_renderiza(): void
    {
        $usuario = $this->usuarioCom(['secao.gestao-instituicoes', 'instituicoes.atualizar']);

        $this->actingAs($usuario)
            ->get(route('institucional.instituicoes.edit', $this->instituicao))
            ->assertOk();
    }

    /**
     * @param  list<string>  $permissoes
     */
    private function usuarioCom(array $permissoes): User
    {
        $usuario = User::factory()->create(['setor_id' => $this->setor->id]);
        $usuario->givePermissionTo($permissoes);

        return $usuario;
    }
}
