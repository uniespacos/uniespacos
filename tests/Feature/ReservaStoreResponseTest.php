<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\ProcessarCriacaoReserva;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ReservaStoreResponseTest extends TestCase
{
    private function criarPayloadValido(): array
    {
        $espaco = Espaco::factory()->create();

        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'turno' => 'manha',
        ]);

        $hoje = now()->toDateString();

        return [
            'titulo' => 'Reserva de Teste',
            'descricao' => 'Descrição da reserva para teste',
            'data_inicial' => $hoje,
            'data_final' => $hoje,
            'recorrencia' => 'unica',
            'horarios_solicitados' => [
                [
                    'data' => $hoje,
                    'horario_inicio' => '08:00:00',
                    'horario_fim' => '10:00:00',
                    'agenda_id' => $agenda->id,
                ],
            ],
        ];
    }

    public function test_store_returns_redirect_response(): void
    {
        Queue::fake();

        $usuario = User::factory()->create();

        $response = $this->actingAs($usuario)
            ->post(route('reservas.store'), $this->criarPayloadValido());

        $response->assertRedirect();
        $this->assertNotEquals(204, $response->getStatusCode());
        $response->assertSessionHasNoErrors();
        Queue::assertPushed(ProcessarCriacaoReserva::class);
    }
}
