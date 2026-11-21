<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Exceptions\AutorizacaoDeJobException;
use App\Jobs\AvaliarReservaJob;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Repositories\HorarioRepositoryInterface;
use App\Services\AvaliacaoDeReservaService;
use App\Services\ReservaBroadcaster;
use Carbon\Carbon;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Mockery\MockInterface;
use PDOException;
use Tests\Concerns\CongelaRelogio;
use Tests\TestCase;

class AvaliacaoDeReservaServiceTest extends TestCase
{
    use CongelaRelogio;

    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }

    public function test_escopo_single_com_cinquenta_horarios_e_dois_grupos_faz_dois_updates_de_horarios(): void
    {
        Notification::fake();

        [$gestor, $reserva, $horarios] = $this->reservaComHorarios(50);

        $avaliacoes = [];
        foreach ($horarios as $indice => $horario) {
            $avaliacoes[] = ['id' => $horario->id, 'status' => $indice < 25 ? 'deferida' : 'indeferida'];
        }

        $updatesDeHorarios = [];
        DB::listen(function (QueryExecuted $query) use (&$updatesDeHorarios): void {
            if (str_starts_with(strtolower($query->sql), 'update "horarios"')) {
                $updatesDeHorarios[] = $query->sql;
            }
        });

        app(AvaliacaoDeReservaService::class)->avaliar($reserva, [
            'evaluation_scope' => 'single',
            'motivo' => 'Motivo do gestor',
            'horarios_avaliados' => $avaliacoes,
            'observacao' => null,
        ], $gestor, 'pt_BR');

        $this->assertCount(2, $updatesDeHorarios);
        $this->assertSame(25, Horario::where('reserva_id', $reserva->id)->where('situacao', 'deferida')->count());
        $this->assertSame(25, Horario::where('reserva_id', $reserva->id)->where('situacao', 'indeferida')->count());
    }

    public function test_autorizacao_negada_falha_o_job_sem_retry(): void
    {
        Notification::fake();

        $gestor = User::factory()->create();
        Agenda::factory()->create(['user_id' => $gestor->id]);
        $outroGestor = User::factory()->create();
        $agendaAlheia = Agenda::factory()->create(['user_id' => $outroGestor->id]);
        $reserva = Reserva::factory()->create(['situacao' => 'em_analise']);
        $horario = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaAlheia->id,
            'situacao' => 'em_analise',
            'data' => '2026-11-24',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '09:00:00',
        ]);

        $job = new AvaliarReservaJob($reserva, [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [['id' => $horario->id, 'status' => 'deferida']],
            'observacao' => null,
        ], $gestor);
        $job->withFakeQueueInteractions();

        $job->handle(app(AvaliacaoDeReservaService::class));

        $job->assertFailedWith(AutorizacaoDeJobException::class);
        $job->assertNotReleased();
        $this->assertSame('em_analise', $horario->fresh()->situacao);
    }

    public function test_query_exception_e_relancada_para_o_retry_da_fila(): void
    {
        Notification::fake();

        [$gestor, $reserva, $horarios] = $this->reservaComHorarios(1);

        $this->mock(HorarioRepositoryInterface::class, function (MockInterface $mock): void {
            $mock->shouldReceive('linhasDaReserva')->andReturn(collect());
            $mock->shouldReceive('conflitosDeferidos')->andReturn(collect());
            $mock->shouldReceive('atualizarDaReservaEmLote')->andThrow(new QueryException(
                'pgsql',
                'update "horarios" set "situacao" = ?',
                [],
                new PDOException('server closed the connection unexpectedly'),
            ));
        });

        $this->expectException(QueryException::class);

        app(AvaliacaoDeReservaService::class)->avaliar($reserva, [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [['id' => $horarios[0]->id, 'status' => 'deferida']],
            'observacao' => null,
        ], $gestor, 'pt_BR');
    }

    public function test_publica_evento_de_avaliacao_pelo_broadcaster_injetado_pelo_container(): void
    {
        Notification::fake();

        $broadcaster = new class extends ReservaBroadcaster
        {
            /** @var list<string> */
            public array $acoes = [];

            public function publicar(Reserva $reserva, string $acao): void
            {
                $this->acoes[] = $acao;
            }
        };
        app()->instance(ReservaBroadcaster::class, $broadcaster);

        [$gestor, $reserva, $horarios] = $this->reservaComHorarios(1);

        app(AvaliacaoDeReservaService::class)->avaliar($reserva, [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [['id' => $horarios[0]->id, 'status' => 'deferida']],
            'observacao' => null,
        ], $gestor, 'pt_BR');

        $this->assertSame(['evaluated'], $broadcaster->acoes);
    }

    /**
     * @return array{0: User, 1: Reserva, 2: list<Horario>}
     */
    private function reservaComHorarios(int $quantidade): array
    {
        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);
        $reserva = Reserva::factory()->create(['situacao' => 'em_analise']);
        $inicio = Carbon::parse('2026-11-24');

        $horarios = [];
        for ($i = 0; $i < $quantidade; $i++) {
            $horarios[] = Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
                'situacao' => 'em_analise',
                'data' => $inicio->copy()->addDays($i)->toDateString(),
                'horario_inicio' => '08:00:00',
                'horario_fim' => '09:00:00',
            ]);
        }

        return [$gestor, $reserva, $horarios];
    }
}
