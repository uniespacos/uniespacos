<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Exceptions\ConflitoDeHorarioException;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\User;
use App\Repositories\HorarioRepositoryInterface;
use App\Services\CriacaoDeReservaService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Mockery\MockInterface;
use Tests\TestCase;

class CriacaoDeReservaServiceTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * @return array<string, mixed>
     */
    private function dados(string $titulo, Agenda $agenda, string $dataInicial, string $dataFinal, string $recorrencia, string $inicio = '10:00:00', string $fim = '11:00:00'): array
    {
        return [
            'titulo' => $titulo,
            'descricao' => 'Descricao de teste',
            'data_inicial' => $dataInicial,
            'data_final' => $dataFinal,
            'recorrencia' => $recorrencia,
            'horarios_solicitados' => [[
                'agenda_id' => $agenda->id,
                'data' => $dataInicial,
                'horario_inicio' => $inicio,
                'horario_fim' => $fim,
            ]],
        ];
    }

    public function test_grava_reserva_auto_aprovada_quando_o_solicitante_e_o_gestor(): void
    {
        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

        [$reserva] = app(CriacaoDeReservaService::class)->criar(
            $this->dados('Reserva do gestor', $agenda, '2027-03-01', '2027-03-01', 'unica'),
            $gestor,
        );

        $this->assertSame(SituacaoReservaEnum::DEFERIDA->value, $reserva->situacao);
        $this->assertCount(1, Horario::where('reserva_id', $reserva->id)->get());
    }

    public function test_conflito_sob_lock_lanca_excecao_de_dominio_e_nao_grava_nada(): void
    {
        $dono = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $dono->id]);
        app(CriacaoDeReservaService::class)->criar(
            $this->dados('Primeira', $agenda, '2027-03-01', '2027-03-01', 'unica'),
            $dono,
        );

        $outro = User::factory()->create();
        $dados = $this->dados('Segunda', $agenda, '2027-03-01', '2027-03-01', 'unica', '10:30:00', '11:30:00');

        try {
            app(CriacaoDeReservaService::class)->criar($dados, $outro);
            $this->fail('Era esperado ConflitoDeHorarioException.');
        } catch (ConflitoDeHorarioException $e) {
            $this->assertSame(
                'Conflito detectado sob lock para agenda '.$agenda->id.' em 2027-03-01. Outra reserva pode ter sido criada simultaneamente.',
                $e->getMessage(),
            );
        }

        $this->assertDatabaseMissing('reservas', ['titulo' => 'Segunda']);
        $this->assertCount(1, Horario::where('agenda_id', $agenda->id)->get());
    }

    public function test_horarios_encostados_nao_sao_conflito(): void
    {
        $dono = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $dono->id]);
        app(CriacaoDeReservaService::class)->criar(
            $this->dados('Manha', $agenda, '2027-03-01', '2027-03-01', 'unica', '09:00:00', '10:00:00'),
            $dono,
        );

        [$reserva] = app(CriacaoDeReservaService::class)->criar(
            $this->dados('Encostada', $agenda, '2027-03-01', '2027-03-01', 'unica', '10:00:00', '11:00:00'),
            $dono,
        );

        $this->assertCount(1, Horario::where('reserva_id', $reserva->id)->get());
    }

    public function test_erro_de_banco_na_checagem_de_conflito_e_relancado_e_desfaz_a_reserva(): void
    {
        $this->mock(HorarioRepositoryInterface::class, function (MockInterface $mock): void {
            $mock->shouldReceive('bloquearPeriodo')->once();
            $mock->shouldReceive('conflitosDeferidos')
                ->once()
                ->andThrow(new QueryException('pgsql', 'select 1', [], new \RuntimeException('conexao perdida')));
        });

        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $solicitante->id]);

        $this->expectException(QueryException::class);

        app(CriacaoDeReservaService::class)->criar(
            $this->dados('Transitoria', $agenda, '2027-03-01', '2027-03-01', 'unica'),
            $solicitante,
        );
    }

    public function test_numero_de_queries_de_horario_nao_cresce_com_a_recorrencia(): void
    {
        $contarQueriesDeHorarios = function (string $dataFinal): array {
            $solicitante = User::factory()->create();
            $agenda = Agenda::factory()->create(['user_id' => $solicitante->id]);

            DB::flushQueryLog();
            DB::enableQueryLog();
            [$reserva] = app(CriacaoDeReservaService::class)->criar(
                $this->dados('Recorrente '.$dataFinal, $agenda, '2027-03-01', $dataFinal, 'personalizado'),
                $solicitante,
            );
            $log = DB::getQueryLog();
            DB::disableQueryLog();

            $queries = array_values(array_filter(
                array_column($log, 'query'),
                fn (string $sql): bool => str_contains($sql, 'horarios'),
            ));

            return [count($queries), Horario::where('reserva_id', $reserva->id)->count()];
        };

        [$queriesCurta, $horariosCurta] = $contarQueriesDeHorarios('2027-03-15');
        [$queriesLonga, $horariosLonga] = $contarQueriesDeHorarios('2029-03-01');

        $this->assertSame(3, $horariosCurta);
        $this->assertGreaterThanOrEqual(100, $horariosLonga);
        $this->assertSame($queriesCurta, $queriesLonga);
    }
}
