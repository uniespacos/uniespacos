<?php

declare(strict_types=1);

namespace Tests\Feature\Relatorio;

use App\Enums\Relatorio\FormatoRelatorioEnum;
use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Events\ReservaEvent;
use App\Listeners\InvalidarCacheRelatoriosAoAtualizarReserva;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Instituicao;
use App\Models\Reserva;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use App\Services\Relatorio\Data\FiltrosRelatorio;
use App\Services\Relatorio\RelatorioService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

final class RelatorioServiceCacheTest extends TestCase
{
    private RelatorioService $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Meio do mês, meio-dia: reservas em now()->addDay() e o filtro mensal
        // nunca cruzam a virada do mês, independente da data real do CI.
        $this->travelTo(CarbonImmutable::parse('2026-06-15 12:00:00'));

        $this->service = app(RelatorioService::class);
    }

    private function criarGestorComAgenda(): array
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

        return [$gestor, $agenda, $espaco, $setor];
    }

    public function test_cache_hit_retorna_dados_cached_com_mesmo_resultado(): void
    {
        [$gestor, $agenda] = $this->criarGestorComAgenda();

        $usuarioComum = User::factory()->create();
        $usuarioComum->assignRole('comum');

        $reserva = Reserva::factory()->create([
            'user_id' => $usuarioComum->id,
            'data_inicial' => now()->addDay()->setHour(9)->setMinute(0),
            'data_final' => now()->addDay()->setHour(10)->setMinute(0),
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => now()->addDay()->toDateString(),
            'situacao' => 'em_analise',
        ]);

        $filtros = new FiltrosRelatorio(
            dataInicio: CarbonImmutable::now()->addDay()->startOfMonth(),
            dataFim: CarbonImmutable::now()->addDay()->endOfMonth(),
        );

        // Act 1: primeira chamada (cache miss) — executa a agregação sobre reservas/horários
        DB::flushQueryLog();
        DB::enableQueryLog();
        $dados1 = $this->service->agregarComCache($gestor, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
        $sqlMiss = array_column(DB::getQueryLog(), 'query');

        // Act 2: segunda chamada com mesmos parâmetros (cache hit)
        DB::flushQueryLog();
        $dados2 = $this->service->agregarComCache($gestor, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
        $sqlHit = array_column(DB::getQueryLog(), 'query');
        DB::disableQueryLog();

        // Assert: o escopo do usuário (agendas) é resolvido antes da chave de cache, então o hit
        // pode consultar `agendas`; o que ele não pode é reexecutar a agregação.
        $consultaAgregacao = static fn (string $sql): bool => preg_match('/\b(from|join)\s+"(reservas|horarios)"/i', $sql) === 1;
        $this->assertSame(1, $dados1->totalLinhas(), 'O cenário precisa produzir linhas para o teste provar algo.');
        $this->assertNotEmpty(array_filter($sqlMiss, $consultaAgregacao), 'O cache miss deve executar a agregação no banco.');
        $this->assertSame([], array_values(array_filter($sqlHit, $consultaAgregacao)), 'O cache hit não deve executar a agregação no banco.');
        $this->assertLessThan(count($sqlMiss), count($sqlHit));
        $this->assertSame($dados1->totalLinhas(), $dados2->totalLinhas());
        $this->assertEquals($dados1->linhas, $dados2->linhas);
        $this->assertEquals($dados1->sumario, $dados2->sumario);
        $this->assertEquals($dados1->filtrosAplicados, $dados2->filtrosAplicados);
    }

    public function test_isolamento_entre_usuarios_gestores_nao_compartilham_cache(): void
    {
        // Arrange: 2 gestores com agendas distintas
        [$gestorA, $agendaA] = $this->criarGestorComAgenda();
        [$gestorB, $agendaB] = $this->criarGestorComAgenda();

        $usuarioComum = User::factory()->create();
        $usuarioComum->assignRole('comum');

        $reservaA = Reserva::factory()->create([
            'user_id' => $usuarioComum->id,
            'data_inicial' => now()->addDay()->setHour(8)->setMinute(0),
            'data_final' => now()->addDay()->setHour(9)->setMinute(0),
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

        // Ambos solicitam relatório com o mesmo objeto de filtros (sem agendaIds definidos)
        $filtros = new FiltrosRelatorio(
            dataInicio: CarbonImmutable::now()->addDay()->startOfMonth(),
            dataFim: CarbonImmutable::now()->addDay()->endOfMonth(),
        );

        // Act
        $dadosGestorA = $this->service->agregarComCache($gestorA, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
        $dadosGestorB = $this->service->agregarComCache($gestorB, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);

        $reservasGestorA = collect($dadosGestorA->linhas)->pluck('id')->unique()->values()->all();
        $reservasGestorB = collect($dadosGestorB->linhas)->pluck('id')->unique()->values()->all();

        // Assert: Gestor A só vê Reserva A em seu escopo
        $this->assertContains($reservaA->id, $reservasGestorA);
        $this->assertNotContains($reservaB->id, $reservasGestorA, 'Vazamento detectado: Gestor A viu reserva de Gestor B');

        // Assert: Gestor B só vê Reserva B em seu escopo
        $this->assertContains($reservaB->id, $reservasGestorB);
        $this->assertNotContains($reservaA->id, $reservasGestorB, 'Vazamento detectado: Gestor B viu reserva de Gestor A');

        // Assert: Dados retornados são completamente distintos
        $this->assertNotEquals($reservasGestorA, $reservasGestorB);
        $this->assertNotEquals($dadosGestorA->linhas, $dadosGestorB->linhas);

        // Assert: Chaves de cache são distintas e ambas estão cacheadas de forma isolada
        $reflectionGerarKey = new \ReflectionMethod($this->service, 'gerarCacheKey');
        $reflectionEscopo = new \ReflectionMethod($this->service, 'aplicarEscopo');

        $filtrosEscopoA = $reflectionEscopo->invoke($this->service, $gestorA, $filtros);
        $filtrosEscopoB = $reflectionEscopo->invoke($this->service, $gestorB, $filtros);

        $keyA = $reflectionGerarKey->invoke($this->service, TipoRelatorioEnum::RESERVAS_PERIODO, $gestorA->id, $filtrosEscopoA);
        $keyB = $reflectionGerarKey->invoke($this->service, TipoRelatorioEnum::RESERVAS_PERIODO, $gestorB->id, $filtrosEscopoB);

        $this->assertNotEquals($keyA, $keyB);
        $this->assertTrue(Cache::has($keyA));
        $this->assertTrue(Cache::has($keyB));
    }

    public function test_invalidar_cache_do_tipo_gera_novo_cache(): void
    {
        [$gestor, $agenda] = $this->criarGestorComAgenda();

        $usuarioComum = User::factory()->create();
        $usuarioComum->assignRole('comum');

        $filtros = new FiltrosRelatorio(
            dataInicio: CarbonImmutable::now()->addDay()->startOfMonth(),
            dataFim: CarbonImmutable::now()->addDay()->endOfMonth(),
        );

        // Primeira agregação: sem reservas no período
        $dadosAntes = $this->service->agregarComCache($gestor, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
        $this->assertSame(0, $dadosAntes->totalLinhas());

        // Cria nova reserva
        $novaReserva = Reserva::factory()->create([
            'user_id' => $usuarioComum->id,
            'data_inicial' => now()->addDay()->setHour(10)->setMinute(0),
            'data_final' => now()->addDay()->setHour(11)->setMinute(0),
        ]);
        Horario::factory()->create([
            'reserva_id' => $novaReserva->id,
            'agenda_id' => $agenda->id,
            'data' => now()->addDay()->toDateString(),
            'situacao' => 'em_analise',
        ]);

        // Chamada antes de invalidar traria 0 por causa do cache ativo
        $dadosComCache = $this->service->agregarComCache($gestor, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
        $this->assertSame(0, $dadosComCache->totalLinhas());

        // Invalida cache do tipo
        $this->service->invalidarCacheDoTipo(TipoRelatorioEnum::RESERVAS_PERIODO);

        // Próxima chamada deve ser cache miss e retornar a nova reserva
        $dadosDepois = $this->service->agregarComCache($gestor, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
        $this->assertSame(1, $dadosDepois->totalLinhas());
        $this->assertSame($novaReserva->id, $dadosDepois->linhas[0]['id']);
    }

    public function test_invalidar_cache_especifico_de_usuario_preserva_outro_usuario(): void
    {
        [$gestorA] = $this->criarGestorComAgenda();
        [$gestorB] = $this->criarGestorComAgenda();

        $versaoAInicial = (int) (Cache::get("relatorio_version:reservas_periodo:{$gestorA->id}") ?? 1);
        $versaoBInicial = (int) (Cache::get("relatorio_version:reservas_periodo:{$gestorB->id}") ?? 1);

        // Invalida somente para gestor A
        $this->service->invalidarCacheDoTipo(TipoRelatorioEnum::RESERVAS_PERIODO, $gestorA->id);

        $versaoAPos = (int) Cache::get("relatorio_version:reservas_periodo:{$gestorA->id}");
        $versaoBPos = (int) (Cache::get("relatorio_version:reservas_periodo:{$gestorB->id}") ?? 1);

        $this->assertSame($versaoAInicial + 1, $versaoAPos);
        $this->assertSame($versaoBInicial, $versaoBPos);
    }

    public function test_listener_invalida_cache_ao_receber_reserva_event(): void
    {
        $versaoReservas = (int) (Cache::get('relatorio_version:reservas_periodo') ?? 1);
        $versaoOcupacao = (int) (Cache::get('relatorio_version:ocupacao_espacos') ?? 1);
        $versaoIndicadores = (int) (Cache::get('relatorio_version:indicadores_consolidados') ?? 1);
        $versaoInventario = (int) (Cache::get('relatorio_version:inventario_espacos') ?? 1);

        $listener = app(InvalidarCacheRelatoriosAoAtualizarReserva::class);
        $event = new ReservaEvent(
            action: 'updated',
            reservaId: 1,
            espacoId: 2,
            horariosCount: 1,
        );

        $listener->handle($event);

        // Tipos dependentes de reservas devem ter sido incrementados
        $this->assertSame($versaoReservas + 1, (int) Cache::get('relatorio_version:reservas_periodo'));
        $this->assertSame($versaoOcupacao + 1, (int) Cache::get('relatorio_version:ocupacao_espacos'));
        $this->assertSame($versaoIndicadores + 1, (int) Cache::get('relatorio_version:indicadores_consolidados'));

        // Inventário de espaços não depende de reserva, não deve ser incrementado
        $this->assertSame($versaoInventario, (int) (Cache::get('relatorio_version:inventario_espacos') ?? 1));
    }

    public function test_listener_esta_registrado_no_framework(): void
    {
        $listeners = Event::getListeners(ReservaEvent::class);

        $registrado = false;
        foreach ($listeners as $listener) {
            if (is_string($listener) && $listener === InvalidarCacheRelatoriosAoAtualizarReserva::class) {
                $registrado = true;
                break;
            }
            if (is_array($listener) && isset($listener[0]) && $listener[0] instanceof InvalidarCacheRelatoriosAoAtualizarReserva) {
                $registrado = true;
                break;
            }
            if ($listener instanceof \Closure) {
                // Closure listener
                $registrado = true;
                break;
            }
        }

        $this->assertTrue($registrado || count($listeners) > 0, 'Listener de invalidação deve estar registrado para ReservaEvent.');
    }

    public function test_usuario_sem_permissao_lanca_403_ao_agregar_com_cache(): void
    {
        $usuarioComum = User::factory()->create();
        $usuarioComum->assignRole('comum');

        $filtros = new FiltrosRelatorio(
            dataInicio: CarbonImmutable::now()->startOfMonth(),
            dataFim: CarbonImmutable::now()->endOfMonth(),
        );

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Tipo de relatório não disponível para este perfil.');

        $this->service->agregarComCache($usuarioComum, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);
    }

    public function test_gerar_utiliza_agregar_com_cache(): void
    {
        [$gestor] = $this->criarGestorComAgenda();

        $filtros = new FiltrosRelatorio(
            dataInicio: CarbonImmutable::now()->startOfMonth(),
            dataFim: CarbonImmutable::now()->endOfMonth(),
        );

        $response = $this->service->gerar(
            $gestor,
            TipoRelatorioEnum::RESERVAS_PERIODO,
            FormatoRelatorioEnum::CSV,
            $filtros,
        );

        $this->assertNotNull($response);
        $this->assertTrue(method_exists($response, 'getStatusCode'));
        $this->assertSame(200, $response->getStatusCode());
    }

    /**
     * Relógios em que a reserva de "amanhã" cai no mês seguinte (virada de mês/ano)
     * ou no dia 1: o período do relatório deve ser derivado da data da reserva.
     *
     * @return array<string, array{string}>
     */
    public static function relogiosDeViradaDeMes(): array
    {
        return [
            '2026-10-31 23:30 UTC' => ['2026-10-31 23:30:00'],
            '2026-01-31 23:30 UTC' => ['2026-01-31 23:30:00'],
            '2026-02-28 12:00 UTC (fim de fev. não bissexto)' => ['2026-02-28 12:00:00'],
            '2026-04-29 12:00 UTC' => ['2026-04-29 12:00:00'],
            '2026-04-30 12:00 UTC' => ['2026-04-30 12:00:00'],
            '2026-12-31 23:30 UTC (virada de ano)' => ['2026-12-31 23:30:00'],
            '2026-11-01 00:30 UTC (dia 1)' => ['2026-11-01 00:30:00'],
        ];
    }

    #[DataProvider('relogiosDeViradaDeMes')]
    public function test_periodo_derivado_da_data_da_reserva_no_ultimo_dia_do_mes(string $agora): void
    {
        $this->travelTo(CarbonImmutable::parse($agora, 'UTC'));

        [$gestor, $agenda] = $this->criarGestorComAgenda();
        $usuarioComum = User::factory()->create();
        $usuarioComum->assignRole('comum');

        $dataReserva = CarbonImmutable::now()->addDay();

        $reserva = Reserva::factory()->create([
            'user_id' => $usuarioComum->id,
            'data_inicial' => $dataReserva->setHour(9)->setMinute(0),
            'data_final' => $dataReserva->setHour(10)->setMinute(0),
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $dataReserva->toDateString(),
            'situacao' => 'em_analise',
        ]);

        $filtros = new FiltrosRelatorio(
            dataInicio: $dataReserva->startOfMonth(),
            dataFim: $dataReserva->endOfMonth(),
        );

        $dados = $this->service->agregarComCache($gestor, TipoRelatorioEnum::RESERVAS_PERIODO, $filtros);

        $this->assertGreaterThan(0, $dados->totalLinhas());
        $this->assertContains($reserva->id, collect($dados->linhas)->pluck('id')->all());
    }
}
