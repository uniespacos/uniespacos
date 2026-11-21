<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Exceptions\DominioException;
use App\Models\Instituicao;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use App\Services\SetorService;
use App\Services\UnidadeService;
use App\Support\MensagemDeErro;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InstitucionalErroPadronizadoTest extends TestCase
{
    private const SENHA = 'senha-correta-123';

    private const CANARIO = 'canario-sql-7f3a';

    private Unidade $unidade;

    private Setor $setor;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['secao.gestao-setores', 'setores.deletar', 'secao.gestao-unidades', 'unidades.deletar'] as $permissao) {
            Permission::firstOrCreate(['name' => $permissao, 'guard_name' => 'web']);
        }

        $instituicao = Instituicao::factory()->create();
        $this->unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $this->setor = Setor::factory()->create(['unidade_id' => $this->unidade->id]);

        $this->admin = User::factory()->create([
            'setor_id' => $this->setor->id,
            'password' => self::SENHA,
        ]);
        $this->admin->givePermissionTo(['secao.gestao-setores', 'setores.deletar', 'secao.gestao-unidades', 'unidades.deletar']);
    }

    #[Test]
    public function falha_inesperada_ao_excluir_setor_volta_pelo_flash_de_erro_com_mensagem_generica(): void
    {
        $this->mock(SetorService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('delete')->once()->andThrow(new RuntimeException(self::CANARIO));
        });

        $response = $this->actingAs($this->admin)
            ->delete(route('institucional.setors.destroy', $this->setor), ['password' => self::SENHA]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('error', __('Error removing sector: :message', ['message' => __(MensagemDeErro::GENERICA)]));
        $this->assertStringNotContainsString(self::CANARIO, (string) $response->getSession()->get('error'));
    }

    #[Test]
    public function falha_inesperada_ao_excluir_unidade_volta_pelo_mesmo_canal_do_setor(): void
    {
        $this->mock(UnidadeService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('delete')->once()->andThrow(new RuntimeException(self::CANARIO));
        });

        $response = $this->actingAs($this->admin)
            ->delete(route('institucional.unidades.destroy', $this->unidade), ['password' => self::SENHA]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('error', __('Error deleting unit: :message', ['message' => __(MensagemDeErro::GENERICA)]));
        $this->assertStringNotContainsString(self::CANARIO, (string) $response->getSession()->get('error'));
    }

    #[Test]
    public function excecao_de_dominio_ao_excluir_setor_mostra_a_propria_mensagem(): void
    {
        $mensagem = 'Setor possui agenda vinculada.';

        $this->mock(SetorService::class, function (MockInterface $mock) use ($mensagem): void {
            $mock->shouldReceive('delete')->once()->andThrow(new class($mensagem) extends DominioException {});
        });

        $response = $this->actingAs($this->admin)
            ->delete(route('institucional.setors.destroy', $this->setor), ['password' => self::SENHA]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('error', __('Error removing sector: :message', ['message' => $mensagem]));
    }

    #[Test]
    public function excecao_de_dominio_ao_excluir_unidade_mostra_a_propria_mensagem(): void
    {
        $mensagem = 'Unidade possui setores vinculados.';

        $this->mock(UnidadeService::class, function (MockInterface $mock) use ($mensagem): void {
            $mock->shouldReceive('delete')->once()->andThrow(new class($mensagem) extends DominioException {});
        });

        $response = $this->actingAs($this->admin)
            ->delete(route('institucional.unidades.destroy', $this->unidade), ['password' => self::SENHA]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('error', __('Error deleting unit: :message', ['message' => $mensagem]));
    }
}
