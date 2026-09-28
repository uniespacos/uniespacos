<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Instituicao;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Tests\TestCase;

class EspacoListagemUsuarioTest extends TestCase
{
    public function test_common_user_can_access_espacos_index(): void
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $user = User::factory()->create(['setor_id' => $setor->id]);
        $user->assignRole('comum');

        $response = $this->actingAs($user)->get(route('espacos.index'));

        $response->assertOk();
    }
}
