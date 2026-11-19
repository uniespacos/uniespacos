<?php

declare(strict_types=1);

namespace Tests\Unit\Rules;

use App\Rules\HorarioDisponivel;
use App\Services\ExpansaoHorariosService;
use Illuminate\Container\Container;
use Illuminate\Contracts\Container\Container as ContainerContract;
use Illuminate\Contracts\Foundation\Application as ApplicationContract;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Facade;
use Illuminate\Translation\ArrayLoader;
use Illuminate\Translation\PotentiallyTranslatedString;
use Illuminate\Translation\Translator;
use Mockery;
use PHPUnit\Framework\TestCase;

class HorarioDisponivelTest extends TestCase
{
    private ?ContainerContract $previousContainer = null;

    private ?ApplicationContract $previousFacadeApp = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->previousContainer = Container::getInstance();
        $this->previousFacadeApp = Facade::getFacadeApplication();

        $app = new Application;
        $app->instance(ExpansaoHorariosService::class, new ExpansaoHorariosService);
        Container::setInstance($app);
        Facade::clearResolvedInstances();
        Facade::setFacadeApplication($app);
    }

    protected function tearDown(): void
    {
        Facade::clearResolvedInstances();
        Facade::setFacadeApplication($this->previousFacadeApp);
        Container::setInstance($this->previousContainer);
        Mockery::close();

        parent::tearDown();
    }

    /**
     * @param  array<string, mixed>  $dados
     * @return array{datasConsultadas: list<mixed>, erros: list<string>}
     */
    private function executarRegra(array $dados, ?object $conflito, int $consultasEsperadas = 1, string $attribute = 'horarios_solicitados.0.agenda_id', mixed $value = 1): array
    {
        $queryBuilder = new class($conflito)
        {
            /** @var list<mixed> */
            public array $datasConsultadas = [];

            public function __construct(private ?object $primeiroConflito) {}

            /** @param array<int|string, mixed> $datas */
            public function whereIn(string $coluna, array $datas): self
            {
                if ($coluna === 'data') {
                    $this->datasConsultadas = array_values($datas);
                }

                return $this;
            }

            public function where(string $coluna, mixed $operador = null, mixed $valor = null): self
            {
                return $this;
            }

            public function orderBy(string $coluna, string $direcao = 'asc'): self
            {
                return $this;
            }

            /** @param list<string> $colunas */
            public function first(array $colunas = ['*']): ?object
            {
                return $this->primeiroConflito;
            }
        };

        $dbMock = Mockery::mock();
        $dbMock->shouldReceive('table')
            ->times($consultasEsperadas)
            ->with('horarios')
            ->andReturn($queryBuilder);
        DB::swap($dbMock);

        $rule = new HorarioDisponivel;
        $rule->setData($dados);

        $translator = new Translator(new ArrayLoader, 'pt_BR');
        $falhas = [];
        $fail = static function (string $mensagem) use (&$falhas, $translator): PotentiallyTranslatedString {
            $falha = new PotentiallyTranslatedString($mensagem, $translator);
            $falhas[] = $falha;

            return $falha;
        };

        $rule->validate($attribute, $value, $fail);

        return [
            'datasConsultadas' => $queryBuilder->datasConsultadas,
            'erros' => array_map(static fn (PotentiallyTranslatedString $falha): string => (string) $falha, $falhas),
        ];
    }

    private function conflito(string $data, string $inicio, string $fim): object
    {
        return (object) [
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
        ];
    }

    public function test_1mes_consulta_todas_as_semanas_ate_data_final_e_falha_quando_ha_conflito(): void
    {
        $dados = [
            'recorrencia' => '1mes',
            'data_final' => '2026-10-01',
            'horarios_solicitados' => [
                [
                    'agenda_id' => 1,
                    'data' => '2026-09-01',
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ];

        $resultado = $this->executarRegra($dados, $this->conflito('2026-09-08', '07:30:00', '09:00:00'));

        $this->assertSame(
            ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'],
            $resultado['datasConsultadas'],
        );
        $this->assertSame(['The time slot 10:00–11:00 on 08/09/2026 is already reserved.'], $resultado['erros']);
    }

    public function test_mensagem_de_conflito_cita_a_data_conflitante_e_nao_a_solicitada(): void
    {
        $dados = [
            'recorrencia' => '15dias',
            'data_final' => '2026-09-15',
            'horarios_solicitados' => [
                [
                    'agenda_id' => 1,
                    'data' => '2026-09-01',
                    'horario_inicio' => '14:00:00',
                    'horario_fim' => '16:00:00',
                ],
            ],
        ];

        $resultado = $this->executarRegra($dados, $this->conflito('2026-09-15', '14:30:00', '15:30:00'));

        $this->assertSame(['The time slot 14:00–16:00 on 15/09/2026 is already reserved.'], $resultado['erros']);
    }

    public function test_edit_scope_single_consulta_apenas_a_data_do_slot(): void
    {
        $dados = [
            'recorrencia' => '1mes',
            'edit_scope' => 'single',
            'data_final' => '2026-10-01',
            'horarios_solicitados' => [
                [
                    'agenda_id' => 1,
                    'data' => '2026-09-01',
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ];

        $resultado = $this->executarRegra($dados, null);

        $this->assertSame(['2026-09-01'], $resultado['datasConsultadas']);
        $this->assertSame([], $resultado['erros']);
    }

    public function test_edit_scope_single_sem_edited_week_date_valida_consulta_a_data_do_slot(): void
    {
        $dados = [
            'recorrencia' => '1mes',
            'edit_scope' => 'single',
            'edited_week_date' => 'nao-e-uma-data',
            'data_final' => '2026-10-01',
            'horarios_solicitados' => [
                [
                    'agenda_id' => 1,
                    'data' => '2026-09-01',
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ];

        $resultado = $this->executarRegra($dados, $this->conflito('2026-09-01', '09:00:00', '10:30:00'));

        $this->assertSame(['2026-09-01'], $resultado['datasConsultadas']);
        $this->assertSame(['The time slot 10:00–11:00 on 01/09/2026 is already reserved.'], $resultado['erros']);
    }

    public function test_edit_scope_single_consulta_slot_dentro_da_semana_editada(): void
    {
        $dados = [
            'recorrencia' => '1mes',
            'edit_scope' => 'single',
            'edited_week_date' => '2026-09-03',
            'data_final' => '2026-10-01',
            'horarios_solicitados' => [
                [
                    'agenda_id' => 1,
                    'data' => '2026-09-01',
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ];

        $resultado = $this->executarRegra($dados, $this->conflito('2026-09-01', '10:00:00', '11:00:00'));

        $this->assertSame(['2026-09-01'], $resultado['datasConsultadas']);
        $this->assertSame(['The time slot 10:00–11:00 on 01/09/2026 is already reserved.'], $resultado['erros']);
    }

    public function test_edit_scope_single_ignora_slot_fora_da_semana_editada_sem_consultar_banco(): void
    {
        $dados = [
            'recorrencia' => '1mes',
            'edit_scope' => 'single',
            'edited_week_date' => '2026-09-15',
            'data_final' => '2026-10-01',
            'horarios_solicitados' => [
                [
                    'agenda_id' => 1,
                    'data' => '2026-09-01',
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ];

        $resultado = $this->executarRegra($dados, $this->conflito('2026-09-01', '10:00:00', '11:00:00'), 0);

        $this->assertSame([], $resultado['datasConsultadas']);
        $this->assertSame([], $resultado['erros']);
    }

    public function test_recorrencia_com_selecao_explicita_em_semana_futura_limita_datas_do_primeiro_slot(): void
    {
        $dados = [
            'recorrencia' => '1mes',
            'data_final' => '2026-10-01',
            'horarios_solicitados' => [
                [
                    'agenda_id' => 1,
                    'data' => '2026-09-01',
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
                [
                    'agenda_id' => 1,
                    'data' => '2026-09-15',
                    'horario_inicio' => '14:00:00',
                    'horario_fim' => '15:00:00',
                ],
            ],
        ];

        $resultado = $this->executarRegra($dados, null);

        $this->assertSame(['2026-09-01', '2026-09-08'], $resultado['datasConsultadas']);
        $this->assertSame([], $resultado['erros']);
    }
}
