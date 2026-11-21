<?php

declare(strict_types=1);

namespace Tests\Feature\Relatorio;

use App\Models\Agenda;
use App\Models\Andar;
use App\Models\Espaco;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use App\Repositories\EspacoRepositoryInterface;
use App\Services\Relatorio\RelatorioService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class OpcoesInventarioEscopoTest extends TestCase
{
    /**
     * @return array{unidade: Unidade, andar: Andar, setor: Setor}
     */
    private function criarLocalizacao(): array
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);
        $andar = Andar::factory()->create(['modulo_id' => $modulo->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        return ['unidade' => $unidade, 'andar' => $andar, 'setor' => $setor];
    }

    private function criarEspaco(Andar $andar): Espaco
    {
        return Espaco::create([
            'andar_id' => $andar->id,
            'nome' => 'Sala de Teste',
            'descricao' => 'Descrição de teste',
            'capacidade_pessoas' => 20,
        ]);
    }

    #[Test]
    public function gestor_sem_agendas_recebe_opcoes_de_inventario_vazias(): void
    {
        $localizacao = $this->criarLocalizacao();
        $this->criarEspaco($localizacao['andar']);

        $gestor = User::factory()->create(['setor_id' => $localizacao['setor']->id]);
        $gestor->assignRole('gestor');

        $opcoes = app(RelatorioService::class)->opcoesInventario($gestor);

        $this->assertSame([], $opcoes['unidades']);
        $this->assertSame([], $opcoes['modulos']);
        $this->assertSame([], $opcoes['andares']);
        $this->assertSame([], $opcoes['espacos']);
    }

    #[Test]
    public function gestor_com_agenda_recebe_apenas_o_espaco_da_sua_agenda(): void
    {
        $localizacao = $this->criarLocalizacao();
        $gestor = User::factory()->create(['setor_id' => $localizacao['setor']->id]);
        $gestor->assignRole('gestor');

        $espacoDoGestor = $this->criarEspaco($localizacao['andar']);
        Agenda::factory()->create([
            'espaco_id' => $espacoDoGestor->id,
            'user_id' => $gestor->id,
        ]);
        $this->criarEspaco($localizacao['andar']);

        $opcoes = app(RelatorioService::class)->opcoesInventario($gestor);

        $this->assertSame([$espacoDoGestor->id], array_column($opcoes['espacos'], 'id'));
        $this->assertSame([$localizacao['unidade']->id], array_column($opcoes['unidades'], 'id'));
    }

    #[Test]
    public function repositorio_com_lista_vazia_de_agendas_nao_retorna_espacos(): void
    {
        $localizacao = $this->criarLocalizacao();
        $this->criarEspaco($localizacao['andar']);

        $espacos = app(EspacoRepositoryInterface::class)->listarComLocalizacaoParaOpcoes(null, []);

        $this->assertCount(0, $espacos);
    }
}
