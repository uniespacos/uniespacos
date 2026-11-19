<?php

declare(strict_types=1);

namespace Tests\Unit\Jobs;

use App\Events\ReservaEvent;
use App\Jobs\UpdateReservaJob;
use App\Jobs\ValidateReservationConflictsJob;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationUpdatedNotification;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UpdateReservaJobTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * @param  array<string, mixed>  $dados
     */
    private function executar(Reserva $reserva, array $dados, User $user): void
    {
        // Via container, como o worker faz: o handle() recebe o ExpansaoHorariosService.
        $job = new UpdateReservaJob($reserva, $dados, $user);
        app()->call([$job, 'handle']);
    }

    /**
     * @param  array<int, array<string, mixed>>  $slots
     * @return array<string, mixed>
     */
    private function dados(array $slots, string $recorrencia, string $dataInicial, string $dataFinal, string $scope = 'recurring', ?string $semanaEditada = null): array
    {
        return [
            'titulo' => 'Titulo atualizado',
            'descricao' => 'Descricao atualizada',
            'data_inicial' => $dataInicial,
            'data_final' => $dataFinal,
            'recorrencia' => $recorrencia,
            'edit_scope' => $scope,
            'edited_week_date' => $semanaEditada ?? $dataInicial,
            'horarios_solicitados' => $slots,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function slot(int $agendaId, string $data, string $inicio = '08:00:00', string $fim = '10:00:00'): array
    {
        return [
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'agenda_id' => $agendaId,
        ];
    }

    public function test_it_persists_changes_even_if_notification_fails(): void
    {
        $user = User::factory()->create();
        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'titulo' => 'Original Title',
        ]);

        $validatedData = [
            'titulo' => 'Updated Title',
            'descricao' => 'Updated Description',
            'data_inicial' => $reserva->data_inicial,
            'data_final' => $reserva->data_final,
            'recorrencia' => $reserva->recorrencia,
            'edit_scope' => 'single',
            'edited_week_date' => $reserva->data_inicial,
            'horarios_solicitados' => [],
        ];

        // Simulate notification failure
        Notification::shouldReceive('send')
            ->once()
            ->andThrow(new \Exception('Mail server error'));

        $this->executar($reserva, $validatedData, $user);

        $this->assertEquals('Updated Title', $reserva->fresh()->titulo);
    }

    public function test_escopo_recurring_substitui_sem_multiplicar_registros(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-28',
            'recorrencia' => '1mes',
        ]);

        foreach (range(0, 3) as $i) {
            Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
                'data' => Carbon::parse('2026-09-01')->addWeeks($i)->toDateString(),
                'horario_inicio' => '08:00:00',
                'horario_fim' => '10:00:00',
                'situacao' => 'em_analise',
            ]);
        }

        // A tela de edicao devolve todos os horarios existentes. A versao antiga
        // reexpandia cada um ate o fim e acumulava 4 + 3 + 2 + 1 = 15 registros.
        $slots = $reserva->horarios->map(fn ($h) => $this->slot(
            $h->agenda_id,
            Carbon::parse($h->data)->toDateString(),
            $h->horario_inicio,
            $h->horario_fim
        ))->all();

        $this->executar($reserva, $this->dados($slots, '1mes', '2026-09-01', '2026-09-28'), $user);

        $reserva->refresh();

        $this->assertCount(4, $reserva->horarios);
        $this->assertSame(
            ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'],
            $reserva->horarios->pluck('data')->map(fn ($d) => Carbon::parse($d)->toDateString())->sort()->values()->all()
        );
    }

    public function test_escopo_recurring_preserva_horarios_ja_avaliados(): void
    {
        Notification::fake();

        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $institucional = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-22',
            'recorrencia' => '1mes',
        ]);

        foreach (range(0, 3) as $i) {
            Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
                'data' => Carbon::parse('2026-09-01')->addWeeks($i)->toDateString(),
                'horario_inicio' => '08:00:00',
                'horario_fim' => '10:00:00',
                'situacao' => 'em_analise',
            ]);
        }

        // O gestor indefere a segunda ocorrencia.
        $reserva->horarios()->where('data', '2026-09-08')->update([
            'situacao' => 'indeferida',
            'justificativa' => 'Sala em manutencao',
            'user_id' => $gestor->id,
        ]);

        $slots = $reserva->fresh()->horarios->map(fn ($h) => $this->slot(
            $h->agenda_id,
            Carbon::parse($h->data)->toDateString(),
            $h->horario_inicio,
            $h->horario_fim
        ))->all();

        // Quem edita e o institucional, que passa direto pela ReservaPolicy.
        $this->executar($reserva, $this->dados($slots, '1mes', '2026-09-01', '2026-09-22'), $institucional);

        $avaliado = $reserva->fresh()->horarios->firstWhere(
            fn ($h) => Carbon::parse($h->data)->toDateString() === '2026-09-08'
        );

        $this->assertNotNull($avaliado);
        $this->assertSame('indeferida', $avaliado->situacao);
        $this->assertSame('Sala em manutencao', $avaliado->justificativa);
        $this->assertSame($gestor->id, $avaliado->user_id);

        $naoAvaliado = $reserva->fresh()->horarios->firstWhere(
            fn ($h) => Carbon::parse($h->data)->toDateString() === '2026-09-15'
        );
        $this->assertSame('em_analise', $naoAvaliado->situacao);
    }

    public function test_escopo_recurring_com_recorrencia_unica_nao_expande(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-03',
            'recorrencia' => 'unica',
        ]);

        $slots = [
            $this->slot($agenda->id, '2026-09-01'),
            $this->slot($agenda->id, '2026-09-03', '14:00:00', '16:00:00'),
        ];

        $this->executar($reserva, $this->dados($slots, 'unica', '2026-09-01', '2026-09-03'), $user);

        $reserva->refresh();

        $this->assertCount(2, $reserva->horarios);
        $this->assertSame(
            ['2026-09-01', '2026-09-03'],
            $reserva->horarios->pluck('data')->map(fn ($d) => Carbon::parse($d)->toDateString())->sort()->values()->all()
        );
    }

    public function test_reserva_do_proprio_gestor_volta_deferida_apos_edicao(): void
    {
        Notification::fake();

        $donoEGestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $donoEGestor->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $donoEGestor->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-01',
            'recorrencia' => 'unica',
        ]);

        $this->executar(
            $reserva,
            $this->dados([$this->slot($agenda->id, '2026-09-01')], 'unica', '2026-09-01', '2026-09-01'),
            $donoEGestor
        );

        $this->assertSame('deferida', $reserva->fresh()->horarios->first()->situacao);
    }

    public function test_single_scope_novo_horario_do_proprio_gestor_nasce_deferido(): void
    {
        Notification::fake();

        $donoEGestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $donoEGestor->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $donoEGestor->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-01',
            'recorrencia' => 'unica',
        ]);

        $slots = [
            $this->slot($agenda->id, '2026-09-01'),
        ];

        $this->executar(
            $reserva,
            $this->dados($slots, 'unica', '2026-09-01', '2026-09-01', 'single')
                + ['edited_week_date' => '2026-09-01'],
            $donoEGestor
        );

        $reserva->refresh();

        $this->assertCount(1, $reserva->horarios);
        $this->assertSame('deferida', $reserva->horarios->first()->situacao);
    }

    public function test_single_scope_preserves_period_for_other_weeks(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-28',
            'recorrencia' => '1mes',
        ]);

        foreach (range(0, 3) as $i) {
            Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
                'data' => Carbon::parse('2026-09-01')->addWeeks($i)->toDateString(),
                'horario_inicio' => '08:00:00',
                'horario_fim' => '10:00:00',
                'situacao' => 'em_analise',
            ]);
        }

        $weekOneHorario = $reserva->horarios->first();
        $this->assertNotNull($weekOneHorario);

        $slots = [
            $this->slot(
                $weekOneHorario->agenda_id,
                Carbon::parse($weekOneHorario->data)->toDateString(),
                $weekOneHorario->horario_inicio,
                $weekOneHorario->horario_fim
            ),
        ];

        $this->executar(
            $reserva,
            $this->dados(
                $slots,
                '1mes',
                '2026-09-01',
                '2026-09-28',
                'single'
            ) + ['edited_week_date' => '2026-09-05'],
            $user
        );

        $reserva->refresh();

        $this->assertSame('2026-09-01', Carbon::parse($reserva->data_inicial)->toDateString());
        $this->assertSame('2026-09-22', Carbon::parse($reserva->data_final)->toDateString());
        $this->assertCount(4, $reserva->horarios);
    }

    public function test_single_scope_recalculates_period_when_date_moves_outside_range(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => '2026-09-08',
            'data_final' => '2026-09-22',
            'recorrencia' => '1mes',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => '2026-09-08',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
            'situacao' => 'em_analise',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => '2026-09-15',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
            'situacao' => 'em_analise',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => '2026-09-22',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
            'situacao' => 'em_analise',
        ]);

        $slots = [
            $this->slot($agenda->id, '2026-08-25', '08:00:00', '10:00:00'),
        ];

        $this->executar(
            $reserva,
            $this->dados(
                $slots,
                '1mes',
                '2026-08-25',
                '2026-09-22',
                'single'
            ) + ['edited_week_date' => '2026-08-25'],
            $user
        );

        $reserva->refresh();

        $this->assertSame('2026-08-25', Carbon::parse($reserva->data_inicial)->toDateString());
        $this->assertSame('2026-09-22', Carbon::parse($reserva->data_final)->toDateString());
    }

    public function test_single_scope_fallback_when_no_horarios_remain(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-07',
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => '2026-09-03',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
            'situacao' => 'em_analise',
        ]);

        $this->executar(
            $reserva,
            $this->dados(
                [],
                'unica',
                '2026-09-01',
                '2026-09-07',
                'single'
            ) + ['edited_week_date' => '2026-09-05'],
            $user
        );

        $reserva->refresh();

        $this->assertSame('2026-09-01', Carbon::parse($reserva->data_inicial)->toDateString());
        $this->assertSame('2026-09-07', Carbon::parse($reserva->data_final)->toDateString());
    }

    public function test_dispatches_validate_reservation_conflicts_job_after_update_single_scope(): void
    {
        Bus::fake();
        Notification::fake();

        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-28',
            'recorrencia' => '1mes',
        ]);

        foreach (range(0, 3) as $i) {
            Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
                'data' => Carbon::parse('2026-09-01')->addWeeks($i)->toDateString(),
                'horario_inicio' => '08:00:00',
                'horario_fim' => '10:00:00',
                'situacao' => 'em_analise',
            ]);
        }

        $weekOneHorario = $reserva->horarios->first();
        $this->assertNotNull($weekOneHorario);

        $slots = [
            $this->slot(
                $weekOneHorario->agenda_id,
                Carbon::parse($weekOneHorario->data)->toDateString(),
                $weekOneHorario->horario_inicio,
                $weekOneHorario->horario_fim
            ),
        ];

        $this->executar(
            $reserva,
            $this->dados(
                $slots,
                '1mes',
                '2026-09-01',
                '2026-09-28',
                'single'
            ) + ['edited_week_date' => '2026-09-05'],
            $user
        );

        Bus::assertDispatched(ValidateReservationConflictsJob::class, fn ($job) => $job->reserva->id === $reserva->id);
    }

    public function test_dispatches_validate_reservation_conflicts_job_after_update_recurring_scope(): void
    {
        Bus::fake();
        Notification::fake();

        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-28',
            'recorrencia' => '1mes',
        ]);

        foreach (range(0, 3) as $i) {
            Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
                'data' => Carbon::parse('2026-09-01')->addWeeks($i)->toDateString(),
                'horario_inicio' => '08:00:00',
                'horario_fim' => '10:00:00',
                'situacao' => 'em_analise',
            ]);
        }

        $slots = $reserva->horarios->map(fn ($h) => $this->slot(
            $h->agenda_id,
            Carbon::parse($h->data)->toDateString(),
            $h->horario_inicio,
            $h->horario_fim
        ))->all();

        $this->executar($reserva, $this->dados($slots, '1mes', '2026-09-01', '2026-09-28'), $user);

        Bus::assertDispatched(ValidateReservationConflictsJob::class, fn ($job) => $job->reserva->id === $reserva->id);
    }

    public function test_dispatches_reserva_event_with_updated_action(): void
    {
        Event::fake();
        Notification::fake();

        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'titulo' => 'Original Title',
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-28',
            'recorrencia' => '1mes',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => '2026-09-01',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
            'situacao' => 'em_analise',
        ]);

        $slots = [
            $this->slot($agenda->id, '2026-09-01'),
        ];

        $this->executar($reserva, $this->dados($slots, '1mes', '2026-09-01', '2026-09-28'), $user);

        Event::assertDispatched(ReservaEvent::class, function ($event) use ($reserva) {
            return $event->action === 'updated' && $event->reservaId === $reserva->id;
        });
    }

    #[Test]
    public function it_notifies_reservation_owner_not_editor_on_update(): void
    {
        Notification::fake();

        $dono = User::factory()->create();
        $editor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $dono->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-01',
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => '2026-09-01',
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $slots = [
            $this->slot($agenda->id, '2026-09-01', '10:00:00', '11:00:00'),
        ];

        $this->executar($reserva, $this->dados($slots, 'unica', '2026-09-01', '2026-09-01'), $editor);

        Notification::assertSentTo($dono, ReservationUpdatedNotification::class);
        Notification::assertNotSentTo($editor, ReservationUpdatedNotification::class);
    }

    public function test_edicao_recurring_novo_horario_dono_gestor_grava_user_id(): void
    {
        Notification::fake();
        Carbon::setTestNow(Carbon::parse('2026-09-01 10:00:00'));

        try {
            $donoEGestor = User::factory()->create();
            $agenda = Agenda::factory()->create(['user_id' => $donoEGestor->id]);

            $reserva = Reserva::factory()->create([
                'user_id' => $donoEGestor->id,
                'data_inicial' => '2026-09-01',
                'data_final' => '2026-09-08',
                'recorrencia' => '1mes',
            ]);

            Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
                'data' => '2026-09-01',
                'horario_inicio' => '08:00:00',
                'horario_fim' => '10:00:00',
                'situacao' => 'deferida',
                'user_id' => $donoEGestor->id,
            ]);

            $slots = [
                $this->slot($agenda->id, '2026-09-01', '08:00:00', '10:00:00'),
                $this->slot($agenda->id, '2026-09-08', '14:00:00', '16:00:00'),
            ];

            $this->executar($reserva, $this->dados($slots, '1mes', '2026-09-01', '2026-09-08'), $donoEGestor);

            $reserva->refresh();

            $novo = $reserva->horarios->firstWhere('data', '2026-09-08');
            $this->assertNotNull($novo);
            $this->assertSame('deferida', $novo->situacao);
            $this->assertSame($donoEGestor->id, $novo->user_id);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_edicao_single_novo_horario_dono_gestor_grava_user_id(): void
    {
        Notification::fake();
        Carbon::setTestNow(Carbon::parse('2026-09-01 10:00:00'));

        try {
            $donoEGestor = User::factory()->create();
            $agenda = Agenda::factory()->create(['user_id' => $donoEGestor->id]);

            $reserva = Reserva::factory()->create([
                'user_id' => $donoEGestor->id,
                'data_inicial' => '2026-09-01',
                'data_final' => '2026-09-08',
                'recorrencia' => 'unica',
            ]);

            Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
                'data' => '2026-09-01',
                'horario_inicio' => '08:00:00',
                'horario_fim' => '10:00:00',
                'situacao' => 'deferida',
                'user_id' => $donoEGestor->id,
            ]);

            $slots = [
                $this->slot($agenda->id, '2026-09-01', '08:00:00', '10:00:00'),
                $this->slot($agenda->id, '2026-09-08', '14:00:00', '16:00:00'),
            ];

            $this->executar($reserva, $this->dados($slots, 'unica', '2026-09-01', '2026-09-08', 'single', '2026-09-08'), $donoEGestor);

            $reserva->refresh();

            $novo = $reserva->horarios->firstWhere('data', '2026-09-08');
            $this->assertNotNull($novo);
            $this->assertSame('deferida', $novo->situacao);
            $this->assertSame($donoEGestor->id, $novo->user_id);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_edicao_horario_preservado_mantém_user_id_anterior(): void
    {
        Notification::fake();
        Carbon::setTestNow(Carbon::parse('2026-09-01 10:00:00'));

        try {
            $dono = User::factory()->create();
            $gestor = User::factory()->create();
            $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

            $reserva = Reserva::factory()->create([
                'user_id' => $dono->id,
                'data_inicial' => '2026-09-01',
                'data_final' => '2026-09-08',
                'recorrencia' => 'unica',
            ]);

            $horarioAntigo = Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
                'data' => '2026-09-01',
                'horario_inicio' => '08:00:00',
                'horario_fim' => '10:00:00',
                'situacao' => 'indeferida',
                'justificativa' => 'Sala em manutencao',
                'user_id' => $gestor->id,
            ]);

            $slots = [
                ['id' => $horarioAntigo->id, ...array_merge(
                    $this->slot($agenda->id, '2026-09-01', '08:00:00', '10:00:00'),
                    ['id' => $horarioAntigo->id]
                )],
            ];

            $this->executar($reserva, $this->dados($slots, 'unica', '2026-09-01', '2026-09-01', 'single'), $dono);

            $horarioAntigo->refresh();

            $this->assertSame('indeferida', $horarioAntigo->situacao);
            $this->assertSame('Sala em manutencao', $horarioAntigo->justificativa);
            $this->assertSame($gestor->id, $horarioAntigo->user_id);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_edicao_gestor_editando_reserva_terceiro_novo_horario_nao_auto_aprova(): void
    {
        Notification::fake();
        Carbon::setTestNow(Carbon::parse('2026-09-01 10:00:00'));

        try {
            $dono = User::factory()->create();
            $gestor = User::factory()->create();
            $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

            $reserva = Reserva::factory()->create([
                'user_id' => $dono->id,
                'data_inicial' => '2026-09-01',
                'data_final' => '2026-09-08',
                'recorrencia' => 'unica',
            ]);

            Horario::factory()->create([
                'reserva_id' => $reserva->id,
                'agenda_id' => $agenda->id,
                'data' => '2026-09-01',
                'horario_inicio' => '08:00:00',
                'horario_fim' => '10:00:00',
                'situacao' => 'em_analise',
                'user_id' => null,
            ]);

            $slots = [
                $this->slot($agenda->id, '2026-09-01', '08:00:00', '10:00:00'),
                $this->slot($agenda->id, '2026-09-08', '14:00:00', '16:00:00'),
            ];

            $this->executar($reserva, $this->dados($slots, 'unica', '2026-09-01', '2026-09-08', 'single', '2026-09-08'), $gestor);

            $reserva->refresh();

            $novo = $reserva->horarios->firstWhere('data', '2026-09-08');
            $this->assertNotNull($novo);
            $this->assertSame('em_analise', $novo->situacao);
            $this->assertNull($novo->user_id);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_edicao_single_com_payload_do_front_altera_apenas_a_semana_editada(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-15',
            'recorrencia' => '15dias',
        ]);

        $t1 = $this->criarHorario($reserva, $agenda->id, '2026-09-01', '08:00:00', '10:00:00');
        $t2 = $this->criarHorario($reserva, $agenda->id, '2026-09-08', '08:00:00', '10:00:00');
        $t3 = $this->criarHorario($reserva, $agenda->id, '2026-09-15', '08:00:00', '10:00:00');

        // O front envia todas as semanas, sem id, e a edicao vale so para a semana de T2.
        $slots = [
            $this->slot($agenda->id, '2026-09-01', '08:00:00', '10:00:00'),
            $this->slot($agenda->id, '2026-09-08', '14:00:00', '16:00:00'),
            $this->slot($agenda->id, '2026-09-15', '08:00:00', '10:00:00'),
        ];

        $this->executar(
            $reserva,
            $this->dados($slots, '15dias', '2026-09-01', '2026-09-15', 'single', '2026-09-08'),
            $user
        );

        $reserva->refresh();

        $this->assertTrue(Horario::whereKey($t1->id)->exists());
        $this->assertTrue(Horario::whereKey($t3->id)->exists());
        $this->assertFalse(Horario::whereKey($t2->id)->exists());
        $this->assertTrue($reserva->horarios()
            ->where('data', '2026-09-08')
            ->where('horario_inicio', '14:00:00')
            ->where('horario_fim', '16:00:00')
            ->exists());
        $this->assertCount(3, $reserva->horarios);
        $this->assertSame('2026-09-01', Carbon::parse($reserva->data_inicial)->toDateString());
        $this->assertSame('2026-09-15', Carbon::parse($reserva->data_final)->toDateString());
    }

    public function test_edicao_single_preserva_situacao_e_avaliador_de_horario_mantido(): void
    {
        Notification::fake();

        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-08',
            'recorrencia' => '15dias',
        ]);

        $avaliado = $this->criarHorario($reserva, $agenda->id, '2026-09-01', '08:00:00', '10:00:00', [
            'situacao' => 'deferida',
            'justificativa' => 'Aprovado pela coordenacao',
            'user_id' => $gestor->id,
        ]);

        $slots = [
            $this->slot($agenda->id, '2026-09-01', '08:00:00', '10:00:00'),
            $this->slot($agenda->id, '2026-09-01', '14:00:00', '16:00:00'),
        ];

        $this->executar(
            $reserva,
            $this->dados($slots, '15dias', '2026-09-01', '2026-09-08', 'single', '2026-09-01'),
            $dono
        );

        $avaliado->refresh();
        $this->assertSame('deferida', $avaliado->situacao);
        $this->assertSame('Aprovado pela coordenacao', $avaliado->justificativa);
        $this->assertSame($gestor->id, $avaliado->user_id);

        $novo = $reserva->fresh()->horarios()->where('horario_inicio', '14:00:00')->first();
        $this->assertNotNull($novo);
        $this->assertSame('em_analise', $novo->situacao);
    }

    public function test_edicao_single_slots_de_outras_semanas_nao_criam_linhas(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-22',
            'recorrencia' => '15dias',
        ]);

        $horarios = [
            $this->criarHorario($reserva, $agenda->id, '2026-09-01', '08:00:00', '10:00:00'),
            $this->criarHorario($reserva, $agenda->id, '2026-09-08', '08:00:00', '10:00:00'),
            $this->criarHorario($reserva, $agenda->id, '2026-09-15', '08:00:00', '10:00:00'),
            $this->criarHorario($reserva, $agenda->id, '2026-09-22', '08:00:00', '10:00:00'),
        ];

        $slots = [
            $this->slot($agenda->id, '2026-09-01', '08:00:00', '10:00:00'),
            $this->slot($agenda->id, '2026-09-08', '08:00:00', '10:00:00'),
            $this->slot($agenda->id, '2026-09-15', '08:00:00', '10:00:00'),
            $this->slot($agenda->id, '2026-09-22', '08:00:00', '10:00:00'),
        ];

        $this->executar(
            $reserva,
            $this->dados($slots, '15dias', '2026-09-01', '2026-09-22', 'single', '2026-09-15'),
            $user
        );

        $reserva->refresh();

        $this->assertCount(4, $reserva->horarios);
        foreach ($horarios as $horario) {
            $this->assertTrue(Horario::whereKey($horario->id)->exists());
        }
    }

    private function criarHorario(Reserva $reserva, int $agendaId, string $data, string $inicio, string $fim, array $extra = []): Horario
    {
        return Horario::factory()->create(array_merge([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agendaId,
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'situacao' => 'em_analise',
        ], $extra));
    }

    public function test_payload_antigo_sem_dados_da_solicitacao_nao_apaga_publico_nem_categoria(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'publico_estimado' => 120,
            'categoria' => 'Palestra',
            'termo_aceito_em' => '2026-08-30 14:00:00',
        ]);

        $this->executar($reserva, [
            'titulo' => 'Titulo atualizado',
            'descricao' => 'Descricao atualizada',
            'data_inicial' => $reserva->data_inicial,
            'data_final' => $reserva->data_final,
            'recorrencia' => $reserva->recorrencia,
            'edit_scope' => 'single',
            'edited_week_date' => $reserva->data_inicial,
            'horarios_solicitados' => [],
        ], $user);

        $fresh = $reserva->fresh();
        $this->assertNotNull($fresh);
        $this->assertSame('Titulo atualizado', $fresh->titulo);
        $this->assertSame(120, $fresh->publico_estimado);
        $this->assertSame('Palestra', $fresh->categoria);
        $this->assertSame('2026-08-30 14:00:00', $fresh->termo_aceito_em?->toDateTimeString());
    }

    public function test_payload_com_dados_da_solicitacao_atualiza_publico_categoria_e_termo(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'publico_estimado' => 120,
            'categoria' => 'Palestra',
        ]);

        $this->executar($reserva, [
            'titulo' => 'Titulo atualizado',
            'descricao' => 'Descricao atualizada',
            'data_inicial' => $reserva->data_inicial,
            'data_final' => $reserva->data_final,
            'recorrencia' => $reserva->recorrencia,
            'edit_scope' => 'single',
            'edited_week_date' => $reserva->data_inicial,
            'horarios_solicitados' => [],
            'publico_estimado' => 50,
            'categoria' => 'Oficina',
            'termo_aceito_em' => '2026-11-19T13:00:00+00:00',
        ], $user);

        $fresh = $reserva->fresh();
        $this->assertNotNull($fresh);
        $this->assertSame(50, $fresh->publico_estimado);
        $this->assertSame('Oficina', $fresh->categoria);
        $this->assertSame('2026-11-19 13:00:00', $fresh->termo_aceito_em?->toDateTimeString());
    }

    public function test_payload_com_campos_da_solicitacao_nulos_limpa_publico_e_categoria(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'publico_estimado' => 120,
            'categoria' => 'Palestra',
        ]);

        $this->executar($reserva, [
            'titulo' => 'Titulo atualizado',
            'descricao' => 'Descricao atualizada',
            'data_inicial' => $reserva->data_inicial,
            'data_final' => $reserva->data_final,
            'recorrencia' => $reserva->recorrencia,
            'edit_scope' => 'single',
            'edited_week_date' => $reserva->data_inicial,
            'horarios_solicitados' => [],
            'publico_estimado' => null,
            'categoria' => null,
        ], $user);

        $fresh = $reserva->fresh();
        $this->assertNotNull($fresh);
        $this->assertNull($fresh->publico_estimado);
        $this->assertNull($fresh->categoria);
    }
}
