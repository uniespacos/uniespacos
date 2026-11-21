<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Exceptions\ConflitoDeHorarioException;
use App\Jobs\ProcessarCriacaoReserva;
use App\Models\Agenda;
use App\Models\User;
use App\Notifications\ReservationCreatedNotification;
use App\Notifications\ReservationFailedNotification;
use App\Repositories\HorarioRepositoryInterface;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Mockery\MockInterface;
use Tests\TestCase;

class ProcessarCriacaoReservaFalhaTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    /**
     * @return array<string, mixed>
     */
    private function dados(string $titulo, Agenda $agenda): array
    {
        return [
            'titulo' => $titulo,
            'descricao' => 'Descricao de teste',
            'data_inicial' => '2027-03-01',
            'data_final' => '2027-03-01',
            'recorrencia' => 'unica',
            'horarios_solicitados' => [[
                'agenda_id' => $agenda->id,
                'data' => '2027-03-01',
                'horario_inicio' => '10:00:00',
                'horario_fim' => '11:00:00',
            ]],
        ];
    }

    private function reservaDoDonoOcupaOHorario(): Agenda
    {
        $dono = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $dono->id]);
        ProcessarCriacaoReserva::dispatch($this->dados('Ocupa o horario', $agenda), $dono);

        return $agenda;
    }

    public function test_criacao_nao_e_reexecutada(): void
    {
        $job = new ProcessarCriacaoReserva($this->dados('Sem retry', Agenda::factory()->create()), User::factory()->create());

        $this->assertSame(1, $job->tries);
    }

    public function test_conflito_sob_lock_falha_uma_vez_sem_gravar_nem_criar_notificacao_de_sucesso(): void
    {
        $agenda = $this->reservaDoDonoOcupaOHorario();
        $solicitante = User::factory()->create();

        $job = new ProcessarCriacaoReserva($this->dados('Conflitante', $agenda), $solicitante);
        $job->withFakeQueueInteractions();

        app()->call([$job, 'handle']);

        $job->assertFailedWith(ConflitoDeHorarioException::class);
        $this->assertDatabaseMissing('reservas', ['titulo' => 'Conflitante']);
        Notification::assertNotSentTo($solicitante, ReservationCreatedNotification::class);
        Notification::assertNotSentTo($solicitante, ReservationFailedNotification::class);
    }

    public function test_conflito_sob_lock_notifica_o_solicitante_exatamente_uma_vez(): void
    {
        $agenda = $this->reservaDoDonoOcupaOHorario();
        $solicitante = User::factory()->create();

        ProcessarCriacaoReserva::dispatch($this->dados('Conflitante', $agenda), $solicitante);

        Notification::assertSentToTimes($solicitante, ReservationFailedNotification::class, 1);
        Notification::assertNotSentTo($solicitante, ReservationCreatedNotification::class);
    }

    public function test_erro_transitorio_e_relancado_sem_fail_manual(): void
    {
        $this->mock(HorarioRepositoryInterface::class, function (MockInterface $mock): void {
            $mock->shouldReceive('bloquearPeriodo');
            $mock->shouldReceive('conflitosDeferidos')
                ->andThrow(new QueryException('pgsql', 'select 1', [], new \RuntimeException('conexao perdida')));
        });

        $solicitante = User::factory()->create();
        $job = new ProcessarCriacaoReserva($this->dados('Transitoria', Agenda::factory()->create(['user_id' => $solicitante->id])), $solicitante);
        $job->withFakeQueueInteractions();

        $excecao = null;
        try {
            app()->call([$job, 'handle']);
        } catch (QueryException $e) {
            $excecao = $e;
        }

        $this->assertInstanceOf(QueryException::class, $excecao);
        $job->assertNotFailed();
        $this->assertDatabaseMissing('reservas', ['titulo' => 'Transitoria']);
    }

    public function test_erro_transitorio_vai_para_failed_uma_vez_e_notifica_uma_vez(): void
    {
        $this->mock(HorarioRepositoryInterface::class, function (MockInterface $mock): void {
            $mock->shouldReceive('bloquearPeriodo');
            $mock->shouldReceive('conflitosDeferidos')
                ->andThrow(new QueryException('pgsql', 'select 1', [], new \RuntimeException('conexao perdida')));
        });

        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $solicitante->id]);

        $excecao = null;
        try {
            ProcessarCriacaoReserva::dispatch($this->dados('Transitoria', $agenda), $solicitante);
        } catch (QueryException $e) {
            $excecao = $e;
        }

        $this->assertInstanceOf(QueryException::class, $excecao);
        Notification::assertSentToTimes($solicitante, ReservationFailedNotification::class, 1);
    }
}
