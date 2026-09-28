<?php

declare(strict_types=1);

namespace Tests\Feature\Relatorio;

use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Models\Andar;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use App\Services\EspacoService;
use App\Services\Relatorio\Data\FiltrosRelatorio;
use App\Services\Relatorio\RelatorioService;
use Tests\TestCase;

final class RelatorioInventarioCacheTest extends TestCase
{
    private RelatorioService $relatorioService;

    private EspacoService $espacoService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->relatorioService = app(RelatorioService::class);
        $this->espacoService = app(EspacoService::class);
    }

    private function criarCenario(): array
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);
        $andar = Andar::factory()->create(['modulo_id' => $modulo->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $institucional = User::factory()->create(['setor_id' => $setor->id]);
        $institucional->assignRole('institucional');

        $gestor = User::factory()->create(['setor_id' => $setor->id]);
        $gestor->assignRole('gestor');

        return [$institucional, $instituicao, $unidade, $modulo, $andar, $gestor, $setor];
    }

    public function test_store_espaco_invalida_cache_inventario(): void
    {
        [$institucional, , , , $andar] = $this->criarCenario();
        $filtros = new FiltrosRelatorio;

        // 1. Agregação inicial (cache miss e armazena cache)
        $dados1 = $this->relatorioService->agregarComCache($institucional, TipoRelatorioEnum::INVENTARIO_ESPACOS, $filtros);
        $totalAntes = $dados1->totalLinhas();

        // 2. Criação de espaço via EspacoService (deve invalidar cache)
        $novoEspaco = $this->espacoService->store([
            'nome' => 'Laboratório Novo Invalidação',
            'capacidade_pessoas' => 45,
            'descricao' => 'Espaço criado para teste de invalidação de cache',
            'andar_id' => $andar->id,
        ]);

        // 3. Segunda consulta deve gerar cache miss e incluir o novo espaço
        $dados2 = $this->relatorioService->agregarComCache($institucional, TipoRelatorioEnum::INVENTARIO_ESPACOS, $filtros);

        $this->assertSame($totalAntes + 1, $dados2->totalLinhas());
        $ids = collect($dados2->linhas)->pluck('id')->all();
        $this->assertContains($novoEspaco->id, $ids);
    }

    public function test_update_espaco_invalida_cache_inventario(): void
    {
        [$institucional, , , , $andar] = $this->criarCenario();
        $espaco = $this->espacoService->store([
            'nome' => 'Auditório Antigo',
            'capacidade_pessoas' => 100,
            'descricao' => 'Descrição original',
            'andar_id' => $andar->id,
        ]);

        $filtros = new FiltrosRelatorio;

        // 1. Agregação inicial (cache miss e armazena cache)
        $dados1 = $this->relatorioService->agregarComCache($institucional, TipoRelatorioEnum::INVENTARIO_ESPACOS, $filtros);
        $linhaEspaco1 = collect($dados1->linhas)->firstWhere('id', $espaco->id);
        $this->assertNotNull($linhaEspaco1);
        $this->assertSame('Auditório Antigo', $linhaEspaco1['nome']);

        // 2. Atualização de dados via EspacoService (deve invalidar cache)
        $this->espacoService->update($espaco, [
            'nome' => 'Auditório Renomeado Invalidação',
            'capacidade_pessoas' => 120,
            'descricao' => 'Descrição atualizada',
            'andar_id' => $andar->id,
        ]);

        // 3. Consulta após mutação deve refletir o novo nome
        $dados2 = $this->relatorioService->agregarComCache($institucional, TipoRelatorioEnum::INVENTARIO_ESPACOS, $filtros);
        $linhaEspaco2 = collect($dados2->linhas)->firstWhere('id', $espaco->id);
        $this->assertNotNull($linhaEspaco2);
        $this->assertSame('Auditório Renomeado Invalidação', $linhaEspaco2['nome']);
        $this->assertSame(120, $linhaEspaco2['capacidade_pessoas']);
    }

    public function test_update_gestores_invalida_cache_inventario(): void
    {
        [$institucional, , , , $andar, , $setor] = $this->criarCenario();
        $espaco = $this->espacoService->store([
            'nome' => 'Sala Gestor Teste',
            'capacidade_pessoas' => 30,
            'descricao' => 'Espaço para troca de gestores',
            'andar_id' => $andar->id,
        ]);

        $novoGestor = User::factory()->create([
            'name' => 'Prof. Gestor Inventario',
            'setor_id' => $setor->id,
        ]);
        $novoGestor->assignRole('gestor');

        $filtros = new FiltrosRelatorio;

        // 1. Agregação inicial (cache miss)
        $dados1 = $this->relatorioService->agregarComCache($institucional, TipoRelatorioEnum::INVENTARIO_ESPACOS, $filtros);
        $linha1 = collect($dados1->linhas)->firstWhere('id', $espaco->id);
        $this->assertNotNull($linha1);
        $this->assertSame('—', $linha1['gestores']);

        // 2. Atualização de gestores via EspacoService (deve invalidar cache)
        $this->espacoService->updateGestores($espaco, [
            'gestores' => [
                'manha' => $novoGestor->id,
                'tarde' => null,
                'noite' => null,
            ],
        ]);

        // 3. Consulta deve trazer o nome do novo gestor
        $dados2 = $this->relatorioService->agregarComCache($institucional, TipoRelatorioEnum::INVENTARIO_ESPACOS, $filtros);
        $linha2 = collect($dados2->linhas)->firstWhere('id', $espaco->id);
        $this->assertNotNull($linha2);
        $this->assertStringContainsString('Prof. Gestor Inventario', $linha2['gestores']);
    }

    public function test_delete_espaco_invalida_cache_inventario(): void
    {
        [$institucional, , , , $andar] = $this->criarCenario();
        $espaco = $this->espacoService->store([
            'nome' => 'Espaço a ser Deletado',
            'capacidade_pessoas' => 20,
            'descricao' => 'Para exclusão',
            'andar_id' => $andar->id,
        ]);

        $filtros = new FiltrosRelatorio;

        // 1. Agregação inicial (cache miss)
        $dados1 = $this->relatorioService->agregarComCache($institucional, TipoRelatorioEnum::INVENTARIO_ESPACOS, $filtros);
        $idsAntes = collect($dados1->linhas)->pluck('id')->all();
        $this->assertContains($espaco->id, $idsAntes);

        // 2. Exclusão via EspacoService (deve invalidar cache)
        $deletado = $this->espacoService->delete($espaco);
        $this->assertTrue($deletado);

        // 3. Consulta subsequente não deve mais conter o espaço deletado
        $dados2 = $this->relatorioService->agregarComCache($institucional, TipoRelatorioEnum::INVENTARIO_ESPACOS, $filtros);
        $idsDepois = collect($dados2->linhas)->pluck('id')->all();
        $this->assertNotContains($espaco->id, $idsDepois);
    }
}
