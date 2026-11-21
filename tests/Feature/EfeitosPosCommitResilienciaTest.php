<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Events\ReservaAlterada;
use App\Events\ReservaEvent;
use App\Jobs\AvaliarReservaJob;
use App\Jobs\UpdateReservaJob;
use App\Jobs\ValidateReservationConflictsJob;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationEvaluatedNotification;
use App\Notifications\ReservationUpdatedNotification;
use App\Services\ReservaBroadcaster;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\Concerns\CongelaRelogio;
use Tests\Support\FilaQueFalhaConnector;
use Tests\TestCase;

/**
 * Efeitos pós-commit (broadcast, cache de relatórios, notificações, revalidação)
 * não podem derrubar o job: uma falha aqui faria o worker retentar a mutação já commitada.
 */
class EfeitosPosCommitResilienciaTest extends TestCase
{
    use CongelaRelogio;

    private const DATA = '2026-11-23';

    #[Test]
    public function listener_de_reserva_alterada_que_falha_nao_impede_o_reserva_event(): void
    {
        Log::spy();

        Event::listen(ReservaAlterada::class, function (): void {
            throw new RuntimeException('Cache de relatórios indisponível');
        });

        $eventosDeReserva = [];
        Event::listen(ReservaEvent::class, function (ReservaEvent $evento) use (&$eventosDeReserva): void {
            $eventosDeReserva[] = $evento;
        });

        $reserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        app(ReservaBroadcaster::class)->publicar($reserva, 'updated');

        $this->assertCount(1, $eventosDeReserva);
        $this->assertSame('updated', $eventosDeReserva[0]->action);
        $this->assertSame($reserva->id, $eventosDeReserva[0]->reservaId);

        Log::shouldHaveReceived('warning')->with(
            'Falha ao invalidar cache de relatórios após alteração de reserva',
            [
                'reserva_id' => $reserva->id,
                'acao' => 'updated',
                'exception_class' => RuntimeException::class,
            ],
        );
    }

    #[Test]
    public function avaliacao_com_falha_no_broadcast_nao_falha_nem_libera_o_job(): void
    {
        Notification::fake();
        Queue::fake([ValidateReservationConflictsJob::class]);

        $this->mock(ReservaBroadcaster::class, function (MockInterface $mock): void {
            $mock->shouldReceive('publicar')
                ->once()
                ->andThrow(new RuntimeException('Pusher indisponível'));
        });

        $gestor = User::factory()->create();
        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'situacao' => 'em_analise',
        ]);
        $horario = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => self::DATA,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [['id' => $horario->id, 'status' => 'deferida']],
            'observacao' => 'Aprovada',
        ];

        $job = new AvaliarReservaJob($reserva, $validatedData, $gestor);
        $job->withFakeQueueInteractions();

        app()->call([$job, 'handle']);

        $job->assertNotFailed();
        $job->assertNotReleased();
        $this->assertSame('deferida', $horario->fresh()->situacao);
        Notification::assertSentTo($solicitante, ReservationEvaluatedNotification::class);
    }

    #[Test]
    public function edicao_com_falha_no_dispatch_da_validacao_ainda_publica_o_broadcast(): void
    {
        Notification::fake();

        Queue::extend('fila_que_falha', fn () => new FilaQueFalhaConnector);
        config([
            'queue.default' => 'fila_que_falha',
            'queue.connections.fila_que_falha' => ['driver' => 'fila_que_falha'],
        ]);

        Log::spy();

        $eventosDeReserva = [];
        Event::listen(ReservaEvent::class, function (ReservaEvent $evento) use (&$eventosDeReserva): void {
            $eventosDeReserva[] = $evento;
        });

        $dono = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);
        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'titulo' => 'Titulo original',
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
            'recorrencia' => 'unica',
        ]);

        $dados = [
            'titulo' => 'Titulo atualizado',
            'descricao' => 'Descricao atualizada',
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
            'recorrencia' => 'unica',
            'edit_scope' => 'recurring',
            'edited_week_date' => self::DATA,
            'horarios_solicitados' => [[
                'data' => self::DATA,
                'horario_inicio' => '08:00:00',
                'horario_fim' => '10:00:00',
                'agenda_id' => $agenda->id,
            ]],
        ];

        $job = new UpdateReservaJob($reserva, $dados, $dono);
        $job->withFakeQueueInteractions();

        app()->call([$job, 'handle']);

        $job->assertNotFailed();
        $this->assertSame('Titulo atualizado', $reserva->fresh()->titulo);
        Notification::assertSentTo($dono, ReservationUpdatedNotification::class);

        $this->assertCount(1, $eventosDeReserva);
        $this->assertSame('updated', $eventosDeReserva[0]->action);
        $this->assertSame($reserva->id, $eventosDeReserva[0]->reservaId);

        Log::shouldHaveReceived('warning')->with(
            'Falha em efeito pós-commit da edição de reserva: validação de conflitos não despachada',
            Mockery::on(fn (array $contexto): bool => $contexto['reserva_id'] === $reserva->id),
        );
    }
}
