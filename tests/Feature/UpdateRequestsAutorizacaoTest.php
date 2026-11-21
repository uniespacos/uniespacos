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
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class UpdateRequestsAutorizacaoTest extends TestCase
{
    protected Instituicao $instituicao;

    protected Unidade $unidade;

    protected Setor $setor;

    protected Modulo $modulo;

    protected Espaco $espaco;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'secao.gestao-espacos', 'espacos.criar', 'espacos.atualizar',
            'secao.gestao-instituicoes', 'instituicoes.criar', 'instituicoes.atualizar',
            'secao.gestao-setores', 'setores.criar', 'setores.atualizar',
            'secao.gestao-unidades', 'unidades.criar', 'unidades.atualizar',
            'secao.gestao-modulos', 'modulos.criar', 'modulos.atualizar',
        ] as $permissao) {
            Permission::firstOrCreate(['name' => $permissao, 'guard_name' => 'web']);
        }

        $this->instituicao = Instituicao::factory()->create();
        $this->unidade = Unidade::factory()->create(['instituicao_id' => $this->instituicao->id]);
        $this->setor = Setor::factory()->create(['unidade_id' => $this->unidade->id]);
        $this->modulo = Modulo::factory()->create([
            'nome' => 'Módulo Original',
            'unidade_id' => $this->unidade->id,
        ]);
        $andar = Andar::factory()->create([
            'nome' => 'terreo',
            'tipo_acesso' => ['terreo'],
            'modulo_id' => $this->modulo->id,
        ]);

        User::factory()->create(['setor_id' => $this->setor->id]);
        $this->espaco = Espaco::factory()->create([
            'nome' => 'Espaço Original',
            'andar_id' => $andar->id,
        ]);
    }

    public function test_espaco_atualizar_sem_criar_consegue_atualizar(): void
    {
        $user = $this->usuarioCom(['secao.gestao-espacos', 'espacos.atualizar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.espacos.update', $this->espaco->id), $this->payloadEspaco('Espaço Atualizado'));

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('espacos', ['id' => $this->espaco->id, 'nome' => 'Espaço Atualizado']);
    }

    public function test_espaco_criar_sem_atualizar_recebe_403(): void
    {
        $user = $this->usuarioCom(['secao.gestao-espacos', 'espacos.criar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.espacos.update', $this->espaco->id), $this->payloadEspaco('Espaço Não Autorizado'));

        $response->assertForbidden();
        $this->assertDatabaseHas('espacos', ['id' => $this->espaco->id, 'nome' => 'Espaço Original']);
    }

    public function test_instituicao_atualizar_sem_criar_consegue_atualizar(): void
    {
        $user = $this->usuarioCom(['secao.gestao-instituicoes', 'instituicoes.atualizar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.instituicoes.update', $this->instituicao->id), [
                'nome' => 'Instituição Atualizada',
                'sigla' => 'IAT',
            ]);

        $response->assertRedirect(route('institucional.instituicoes.index'));
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('instituicaos', ['id' => $this->instituicao->id, 'nome' => 'Instituição Atualizada']);
    }

    public function test_instituicao_criar_sem_atualizar_recebe_403(): void
    {
        $user = $this->usuarioCom(['secao.gestao-instituicoes', 'instituicoes.criar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.instituicoes.update', $this->instituicao->id), [
                'nome' => 'Instituição Não Autorizada',
                'sigla' => 'INA',
            ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('instituicaos', ['nome' => 'Instituição Não Autorizada']);
    }

    public function test_setor_atualizar_sem_criar_consegue_atualizar(): void
    {
        $user = $this->usuarioCom(['secao.gestao-setores', 'setores.atualizar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.setors.update', $this->setor->id), [
                'nome' => 'Setor Atualizado',
                'sigla' => 'SAT',
                'unidade_id' => $this->unidade->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('setors', ['id' => $this->setor->id, 'nome' => 'Setor Atualizado']);
    }

    public function test_setor_criar_sem_atualizar_recebe_403(): void
    {
        $user = $this->usuarioCom(['secao.gestao-setores', 'setores.criar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.setors.update', $this->setor->id), [
                'nome' => 'Setor Não Autorizado',
                'sigla' => 'SNA',
                'unidade_id' => $this->unidade->id,
            ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('setors', ['nome' => 'Setor Não Autorizado']);
    }

    public function test_unidade_atualizar_sem_criar_consegue_atualizar(): void
    {
        $user = $this->usuarioCom(['secao.gestao-unidades', 'unidades.atualizar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.unidades.update', $this->unidade->id), [
                'nome' => 'Unidade Atualizada',
                'sigla' => 'UAT',
                'instituicao_id' => $this->instituicao->id,
            ]);

        $response->assertRedirect(route('institucional.unidades.index'));
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('unidades', ['id' => $this->unidade->id, 'nome' => 'Unidade Atualizada']);
    }

    public function test_unidade_criar_sem_atualizar_recebe_403(): void
    {
        $user = $this->usuarioCom(['secao.gestao-unidades', 'unidades.criar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.unidades.update', $this->unidade->id), [
                'nome' => 'Unidade Não Autorizada',
                'sigla' => 'UNA',
                'instituicao_id' => $this->instituicao->id,
            ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('unidades', ['nome' => 'Unidade Não Autorizada']);
    }

    public function test_modulo_atualizar_sem_criar_consegue_atualizar(): void
    {
        $user = $this->usuarioCom(['secao.gestao-modulos', 'modulos.atualizar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.modulos.update', $this->modulo->id), $this->payloadModulo('Módulo Atualizado'));

        $response->assertRedirect(route('institucional.modulos.index'));
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('modulos', ['id' => $this->modulo->id, 'nome' => 'Módulo Atualizado']);
    }

    public function test_modulo_criar_sem_atualizar_recebe_403(): void
    {
        $user = $this->usuarioCom(['secao.gestao-modulos', 'modulos.criar']);

        $response = $this->actingAs($user)
            ->put(route('institucional.modulos.update', $this->modulo->id), $this->payloadModulo('Módulo Não Autorizado'));

        $response->assertForbidden();
        $this->assertDatabaseHas('modulos', ['id' => $this->modulo->id, 'nome' => 'Módulo Original']);
    }

    /**
     * @param  list<string>  $permissoes
     */
    private function usuarioCom(array $permissoes): User
    {
        $user = User::factory()->create(['setor_id' => $this->setor->id]);
        $user->givePermissionTo($permissoes);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadEspaco(string $nome): array
    {
        return [
            'unidade_id' => $this->unidade->id,
            'modulo_id' => $this->modulo->id,
            'andar_id' => $this->espaco->andar_id,
            'nome' => $nome,
            'capacidade_pessoas' => 30,
            'descricao' => 'Descrição do espaço',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadModulo(string $nome): array
    {
        return [
            'nome' => $nome,
            'unidade_id' => $this->unidade->id,
            'andares' => [
                [
                    'nome' => 'terreo',
                    'tipo_acesso' => ['terreo'],
                ],
            ],
        ];
    }
}
