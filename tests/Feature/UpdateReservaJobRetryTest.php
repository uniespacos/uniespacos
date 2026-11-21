<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Jobs\UpdateReservaJob;
use App\Models\Agenda;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationUpdatedNotification;
use App\Notifications\ReservationUpdateFailedNotification;
use App\Repositories\HorarioRepositoryInterface;
use App\Services\EdicaoDeReservaService;
use Illuminate\Database\DeadlockException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Mockery\MockInterface;
use PDOException;
use Tests\Concerns\CongelaRelogio;
use Tests\TestCase;
use Throwable;

/**
 * @phpstan-import-type DadosEdicao from EdicaoDeReservaService
 */
class UpdateReservaJobRetryTest extends TestCase
{
    use CongelaRelogio;
    use DatabaseTransactions;

    private const DATA = '2026-11-23';

    public function test_erro_de_dominio_falha_na_primeira_tentativa(): void
    {
        Notification::fake();
        ['reserva' => $reserva, 'solicitante' => $solicitante, 'dados' => $dados] = $this->cenarioComConflito();

        $job = new UpdateReservaJob($reserva, $dados, $solicitante);
        $job->withFakeQueueInteractions();

        app()->call([$job, 'handle']);

        $this->assertSame(3, $job->tries);
        $job->assertFailed();
    }

    public function test_query_exception_e_relancada_sem_falhar_o_job(): void
    {
        $erro = new QueryException('pgsql', 'select * from horarios for update', [], new PDOException('SQLSTATE[08006] conexao perdida'));

        $this->expectException(QueryException::class);
        $this->executarComBloqueioQueFalha($erro);
    }

    public function test_deadlock_e_relancado_sem_falhar_o_job(): void
    {
        $this->expectException(DeadlockException::class);
        $this->executarComBloqueioQueFalha(new DeadlockException('deadlock detected', 40001));
    }

    public function test_notificacao_de_falha_sai_uma_unica_vez_quando_o_job_falha_definitivamente(): void
    {
        Notification::fake();
        ['reserva' => $reserva, 'solicitante' => $solicitante, 'dados' => $dados] = $this->cenarioComConflito();

        UpdateReservaJob::dispatch($reserva, $dados, $solicitante);

        Notification::assertSentToTimes($solicitante, ReservationUpdateFailedNotification::class, 1);
        Notification::assertNotSentTo($solicitante, ReservationUpdatedNotification::class);
    }

    public function test_falha_transitoria_esgotada_notifica_a_falha_uma_vez(): void
    {
        Notification::fake();
        ['reserva' => $reserva, 'solicitante' => $solicitante, 'dados' => $dados] = $this->cenarioComConflito();

        $job = new UpdateReservaJob($reserva, $dados, $solicitante);
        $job->failed(new QueryException('pgsql', 'update horarios', [], new PDOException('SQLSTATE[08006] conexao perdida')));

        Notification::assertSentToTimes($solicitante, ReservationUpdateFailedNotification::class, 1);
    }

    private function executarComBloqueioQueFalha(Throwable $erro): void
    {
        ['reserva' => $reserva, 'solicitante' => $solicitante, 'dados' => $dados] = $this->cenarioComConflito();

        $this->mock(HorarioRepositoryInterface::class, function (MockInterface $mock) use ($erro): void {
            $mock->shouldReceive('bloquearPeriodo')->andThrow($erro);
        });

        $job = new UpdateReservaJob($reserva, $dados, $solicitante);
        $job->withFakeQueueInteractions();

        try {
            app()->call([$job, 'handle']);
        } finally {
            $job->assertNotFailed();
        }
    }

    /**
     * @return array{reserva: Reserva, solicitante: User, dados: DadosEdicao}
     */
    private function cenarioComConflito(): array
    {
        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

        $outraReserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
        ]);
        $outraReserva->horarios()->create([
            'agenda_id' => $agenda->id,
            'data' => self::DATA,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
            'situacao' => SituacaoReservaEnum::DEFERIDA->value,
            'user_id' => $gestor->id,
        ]);

        $solicitante = User::factory()->create();
        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'recorrencia' => 'unica',
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
        ]);

        return [
            'reserva' => $reserva,
            'solicitante' => $solicitante,
            'dados' => [
                'titulo' => 'Editada',
                'descricao' => 'Descricao',
                'data_inicial' => self::DATA,
                'data_final' => self::DATA,
                'recorrencia' => 'unica',
                'edit_scope' => 'recurring',
                'edited_week_date' => self::DATA,
                'horarios_solicitados' => [[
                    'agenda_id' => $agenda->id,
                    'data' => self::DATA,
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ]],
            ],
        ];
    }
}
