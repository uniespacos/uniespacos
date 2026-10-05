<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\AvaliarReservaJob;
use App\Jobs\ValidateReservationConflictsJob;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Services\ConflictDetectionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class AvaliarReservaJobTest extends TestCase
{
    // use DatabaseTransactions; // Removed as it is now in TestCase

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_avaliar_reserva_job_handles_solicitado_status()
    {
        // Arrange
        $manager = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $manager->id]); // Manager owns agenda
        $reserva = Reserva::factory()->create(['user_id' => $manager->id]);

        $horario = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => now()->addDay()->toDateString(),
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [
                [
                    'id' => $horario->id,
                    'status' => 'solicitado', // This is the problematic status from frontend
                ],
            ],
            'observacao' => 'Test observation',
        ];

        $job = new AvaliarReservaJob($reserva, $validatedData, $manager);
        $conflictService = new ConflictDetectionService;

        // Act
        try {
            $job->handle($conflictService);
        } catch (\Exception $e) {
            $this->fail('Job failed with exception: '.$e->getMessage());
        }

        // Assert
        $this->assertDatabaseHas('horarios', [
            'id' => $horario->id,
            'situacao' => 'em_analise', // Correctly mapped from 'solicitado'
        ]);
    }

    public function test_reservation_status_aggregation_remains_em_analise_if_slots_pending()
    {
        // Arrange
        $manager = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $manager->id]);
        $reserva = Reserva::factory()->create(['situacao' => 'em_analise']);

        $horario1 = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => now()->addDay()->toDateString(),
        ]);

        $horario2 = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => now()->addDays(2)->toDateString(),
        ]);

        // Act: Approve only one slot
        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [
                [
                    'id' => $horario1->id,
                    'status' => 'deferida',
                ],
            ],
            'observacao' => 'Test observation',
        ];

        $job = new AvaliarReservaJob($reserva, $validatedData, $manager);
        $job->handle(new ConflictDetectionService);

        // Assert
        $reserva->refresh();
        // It should be 'em_analise' because $horario2 is still 'em_analise'
        // Before the fix, it would have been 'parcialmente_deferida'
        $this->assertEquals('em_analise', $reserva->situacao);
    }

    /**
     * Issue #265: the entry-layer guard. The job must refuse to process
     * an archived reservation at the entry point, throwing an exception.
     */
    public function test_evaluating_archived_reservation_throws_exception()
    {
        // Arrange
        $manager = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $manager->id]);
        $reserva = Reserva::factory()->create(['situacao' => 'inativa']);

        $horario = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'inativa',
            'data' => now()->addDay()->toDateString(),
        ]);

        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [
                [
                    'id' => $horario->id,
                    'status' => 'deferida',
                ],
            ],
            'observacao' => 'Test observation',
        ];

        // Act & Assert
        $job = new AvaliarReservaJob($reserva, $validatedData, $manager);
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot evaluate an archived reservation.');
        $job->handle(new ConflictDetectionService);
    }

    public function test_reservation_status_aggregation_becomes_parcialmente_deferida_when_all_assessed()
    {
        // Arrange
        $manager = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $manager->id]);
        $reserva = Reserva::factory()->create(['situacao' => 'em_analise']);

        $horario1 = Horario::factory()->create(['reserva_id' => $reserva->id, 'agenda_id' => $agenda->id, 'situacao' => 'em_analise']);
        $horario2 = Horario::factory()->create(['reserva_id' => $reserva->id, 'agenda_id' => $agenda->id, 'situacao' => 'em_analise']);

        // Act: Approve one, Reject another
        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => 'Rejection reason',
            'horarios_avaliados' => [
                [
                    'id' => $horario1->id,
                    'status' => 'deferida',
                ],
                [
                    'id' => $horario2->id,
                    'status' => 'indeferida',
                ],
            ],
            'observacao' => 'Test observation',
        ];

        $job = new AvaliarReservaJob($reserva, $validatedData, $manager);
        $job->handle(new ConflictDetectionService);

        // Assert
        $reserva->refresh();
        $this->assertEquals('parcialmente_deferida', $reserva->situacao);
    }

    public function test_gestor_can_evaluate_horario_from_own_agenda()
    {
        // Arrange: Gestor that manages agenda A
        $gestor = User::factory()->create();
        $agendaA = Agenda::factory()->create(['user_id' => $gestor->id]);
        $reserva = Reserva::factory()->create(['situacao' => 'em_analise']);

        $horario = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaA->id,
            'situacao' => 'em_analise',
            'data' => now()->addDay()->toDateString(),
        ]);

        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [
                [
                    'id' => $horario->id,
                    'status' => 'deferida',
                ],
            ],
            'observacao' => null,
        ];

        // Act
        $job = new AvaliarReservaJob($reserva, $validatedData, $gestor);
        $job->handle(new ConflictDetectionService);

        // Assert: Horario should be updated successfully
        $this->assertDatabaseHas('horarios', [
            'id' => $horario->id,
            'situacao' => 'deferida',
            'user_id' => $gestor->id,
        ]);
    }

    public function test_gestor_cannot_evaluate_horario_from_unmanaged_agenda()
    {
        // Arrange: Gestor A manages agenda A, Gestor B manages agenda B
        $gestorA = User::factory()->create();
        $gestorB = User::factory()->create();
        $agendaA = Agenda::factory()->create(['user_id' => $gestorA->id]);
        $agendaB = Agenda::factory()->create(['user_id' => $gestorB->id]);

        $reserva = Reserva::factory()->create(['situacao' => 'em_analise']);
        $horarioEmAgendaB = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaB->id,
            'situacao' => 'em_analise',
            'data' => now()->addDay()->toDateString(),
        ]);

        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [
                [
                    'id' => $horarioEmAgendaB->id,
                    'status' => 'deferida',
                ],
            ],
            'observacao' => null,
        ];

        // Act & Assert: Job should throw exception for unauthorized agenda
        $job = new AvaliarReservaJob($reserva, $validatedData, $gestorA);
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Authorization failed: one or more horarios do not belong to managed agendas.');
        $job->handle(new ConflictDetectionService);
    }

    public function test_gestor_cannot_evaluate_mixed_horarios_with_unmanaged_agenda()
    {
        // Arrange: Gestor A manages agenda A, but reservation includes horarios from both A and B
        $gestorA = User::factory()->create();
        $gestorB = User::factory()->create();
        $agendaA = Agenda::factory()->create(['user_id' => $gestorA->id]);
        $agendaB = Agenda::factory()->create(['user_id' => $gestorB->id]);

        $reserva = Reserva::factory()->create(['situacao' => 'em_analise']);
        $horarioEmAgendaA = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaA->id,
            'situacao' => 'em_analise',
        ]);
        $horarioEmAgendaB = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaB->id,
            'situacao' => 'em_analise',
        ]);

        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [
                [
                    'id' => $horarioEmAgendaA->id,
                    'status' => 'deferida',
                ],
                [
                    'id' => $horarioEmAgendaB->id,
                    'status' => 'deferida',
                ],
            ],
            'observacao' => null,
        ];

        // Act & Assert: Job should throw exception because one horario is from unmanaged agenda
        $job = new AvaliarReservaJob($reserva, $validatedData, $gestorA);
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Authorization failed: one or more horarios do not belong to managed agendas.');
        $job->handle(new ConflictDetectionService);
    }

    public function test_avaliar_reserva_triggers_conflict_revalidation_for_em_analise_reservas(): void
    {
        // Arrange: Preparar duas reservas que compartilham slot
        Bus::fake();

        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

        // Reserva A (será aprovada)
        $reservaA = Reserva::factory()->create(['situacao' => 'em_analise']);
        $horarioA = Horario::factory()->create([
            'reserva_id' => $reservaA->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => now()->addDay()->toDateString(),
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        // Reserva B (está em análise, compartilha slot com A)
        $reservaB = Reserva::factory()->create([
            'situacao' => 'em_analise',
            'validation_status' => 'completed',
        ]);
        $horarioB = Horario::factory()->create([
            'reserva_id' => $reservaB->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => $horarioA->data,
            'horario_inicio' => $horarioA->horario_inicio,
            'horario_fim' => $horarioA->horario_fim,
        ]);

        // Act: Avaliar e aprovar horário de A
        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [
                ['id' => $horarioA->id, 'status' => 'deferida'],
            ],
            'observacao' => null,
        ];

        $job = new AvaliarReservaJob($reservaA, $validatedData, $gestor);
        $job->handle(new ConflictDetectionService);

        // Assert: ValidateReservationConflictsJob deve ter sido despachado para B
        Bus::assertDispatched(ValidateReservationConflictsJob::class, function ($job) use ($reservaB) {
            return $job->reserva->id === $reservaB->id;
        });
    }

    public function test_avaliar_reserva_triggers_conflict_revalidation_for_parcialmente_deferida_reservas(): void
    {
        // Arrange: Reserva B está parcialmente deferida (alguns horários aprovados, outros pendentes)
        Bus::fake();

        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

        // Reserva A (será aprovada)
        $reservaA = Reserva::factory()->create(['situacao' => 'em_analise']);
        $horarioA = Horario::factory()->create([
            'reserva_id' => $reservaA->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => now()->addDay()->toDateString(),
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        // Reserva B (parcialmente deferida: um horário aprovado, outro em análise no mesmo slot de A)
        $reservaB = Reserva::factory()->create([
            'situacao' => 'parcialmente_deferida',
            'validation_status' => 'completed',
        ]);
        Horario::factory()->create([
            'reserva_id' => $reservaB->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'deferida',
            'data' => now()->addDay()->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '09:00:00',
        ]);
        Horario::factory()->create([
            'reserva_id' => $reservaB->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => $horarioA->data,
            'horario_inicio' => $horarioA->horario_inicio,
            'horario_fim' => $horarioA->horario_fim,
        ]);

        // Act
        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [['id' => $horarioA->id, 'status' => 'deferida']],
            'observacao' => null,
        ];

        $job = new AvaliarReservaJob($reservaA, $validatedData, $gestor);
        $job->handle(new ConflictDetectionService);

        // Assert: ValidateReservationConflictsJob deve ter sido despachado para B (que está parcialmente_deferida)
        Bus::assertDispatched(ValidateReservationConflictsJob::class, function ($job) use ($reservaB) {
            return $job->reserva->id === $reservaB->id;
        });
    }

    /**
     * B1 (E1-01): no escopo recurring, um conflito em horario de agenda de OUTRO gestor
     * nao pode ser indeferido pelo gestor que avalia (ConflictDetectionService e global).
     */
    public function test_recurring_nao_indefere_horario_de_agenda_de_outro_gestor_em_conflito(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');
        Bus::fake();

        $gestor = User::factory()->create();
        $outroGestor = User::factory()->create();
        $agendaDoGestor = Agenda::factory()->create(['user_id' => $gestor->id]);
        $agendaAlheia = Agenda::factory()->create(['user_id' => $outroGestor->id]);
        $dia = now()->addDay()->toDateString();

        $reserva = Reserva::factory()->create(['situacao' => 'em_analise']);
        $horarioProprio = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaDoGestor->id,
            'situacao' => 'em_analise',
            'data' => $dia,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);
        $horarioAlheio = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaAlheia->id,
            'situacao' => 'em_analise',
            'data' => $dia,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $outraReserva = Reserva::factory()->create(['situacao' => 'deferida']);
        Horario::factory()->create([
            'reserva_id' => $outraReserva->id,
            'agenda_id' => $agendaAlheia->id,
            'situacao' => 'deferida',
            'data' => $dia,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $job = new AvaliarReservaJob($reserva, [
            'evaluation_scope' => 'recurring',
            'motivo' => null,
            'horarios_avaliados' => [['id' => $horarioProprio->id, 'status' => 'deferida']],
            'observacao' => null,
        ], $gestor);
        $job->handle(new ConflictDetectionService);

        $this->assertDatabaseHas('horarios', [
            'id' => $horarioAlheio->id,
            'situacao' => 'em_analise',
            'user_id' => null,
            'justificativa' => null,
        ]);
        $this->assertDatabaseHas('horarios', [
            'id' => $horarioProprio->id,
            'situacao' => 'deferida',
            'user_id' => $gestor->id,
        ]);
    }

    public function test_recurring_indefere_conflitos_da_propria_agenda_do_gestor(): void
    {
        Carbon::setTestNow('2026-06-15 12:00:00');
        Bus::fake();

        $gestor = User::factory()->create();
        $outroGestor = User::factory()->create();
        $agendaDoGestor = Agenda::factory()->create(['user_id' => $gestor->id]);
        $agendaAlheia = Agenda::factory()->create(['user_id' => $outroGestor->id]);
        $dia = now()->addDay()->toDateString();

        $reserva = Reserva::factory()->create(['situacao' => 'em_analise']);
        $horarioEmConflito = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaDoGestor->id,
            'situacao' => 'em_analise',
            'data' => $dia,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);
        $horarioLivre = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaDoGestor->id,
            'situacao' => 'em_analise',
            'data' => $dia,
            'horario_inicio' => '14:00:00',
            'horario_fim' => '15:00:00',
        ]);
        $horarioAlheio = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaAlheia->id,
            'situacao' => 'em_analise',
            'data' => $dia,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $outraReserva = Reserva::factory()->create(['situacao' => 'deferida', 'titulo' => 'Reserva Concorrente']);
        Horario::factory()->create([
            'reserva_id' => $outraReserva->id,
            'agenda_id' => $agendaDoGestor->id,
            'situacao' => 'deferida',
            'data' => $dia,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $job = new AvaliarReservaJob($reserva, [
            'evaluation_scope' => 'recurring',
            'motivo' => null,
            'horarios_avaliados' => [['id' => $horarioLivre->id, 'status' => 'deferida']],
            'observacao' => null,
        ], $gestor);
        $job->handle(new ConflictDetectionService);

        $this->assertDatabaseHas('horarios', [
            'id' => $horarioEmConflito->id,
            'situacao' => 'indeferida',
            'user_id' => $gestor->id,
        ]);
        $this->assertStringContainsString(
            'Reserva Concorrente',
            (string) Horario::findOrFail($horarioEmConflito->id)->justificativa
        );
        $this->assertDatabaseHas('horarios', [
            'id' => $horarioLivre->id,
            'situacao' => 'deferida',
            'user_id' => $gestor->id,
        ]);
        $this->assertDatabaseHas('horarios', [
            'id' => $horarioAlheio->id,
            'situacao' => 'em_analise',
            'user_id' => null,
        ]);
    }
}
