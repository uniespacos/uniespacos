<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\ProcessarCriacaoReserva;
use App\Jobs\ValidateReservationConflictsJob;
use App\Models\Agenda;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationCreatedNotification;
use App\Notifications\ReservationFailedNotification;
use App\Services\ReservaBroadcaster;
use Illuminate\Bus\Dispatcher;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class ProcessarCriacaoReservaPosCommitTest extends TestCase
{
    use DatabaseTransactions;

    private const TITULO = 'Falha pos commit';

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    /**
     * @return array<string, mixed>
     */
    private function dados(Agenda $agenda): array
    {
        return [
            'titulo' => self::TITULO,
            'descricao' => 'Descricao de teste',
            'data_inicial' => '2027-05-03',
            'data_final' => '2027-05-03',
            'recorrencia' => 'unica',
            'horarios_solicitados' => [[
                'agenda_id' => $agenda->id,
                'data' => '2027-05-03',
                'horario_inicio' => '10:00:00',
                'horario_fim' => '11:00:00',
            ]],
        ];
    }

    private function agendaDeOutroGestor(): Agenda
    {
        return Agenda::factory()->create(['user_id' => User::factory()->create()->id]);
    }

    public function test_falha_ao_despachar_validacao_de_conflitos_nao_marca_o_job_como_falho(): void
    {
        $despachante = new class(app()) extends Dispatcher
        {
            public function dispatch($command)
            {
                if ($command instanceof ValidateReservationConflictsJob) {
                    throw new RuntimeException('fila indisponivel');
                }

                return parent::dispatch($command);
            }
        };
        app()->instance(Dispatcher::class, $despachante);
        Log::spy();

        $solicitante = User::factory()->create();
        $job = new ProcessarCriacaoReserva($this->dados($this->agendaDeOutroGestor()), $solicitante);
        $job->withFakeQueueInteractions();

        app()->call([$job, 'handle']);

        $job->assertNotFailed();
        $this->assertDatabaseHas('reservas', ['titulo' => self::TITULO, 'user_id' => $solicitante->id]);
        Notification::assertNotSentTo($solicitante, ReservationFailedNotification::class);
        Notification::assertSentTo($solicitante, ReservationCreatedNotification::class);
        Log::shouldHaveReceived('warning')
            ->with(Mockery::on(fn (string $mensagem): bool => str_contains($mensagem, 'pós-commit')), Mockery::any())
            ->once();
    }

    public function test_falha_ao_publicar_broadcast_apos_o_commit_nao_marca_o_job_como_falho(): void
    {
        $broadcaster = new class extends ReservaBroadcaster
        {
            public function publicar(Reserva $reserva, string $acao): void
            {
                if ($acao === 'created') {
                    throw new RuntimeException('reverb indisponivel');
                }
            }
        };
        app()->instance(ReservaBroadcaster::class, $broadcaster);
        Log::spy();

        $solicitante = User::factory()->create();
        $job = new ProcessarCriacaoReserva($this->dados($this->agendaDeOutroGestor()), $solicitante);
        $job->withFakeQueueInteractions();

        app()->call([$job, 'handle']);

        $job->assertNotFailed();
        $this->assertDatabaseHas('reservas', ['titulo' => self::TITULO, 'user_id' => $solicitante->id]);
        Notification::assertNotSentTo($solicitante, ReservationFailedNotification::class);
        Log::shouldHaveReceived('warning')
            ->with(Mockery::on(fn (string $mensagem): bool => str_contains($mensagem, 'broadcast')), Mockery::any())
            ->once();
    }
}
