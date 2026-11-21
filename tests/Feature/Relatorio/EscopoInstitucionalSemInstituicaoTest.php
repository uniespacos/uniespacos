<?php

declare(strict_types=1);

namespace Tests\Feature\Relatorio;

use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Models\Agenda;
use App\Models\Andar;
use App\Models\Espaco;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Unidade;
use App\Models\User;
use App\Policies\RelatorioPolicy;
use App\Services\Relatorio\Data\FiltrosRelatorio;
use App\Services\Relatorio\RelatorioService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

final class EscopoInstitucionalSemInstituicaoTest extends TestCase
{
    private const NOME_ESPACO_OUTRA_INSTITUICAO = 'Espaco Outra Instituicao';

    private function criarInstitucionalSemSetor(): User
    {
        $usuario = User::factory()->create(['setor_id' => null]);
        $usuario->assignRole('institucional');

        return $usuario;
    }

    private function criarEspacoComAgendaDeOutraInstituicao(): void
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);
        $andar = Andar::factory()->create(['modulo_id' => $modulo->id]);

        $espaco = Espaco::create([
            'andar_id' => $andar->id,
            'nome' => self::NOME_ESPACO_OUTRA_INSTITUICAO,
            'descricao' => 'Descrição de teste',
            'capacidade_pessoas' => 20,
        ]);

        Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => User::factory()->create(['setor_id' => null])->id,
        ]);
    }

    public function test_gate_nao_devolve_escopo_institucional_sem_instituicao(): void
    {
        $usuario = $this->criarInstitucionalSemSetor();

        $escopo = Gate::forUser($usuario)->raw('aplicarEscopoParaUsuario');

        $this->assertIsArray($escopo);
        $this->assertSame([], $escopo);
    }

    public function test_index_de_relatorios_nega_acesso_sem_instituicao(): void
    {
        $this->criarEspacoComAgendaDeOutraInstituicao();
        $usuario = $this->criarInstitucionalSemSetor();

        $this->actingAs($usuario)
            ->get(route('institucional.relatorios.index'))
            ->assertForbidden();
    }

    public function test_dados_de_todos_os_tipos_negam_acesso_sem_instituicao(): void
    {
        $this->criarEspacoComAgendaDeOutraInstituicao();
        $usuario = $this->criarInstitucionalSemSetor();

        foreach (TipoRelatorioEnum::cases() as $tipo) {
            $this->assertTrue($usuario->hasPermissionTo($tipo->permissao()), "Perfil institucional deveria ter a permissão de {$tipo->value}.");

            $response = $this->actingAs($usuario)
                ->postJson(route('institucional.relatorios.dados'), ['tipo' => $tipo->value]);

            $response->assertForbidden();
            $this->assertStringNotContainsString(self::NOME_ESPACO_OUTRA_INSTITUICAO, (string) $response->getContent());
        }
    }

    public function test_exportacao_nega_acesso_sem_instituicao(): void
    {
        $this->criarEspacoComAgendaDeOutraInstituicao();
        $usuario = $this->criarInstitucionalSemSetor();

        foreach (['csv', 'xlsx', 'pdf'] as $formato) {
            $this->actingAs($usuario)
                ->post(route('institucional.relatorios.gerar'), [
                    'tipo' => TipoRelatorioEnum::INVENTARIO_ESPACOS->value,
                    'formato' => $formato,
                ])
                ->assertForbidden();
        }
    }

    public function test_opcoes_de_inventario_negam_acesso_sem_instituicao(): void
    {
        $this->criarEspacoComAgendaDeOutraInstituicao();
        $usuario = $this->criarInstitucionalSemSetor();

        $this->expectException(AuthorizationException::class);

        app(RelatorioService::class)->opcoesInventario($usuario);
    }

    public function test_agregacao_de_todos_os_tipos_nega_acesso_sem_instituicao(): void
    {
        $this->criarEspacoComAgendaDeOutraInstituicao();
        $usuario = $this->criarInstitucionalSemSetor();
        $servico = app(RelatorioService::class);

        foreach (TipoRelatorioEnum::cases() as $tipo) {
            $negado = false;

            try {
                $servico->agregar($usuario, $tipo, new FiltrosRelatorio);
            } catch (AuthorizationException) {
                $negado = true;
            }

            $this->assertTrue($negado, "agregar() de {$tipo->value} deveria negar acesso.");
        }
    }

    public function test_agregacao_com_cache_nega_acesso_sem_tocar_no_cache(): void
    {
        $this->criarEspacoComAgendaDeOutraInstituicao();
        $usuario = $this->criarInstitucionalSemSetor();
        Cache::spy();

        try {
            app(RelatorioService::class)->agregarComCache($usuario, TipoRelatorioEnum::INVENTARIO_ESPACOS, new FiltrosRelatorio);
            $this->fail('agregarComCache deveria negar acesso ao usuário institucional sem instituição.');
        } catch (AuthorizationException) {
            Cache::shouldNotHaveReceived('remember');
        }
    }

    public function test_servico_nega_escopo_institucional_sem_id_mesmo_se_policy_devolver(): void
    {
        $this->criarEspacoComAgendaDeOutraInstituicao();
        $usuario = $this->criarInstitucionalSemSetor();

        $this->mock(RelatorioPolicy::class, function ($mock): void {
            $mock->shouldReceive('aplicarEscopoParaUsuario')->andReturn([
                'tipo' => 'institucional',
                'instituicaoId' => null,
                'unidadeId' => null,
                'agendaIds' => [],
            ]);
        });

        $servico = app(RelatorioService::class);

        $this->expectException(HttpException::class);

        $servico->opcoesInventario($usuario);
    }
}
