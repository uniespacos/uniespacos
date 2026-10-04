<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReservaValidationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Meio-dia de um dia no meio do mês: `today()`, `now()` e a regra
        // `after_or_equal:today` não variam com a hora/data de execução da suíte
        // (virada de dia em UTC vs. America/Bahia, último dia do mês).
        $this->travelTo(CarbonImmutable::parse('2026-06-15 12:00:00'));
    }

    public function test_horarios_mesmo_espaco_validation_passes_with_single_espaco(): void
    {
        $usuario = User::factory()->create();

        $espaco = Espaco::factory()->create();
        $agenda1 = Agenda::factory()->create(['espaco_id' => $espaco->id]);
        $agenda2 = Agenda::factory()->create(['espaco_id' => $espaco->id]);

        $hoje = now()->toDateString();

        $response = $this->actingAs($usuario)->post(route('reservas.store'), [
            'titulo' => 'Reserva Válida',
            'descricao' => 'Múltiplos horários no mesmo espaço',
            'data_inicial' => $hoje,
            'data_final' => $hoje,
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'data' => $hoje,
                    'horario_inicio' => '08:00:00',
                    'horario_fim' => '10:00:00',
                    'agenda_id' => $agenda1->id,
                ],
                [
                    'data' => $hoje,
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '12:00:00',
                    'agenda_id' => $agenda2->id,
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();
    }

    public function test_horarios_mesmo_espaco_validation_fails_with_multiple_espacos(): void
    {
        $usuario = User::factory()->create();

        $espaco1 = Espaco::factory()->create();
        $espaco2 = Espaco::factory()->create();
        $agenda1 = Agenda::factory()->create(['espaco_id' => $espaco1->id]);
        $agenda2 = Agenda::factory()->create(['espaco_id' => $espaco2->id]);

        $hoje = now()->toDateString();

        $response = $this->actingAs($usuario)->post(route('reservas.store'), [
            'titulo' => 'Reserva Inválida',
            'descricao' => 'Múltiplos espaços',
            'data_inicial' => $hoje,
            'data_final' => $hoje,
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'data' => $hoje,
                    'horario_inicio' => '08:00:00',
                    'horario_fim' => '10:00:00',
                    'agenda_id' => $agenda1->id,
                ],
                [
                    'data' => $hoje,
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '12:00:00',
                    'agenda_id' => $agenda2->id,
                ],
            ],
        ]);

        $response->assertSessionHasErrors('horarios_solicitados');
        $response->assertSessionHasErrors();
    }

    public function test_horarios_mesmo_espaco_validation_passes_on_update_with_single_espaco(): void
    {
        $usuario = User::factory()->create();

        $espaco = Espaco::factory()->create();
        $agenda1 = Agenda::factory()->create(['espaco_id' => $espaco->id]);
        $agenda2 = Agenda::factory()->create(['espaco_id' => $espaco->id]);

        $reserva = $usuario->reservas()->create([
            'titulo' => 'Reserva Existente',
            'descricao' => 'Para editar',
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
            'situacao' => 'em_analise',
        ]);

        $hoje = now()->toDateString();

        $response = $this->actingAs($usuario)->put(route('reservas.update', $reserva->id), [
            'titulo' => 'Reserva Editada',
            'descricao' => 'Múltiplos horários no mesmo espaço',
            'data_inicial' => $hoje,
            'data_final' => $hoje,
            'recorrencia' => 'unica',
            'edit_scope' => 'recurring',
            'edited_week_date' => null,
            'horarios_solicitados' => [
                [
                    'data' => $hoje,
                    'horario_inicio' => '08:00:00',
                    'horario_fim' => '10:00:00',
                    'agenda_id' => $agenda1->id,
                ],
                [
                    'data' => $hoje,
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '12:00:00',
                    'agenda_id' => $agenda2->id,
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
    }

    public function test_horarios_mesmo_espaco_validation_fails_on_update_with_multiple_espacos(): void
    {
        $usuario = User::factory()->create();

        $espaco1 = Espaco::factory()->create();
        $espaco2 = Espaco::factory()->create();
        $agenda1 = Agenda::factory()->create(['espaco_id' => $espaco1->id]);
        $agenda2 = Agenda::factory()->create(['espaco_id' => $espaco2->id]);

        $reserva = $usuario->reservas()->create([
            'titulo' => 'Reserva Existente',
            'descricao' => 'Para editar',
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
            'situacao' => 'em_analise',
        ]);

        $hoje = now()->toDateString();

        $response = $this->actingAs($usuario)->put(route('reservas.update', $reserva->id), [
            'titulo' => 'Reserva Editada',
            'descricao' => 'Múltiplos espaços',
            'data_inicial' => $hoje,
            'data_final' => $hoje,
            'recorrencia' => 'unica',
            'edit_scope' => 'recurring',
            'edited_week_date' => null,
            'horarios_solicitados' => [
                [
                    'data' => $hoje,
                    'horario_inicio' => '08:00:00',
                    'horario_fim' => '10:00:00',
                    'agenda_id' => $agenda1->id,
                ],
                [
                    'data' => $hoje,
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '12:00:00',
                    'agenda_id' => $agenda2->id,
                ],
            ],
        ]);

        $response->assertSessionHasErrors('horarios_solicitados');
    }

    #[Test]
    public function test_partial_overlap_is_rejected(): void
    {
        $usuario = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $data = now()->addDays(1)->toDateString();

        // Existe horário 10:00-12:00 deferido
        Horario::create([
            'reserva_id' => Reserva::factory()->create()->id,
            'agenda_id' => $agenda->id,
            'data' => $data,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '12:00:00',
            'situacao' => SituacaoReservaEnum::DEFERIDA->value,
        ]);

        // Tentar reservar 10:30-11:30 (sobrepõe parcialmente)
        $response = $this->actingAs($usuario)->post(route('reservas.store'), [
            'titulo' => 'Reserva Overlap',
            'descricao' => 'Testa overlap parcial',
            'data_inicial' => $data,
            'data_final' => $data,
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'data' => $data,
                    'horario_inicio' => '10:30:00',
                    'horario_fim' => '11:30:00',
                    'agenda_id' => $agenda->id,
                ],
            ],
        ]);

        $response->assertSessionHasErrors('horarios_solicitados.0.agenda_id');
    }

    #[Test]
    public function test_enveloping_overlap_is_rejected(): void
    {
        $usuario = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $data = now()->addDays(1)->toDateString();

        // Existe horário 10:00-11:00 deferido
        Horario::create([
            'reserva_id' => Reserva::factory()->create()->id,
            'agenda_id' => $agenda->id,
            'data' => $data,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
            'situacao' => SituacaoReservaEnum::DEFERIDA->value,
        ]);

        // Tentar reservar 09:00-12:00 (envelopa o horário existente)
        $response = $this->actingAs($usuario)->post(route('reservas.store'), [
            'titulo' => 'Reserva Envelope',
            'descricao' => 'Testa overlap por envelopamento',
            'data_inicial' => $data,
            'data_final' => $data,
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'data' => $data,
                    'horario_inicio' => '09:00:00',
                    'horario_fim' => '12:00:00',
                    'agenda_id' => $agenda->id,
                ],
            ],
        ]);

        $response->assertSessionHasErrors('horarios_solicitados.0.agenda_id');
    }

    #[Test]
    public function test_adjacent_intervals_are_not_conflict(): void
    {
        $usuario = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $data = now()->addDays(1)->toDateString();

        // Existe horário 10:00-11:00 deferido
        Horario::create([
            'reserva_id' => Reserva::factory()->create()->id,
            'agenda_id' => $agenda->id,
            'data' => $data,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
            'situacao' => SituacaoReservaEnum::DEFERIDA->value,
        ]);

        // Tentar reservar 11:00-12:00 (adjacente, sem overlap) - deve PASSAR
        $response = $this->actingAs($usuario)->post(route('reservas.store'), [
            'titulo' => 'Reserva Adjacente',
            'descricao' => 'Testa adjacência permitida',
            'data_inicial' => $data,
            'data_final' => $data,
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'data' => $data,
                    'horario_inicio' => '11:00:00',
                    'horario_fim' => '12:00:00',
                    'agenda_id' => $agenda->id,
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
    }

    #[Test]
    public function test_free_horario_is_accepted(): void
    {
        $usuario = User::factory()->create();
        $agenda = Agenda::factory()->create();

        // Nenhum horário deferido na agenda

        $hoje = now()->toDateString();
        $response = $this->actingAs($usuario)->post(route('reservas.store'), [
            'titulo' => 'Reserva Livre',
            'descricao' => 'Testa horário livre',
            'data_inicial' => $hoje,
            'data_final' => $hoje,
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'data' => $hoje,
                    'horario_inicio' => '14:00:00',
                    'horario_fim' => '16:00:00',
                    'agenda_id' => $agenda->id,
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
    }

    #[Test]
    public function test_editing_own_horarios_does_not_block(): void
    {
        $usuario = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $usuario->id]);

        $data = now()->addDays(1)->toDateString();

        $reserva = Reserva::factory()->create([
            'user_id' => $usuario->id,
            'data_inicial' => $data,
            'data_final' => $data,
            'recorrencia' => 'unica',
        ]);

        // Criar horário próprio já deferido
        Horario::create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $data,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
            'situacao' => SituacaoReservaEnum::DEFERIDA->value,
        ]);

        // Tentar editar (mesmo horário) - não deve bloquear
        $response = $this->actingAs($usuario)->put(route('reservas.update', $reserva->id), [
            'titulo' => 'Reserva Editada',
            'descricao' => 'Edição do próprio horário',
            'data_inicial' => $data,
            'data_final' => $data,
            'recorrencia' => 'unica',
            'edit_scope' => 'recurring',
            'edited_week_date' => null,
            'horarios_solicitados' => [
                [
                    'data' => $data,
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                    'agenda_id' => $agenda->id,
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
    }

    public function test_it_rejects_past_date_in_store_request(): void
    {
        $yesterday = today()->subDay();
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $response = $this->actingAs($user)->post(route('reservas.store'), [
            'titulo' => 'Teste Data Passada',
            'descricao' => '',
            'data_inicial' => $yesterday->format('Y-m-d'),
            'data_final' => $yesterday->format('Y-m-d'),
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'agenda_id' => $agenda->id,
                    'data' => $yesterday->format('Y-m-d'),
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ]);

        $response->assertSessionHasErrors('data_inicial');
    }

    public function test_it_rejects_data_final_before_data_inicial(): void
    {
        $tomorrow = today()->addDay();
        $today = today();
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $response = $this->actingAs($user)->post(route('reservas.store'), [
            'titulo' => 'Teste Ordem Datas',
            'descricao' => '',
            'data_inicial' => $tomorrow->format('Y-m-d'),
            'data_final' => $today->format('Y-m-d'),
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'agenda_id' => $agenda->id,
                    'data' => $tomorrow->format('Y-m-d'),
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ]);

        $response->assertSessionHasErrors('data_final');
    }

    public function test_it_accepts_today_as_data_inicial(): void
    {
        $today = today();
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $this->actingAs($user)->post(route('reservas.store'), [
            'titulo' => 'Teste Hoje',
            'descricao' => '',
            'data_inicial' => $today->format('Y-m-d'),
            'data_final' => $today->format('Y-m-d'),
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'agenda_id' => $agenda->id,
                    'data' => $today->format('Y-m-d'),
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ]);

        $this->assertNull(
            session('errors')?->get('data_inicial'),
            'data_inicial não deveria ser rejeitada quando é hoje'
        );
    }

    public function test_it_allows_editing_recurring_reservation_with_past_data_inicial(): void
    {
        $twoMonthsAgo = today()->subMonths(2);
        $oneMonthFromNow = today()->addMonth();
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'titulo' => 'Recorrente com Data Passada',
            'data_inicial' => $twoMonthsAgo,
            'data_final' => $oneMonthFromNow,
            'recorrencia' => 'personalizado',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $twoMonthsAgo->format('Y-m-d'),
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $this->actingAs($user)->put(route('reservas.update', $reserva->id), [
            'titulo' => 'Recorrente Editada',
            'descricao' => 'Descrição atualizada',
            'data_inicial' => $twoMonthsAgo->format('Y-m-d'),
            'data_final' => $oneMonthFromNow->format('Y-m-d'),
            'recorrencia' => 'personalizado',
            'edit_scope' => 'recurring',
            'edited_week_date' => null,
            'horarios_solicitados' => [
                [
                    'agenda_id' => $agenda->id,
                    'data' => $twoMonthsAgo->format('Y-m-d'),
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ]);

        $this->assertNull(
            session('errors')?->get('data_inicial'),
            'Edição de reserva recorrente com data_inicial no passado deveria ser permitida'
        );
    }

    public function test_it_accepts_valid_reservation_creation(): void
    {
        $tomorrow = today()->addDay();
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $this->actingAs($user)->post(route('reservas.store'), [
            'titulo' => 'Reserva Válida',
            'descricao' => 'Descrição',
            'data_inicial' => $tomorrow->format('Y-m-d'),
            'data_final' => $tomorrow->format('Y-m-d'),
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'agenda_id' => $agenda->id,
                    'data' => $tomorrow->format('Y-m-d'),
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ]);

        $this->assertNull(
            session('errors')?->get('data_inicial'),
            'Reserva com data válida deveria passar na validação de datas'
        );
    }

    #[Test]
    public function it_rejects_horario_fim_equal_to_horario_inicio_in_store(): void
    {
        $tomorrow = today()->addDay();
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $response = $this->actingAs($user)->postJson(route('reservas.store'), [
            'titulo' => 'Teste Horário Igual',
            'descricao' => '',
            'data_inicial' => $tomorrow->format('Y-m-d'),
            'data_final' => $tomorrow->format('Y-m-d'),
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'agenda_id' => $agenda->id,
                    'data' => $tomorrow->format('Y-m-d'),
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '10:00:00',
                ],
            ],
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('horarios_solicitados.0.horario_fim');
    }

    #[Test]
    public function it_rejects_horario_fim_before_horario_inicio_in_store(): void
    {
        $tomorrow = today()->addDay();
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $response = $this->actingAs($user)->postJson(route('reservas.store'), [
            'titulo' => 'Teste Ordem Horários',
            'descricao' => '',
            'data_inicial' => $tomorrow->format('Y-m-d'),
            'data_final' => $tomorrow->format('Y-m-d'),
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'agenda_id' => $agenda->id,
                    'data' => $tomorrow->format('Y-m-d'),
                    'horario_inicio' => '11:00:00',
                    'horario_fim' => '10:00:00',
                ],
            ],
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('horarios_solicitados.0.horario_fim');
    }

    #[Test]
    public function it_accepts_valid_horario_interval_in_store(): void
    {
        $tomorrow = today()->addDay();
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create();

        $response = $this->actingAs($user)->post(route('reservas.store'), [
            'titulo' => 'Teste Horário Válido',
            'descricao' => '',
            'data_inicial' => $tomorrow->format('Y-m-d'),
            'data_final' => $tomorrow->format('Y-m-d'),
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'agenda_id' => $agenda->id,
                    'data' => $tomorrow->format('Y-m-d'),
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ]);

        $this->assertNull(
            session('errors')?->get('horarios_solicitados.0.horario_fim'),
            'Intervalo válido não deveria ser rejeitado'
        );
    }

    #[Test]
    public function it_rejects_horario_fim_equal_to_horario_inicio_in_update(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $user->id]);
        $tomorrow = today()->addDay();

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $tomorrow,
            'data_final' => $tomorrow,
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $tomorrow->format('Y-m-d'),
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $response = $this->actingAs($user)->putJson(route('reservas.update', $reserva->id), [
            'titulo' => $reserva->titulo,
            'descricao' => $reserva->descricao,
            'data_inicial' => $tomorrow->format('Y-m-d'),
            'data_final' => $tomorrow->format('Y-m-d'),
            'recorrencia' => $reserva->recorrencia,
            'edit_scope' => 'single',
            'edited_week_date' => $tomorrow->format('Y-m-d'),
            'horarios_solicitados' => [
                [
                    'id' => Horario::first()->id,
                    'agenda_id' => $agenda->id,
                    'data' => $tomorrow->format('Y-m-d'),
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '10:00:00',
                ],
            ],
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('horarios_solicitados.0.horario_fim');
    }

    #[Test]
    public function it_rejects_horario_fim_before_horario_inicio_in_update(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $user->id]);
        $tomorrow = today()->addDay();

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $tomorrow,
            'data_final' => $tomorrow,
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $tomorrow->format('Y-m-d'),
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $response = $this->actingAs($user)->putJson(route('reservas.update', $reserva->id), [
            'titulo' => $reserva->titulo,
            'descricao' => $reserva->descricao,
            'data_inicial' => $tomorrow->format('Y-m-d'),
            'data_final' => $tomorrow->format('Y-m-d'),
            'recorrencia' => $reserva->recorrencia,
            'edit_scope' => 'single',
            'edited_week_date' => $tomorrow->format('Y-m-d'),
            'horarios_solicitados' => [
                [
                    'id' => Horario::first()->id,
                    'agenda_id' => $agenda->id,
                    'data' => $tomorrow->format('Y-m-d'),
                    'horario_inicio' => '11:00:00',
                    'horario_fim' => '10:00:00',
                ],
            ],
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('horarios_solicitados.0.horario_fim');
    }

    #[Test]
    public function it_accepts_valid_horario_interval_in_update(): void
    {
        $user = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $user->id]);
        $tomorrow = today()->addDay();

        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'data_inicial' => $tomorrow,
            'data_final' => $tomorrow,
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $tomorrow->format('Y-m-d'),
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $response = $this->actingAs($user)->put(route('reservas.update', $reserva->id), [
            'titulo' => $reserva->titulo,
            'descricao' => $reserva->descricao,
            'data_inicial' => $tomorrow->format('Y-m-d'),
            'data_final' => $tomorrow->format('Y-m-d'),
            'recorrencia' => $reserva->recorrencia,
            'edit_scope' => 'single',
            'edited_week_date' => $tomorrow->format('Y-m-d'),
            'horarios_solicitados' => [
                [
                    'id' => Horario::first()->id,
                    'agenda_id' => $agenda->id,
                    'data' => $tomorrow->format('Y-m-d'),
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                ],
            ],
        ]);

        $this->assertNull(
            session('errors')?->get('horarios_solicitados.0.horario_fim'),
            'Intervalo válido não deveria ser rejeitado'
        );
    }
}
