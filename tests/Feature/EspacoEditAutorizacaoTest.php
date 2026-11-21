<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Espaco;
use App\Models\User;
use Tests\TestCase;

class EspacoEditAutorizacaoTest extends TestCase
{
    public function test_edit_sem_permissao_de_atualizar_retorna_403(): void
    {
        $usuario = User::factory()->create();
        $usuario->givePermissionTo('secao.gestao-espacos');
        $espaco = Espaco::factory()->create();

        $this->actingAs($usuario)
            ->get(route('institucional.espacos.edit', $espaco))
            ->assertForbidden();
    }

    public function test_edit_com_permissao_de_atualizar_renderiza_o_formulario(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('institucional');
        $espaco = Espaco::factory()->create();

        $this->actingAs($usuario)
            ->get(route('institucional.espacos.edit', $espaco))
            ->assertOk();
    }
}
