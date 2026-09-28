<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Tests\TestCase;

class GestorAvaliarReservaHttpTest extends TestCase
{
    public function test_gestor_request_validation_rejects_horario_from_unmanaged_agenda()
    {
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

        $gestorA->givePermissionTo('reservas.avaliar');
        $gestorA->givePermissionTo('secao.gestao-reservas');

        $response = $this->actingAs($gestorA)
            ->patch(route('gestor.reservas.update', $reserva), [
                'situacao' => 'parcialmente_deferida',
                'motivo' => null,
                'observacao' => null,
                'evaluation_scope' => 'single',
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
            ]);

        $response->assertRedirect();
        $response->assertSessionHasErrors('horarios_avaliados');
    }

    public function test_gestor_can_evaluate_horario_from_managed_agenda_via_http()
    {
        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);
        $reserva = Reserva::factory()->create(['situacao' => 'em_analise']);

        $horario = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
        ]);

        $gestor->givePermissionTo('reservas.avaliar');
        $gestor->givePermissionTo('secao.gestao-reservas');

        $response = $this->actingAs($gestor)
            ->patch(route('gestor.reservas.update', $reserva), [
                'situacao' => 'deferida',
                'motivo' => null,
                'observacao' => null,
                'evaluation_scope' => 'single',
                'horarios_avaliados' => [
                    [
                        'id' => $horario->id,
                        'status' => 'deferida',
                    ],
                ],
            ]);

        $response->assertRedirect(route('gestor.reservas.index'));
        $response->assertSessionHas('success');
    }
}
