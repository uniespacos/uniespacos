<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Relatorio;

use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Models\Agenda;
use App\Models\Andar;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Reserva;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use App\Services\Relatorio\Data\FiltrosRelatorio;
use App\Services\Relatorio\RelatorioService;
use Carbon\CarbonImmutable;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

final class RelatorioServiceScopeIsolationTest extends TestCase
{
    /**
     * Testa que dois gestores com agendas diferentes só enxergam dados de suas próprias agendas.
     * Este é o teste de baseline de isolamento de escopo.
     */
    public function test_gestor_a_nao_enxerga_dados_de_agenda_do_gestor_b(): void
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        // Gestor A
        $gestorA = User::factory()->create(['setor_id' => $setor->id]);
        $gestorA->assignRole('gestor');
        $espacoA = Espaco::factory()->create();
        $agendaA = Agenda::factory()->create([
            'espaco_id' => $espacoA->id,
            'user_id' => $gestorA->id,
        ]);

        // Gestor B
        $gestorB = User::factory()->create(['setor_id' => $setor->id]);
        $gestorB->assignRole('gestor');
        $espacoB = Espaco::factory()->create();
        $agendaB = Agenda::factory()->create([
            'espaco_id' => $espacoB->id,
            'user_id' => $gestorB->id,
        ]);

        // Criar reservas com horários nas agendas A e B
        $usuarioComum = User::factory()->create(['setor_id' => $setor->id]);
        $usuarioComum->assignRole('comum');

        $reservaA = Reserva::factory()->create([
            'user_id' => $usuarioComum->id,
            'data_inicial' => now()->addDay()->setHour(10)->setMinute(0),
            'data_final' => now()->addDay()->setHour(11)->setMinute(0),
        ]);
        Horario::factory()->create([
            'reserva_id' => $reservaA->id,
            'agenda_id' => $agendaA->id,
            'data' => now()->addDay()->toDateString(),
            'situacao' => 'em_analise',
        ]);

        $reservaB = Reserva::factory()->create([
            'user_id' => $usuarioComum->id,
            'data_inicial' => now()->addDay()->setHour(14)->setMinute(0),
            'data_final' => now()->addDay()->setHour(15)->setMinute(0),
        ]);
        Horario::factory()->create([
            'reserva_id' => $reservaB->id,
            'agenda_id' => $agendaB->id,
            'data' => now()->addDay()->toDateString(),
            'situacao' => 'em_analise',
        ]);

        $service = app(RelatorioService::class);
        $filtros = new FiltrosRelatorio(
            dataInicio: CarbonImmutable::now()->startOfMonth(),
            dataFim: CarbonImmutable::now()->endOfMonth(),
        );

        // Gestor A consulta
        $dadosGestorA = $service->agregar($gestorA, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
        $reservasGestorA = collect($dadosGestorA->linhas)->pluck('id')->unique();

        $this->assertContains(
            $reservaA->id,
            $reservasGestorA->toArray(),
            'Gestor A deve ver sua própria reserva.'
        );
        $this->assertNotContains(
            $reservaB->id,
            $reservasGestorA->toArray(),
            'Gestor A NÃO deve ver reserva de Gestor B. VAZAMENTO DE DADOS!'
        );

        // Gestor B consulta
        $dadosGestorB = $service->agregar($gestorB, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
        $reservasGestorB = collect($dadosGestorB->linhas)->pluck('id')->unique();

        $this->assertContains(
            $reservaB->id,
            $reservasGestorB->toArray(),
            'Gestor B deve ver sua própria reserva.'
        );
        $this->assertNotContains(
            $reservaA->id,
            $reservasGestorB->toArray(),
            'Gestor B NÃO deve ver reserva de Gestor A. VAZAMENTO DE DADOS!'
        );
    }

    /**
     * Testa que dois usuários institucionais de instituições diferentes não enxergam dados um do outro.
     */
    public function test_institucional_a_nao_enxerga_dados_de_instituicao_de_institucional_b(): void
    {
        // Instituição 1
        $instituicao1 = Instituicao::factory()->create();
        $unidade1 = Unidade::factory()->create(['instituicao_id' => $instituicao1->id]);
        $modulo1 = Modulo::factory()->create(['unidade_id' => $unidade1->id]);
        $andar1 = Andar::factory()->create(['modulo_id' => $modulo1->id]);
        $setor1 = Setor::factory()->create(['unidade_id' => $unidade1->id]);
        $institucional1 = User::factory()->create(['setor_id' => $setor1->id]);
        $institucional1->assignRole('institucional');

        // Instituição 2
        $instituicao2 = Instituicao::factory()->create();
        $unidade2 = Unidade::factory()->create(['instituicao_id' => $instituicao2->id]);
        $modulo2 = Modulo::factory()->create(['unidade_id' => $unidade2->id]);
        $andar2 = Andar::factory()->create(['modulo_id' => $modulo2->id]);
        $setor2 = Setor::factory()->create(['unidade_id' => $unidade2->id]);
        $institucional2 = User::factory()->create(['setor_id' => $setor2->id]);
        $institucional2->assignRole('institucional');

        $usuario1 = User::factory()->create(['setor_id' => $setor1->id]);
        $usuario1->assignRole('comum');

        $usuario2 = User::factory()->create(['setor_id' => $setor2->id]);
        $usuario2->assignRole('comum');

        // Espaço 1 vinculado à instituição 1
        $espaco1 = Espaco::factory()->create(['andar_id' => $andar1->id]);
        $agenda1 = Agenda::factory()->create([
            'espaco_id' => $espaco1->id,
            'user_id' => null,
        ]);

        // Espaço 2 vinculado à instituição 2
        $espaco2 = Espaco::factory()->create(['andar_id' => $andar2->id]);
        $agenda2 = Agenda::factory()->create([
            'espaco_id' => $espaco2->id,
            'user_id' => null,
        ]);

        // Reserva em instituição 1
        $reserva1 = Reserva::factory()->create([
            'user_id' => $usuario1->id,
            'data_inicial' => now()->addDay()->setHour(9)->setMinute(0),
            'data_final' => now()->addDay()->setHour(10)->setMinute(0),
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva1->id,
            'agenda_id' => $agenda1->id,
            'data' => now()->addDay()->toDateString(),
            'situacao' => 'em_analise',
        ]);

        // Reserva em instituição 2
        $reserva2 = Reserva::factory()->create([
            'user_id' => $usuario2->id,
            'data_inicial' => now()->addDay()->setHour(11)->setMinute(0),
            'data_final' => now()->addDay()->setHour(12)->setMinute(0),
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva2->id,
            'agenda_id' => $agenda2->id,
            'data' => now()->addDay()->toDateString(),
            'situacao' => 'em_analise',
        ]);

        $service = app(RelatorioService::class);
        $filtros = new FiltrosRelatorio(
            dataInicio: CarbonImmutable::now()->startOfMonth(),
            dataFim: CarbonImmutable::now()->endOfMonth(),
        );

        // Institucional 1 consulta
        $dados1 = $service->agregar($institucional1, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
        $reservas1 = collect($dados1->linhas)->pluck('id')->unique();

        $this->assertContains(
            $reserva1->id,
            $reservas1->toArray(),
            'Institucional 1 deve ver reserva de sua instituição.'
        );
        $this->assertNotContains(
            $reserva2->id,
            $reservas1->toArray(),
            'Institucional 1 NÃO deve ver reserva de instituição diferente. VAZAMENTO DE DADOS!'
        );

        // Institucional 2 consulta
        $dados2 = $service->agregar($institucional2, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
        $reservas2 = collect($dados2->linhas)->pluck('id')->unique();

        $this->assertContains(
            $reserva2->id,
            $reservas2->toArray(),
            'Institucional 2 deve ver reserva de sua instituição.'
        );
        $this->assertNotContains(
            $reserva1->id,
            $reservas2->toArray(),
            'Institucional 2 NÃO deve ver reserva de instituição diferente. VAZAMENTO DE DADOS!'
        );
    }

    /**
     * Testa que usuário comum (sem permissão nem papel de gestão/institucional) não pode acessar relatórios.
     */
    public function test_usuario_comum_nao_pode_acessar_relatorios(): void
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $usuarioComum = User::factory()->create(['setor_id' => $setor->id]);
        $usuarioComum->assignRole('comum');

        $service = app(RelatorioService::class);
        $filtros = new FiltrosRelatorio(
            dataInicio: CarbonImmutable::now()->startOfMonth(),
            dataFim: CarbonImmutable::now()->endOfMonth(),
        );

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Tipo de relatório não disponível para este perfil.');

        $service->agregar($usuarioComum, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
    }
}
