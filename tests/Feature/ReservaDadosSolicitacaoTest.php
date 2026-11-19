<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Requests\UpdateReservaRequest;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Reserva;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ReservaDadosSolicitacaoTest extends TestCase
{
    private User $solicitante;

    private User $gestor;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-19 10:00:00', 'America/Bahia'));
        Notification::fake();

        $this->solicitante = User::factory()->create();
        $this->gestor = User::factory()->create();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_criacao_via_http_grava_publico_categoria_e_termo_congelado_no_instante_do_request(): void
    {
        $response = $this->actingAs($this->solicitante)->post(route('reservas.store'), $this->payload());

        $response->assertSessionHasNoErrors();

        $reserva = Reserva::where('titulo', 'Reserva de dados')->firstOrFail();
        $this->assertSame(40, $reserva->publico_estimado);
        $this->assertSame('Palestra', $reserva->categoria);
        $this->assertSame('2026-11-19T13:00:00+00:00', $reserva->termo_aceito_em?->toIso8601String());
    }

    public function test_criacao_sem_publico_nem_categoria_grava_nulos(): void
    {
        $response = $this->actingAs($this->solicitante)->post(route('reservas.store'), $this->payload([
            'publico_estimado' => null,
            'categoria' => null,
        ]));

        $response->assertSessionHasNoErrors();

        $reserva = Reserva::where('titulo', 'Reserva de dados')->firstOrFail();
        $this->assertNull($reserva->publico_estimado);
        $this->assertNull($reserva->categoria);
        $this->assertNotNull($reserva->termo_aceito_em);
    }

    public function test_payload_de_edicao_expoe_publico_e_categoria_mas_oculta_termo_aceito(): void
    {
        $this->actingAs($this->solicitante)->post(route('reservas.store'), $this->payload());

        $reserva = Reserva::where('titulo', 'Reserva de dados')->firstOrFail();

        $this->actingAs($this->solicitante)
            ->get(route('reservas.edit', $reserva))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Espacos/VisualizarEspacoPage')
                ->where('reserva.publico_estimado', 40)
                ->where('reserva.categoria', 'Palestra')
                ->missing('reserva.termo_aceito_em'));

        $this->assertNotNull($reserva->fresh()?->termo_aceito_em);
    }

    public function test_post_sem_termo_de_responsabilidade_retorna_erro_no_campo(): void
    {
        $dados = $this->payload();
        unset($dados['termo_responsabilidade']);

        $response = $this->actingAs($this->solicitante)->post(route('reservas.store'), $dados);

        $response->assertSessionHasErrors(['termo_responsabilidade' => 'É obrigatório aceitar o termo de responsabilidade.']);
        $this->assertSame(0, Reserva::where('titulo', 'Reserva de dados')->count());
    }

    public function test_post_com_termo_recusado_retorna_erro_no_campo(): void
    {
        $response = $this->actingAs($this->solicitante)->post(route('reservas.store'), $this->payload([
            'termo_responsabilidade' => false,
        ]));

        $response->assertSessionHasErrors('termo_responsabilidade');
    }

    public function test_publico_estimado_zero_retorna_erro_no_campo(): void
    {
        $response = $this->actingAs($this->solicitante)->post(route('reservas.store'), $this->payload([
            'publico_estimado' => 0,
        ]));

        $response->assertSessionHasErrors('publico_estimado');
    }

    public function test_publico_estimado_acima_de_5000_retorna_erro_no_campo(): void
    {
        $response = $this->actingAs($this->solicitante)->post(route('reservas.store'), $this->payload([
            'publico_estimado' => 6000,
        ]));

        $response->assertSessionHasErrors('publico_estimado');
    }

    public function test_categoria_com_mais_de_100_caracteres_retorna_erro_no_campo(): void
    {
        $response = $this->actingAs($this->solicitante)->post(route('reservas.store'), $this->payload([
            'categoria' => str_repeat('a', 101),
        ]));

        $response->assertSessionHasErrors('categoria');
    }

    public function test_update_aceita_ausencia_do_termo_mas_rejeita_termo_recusado(): void
    {
        $regras = Arr::only((new UpdateReservaRequest)->rules(), ['publico_estimado', 'categoria', 'termo_responsabilidade']);

        $semTermo = Validator::make(['publico_estimado' => 40, 'categoria' => 'Palestra'], $regras);
        $this->assertFalse($semTermo->fails());

        $termoRecusado = Validator::make(['termo_responsabilidade' => false], $regras);
        $this->assertTrue($termoRecusado->fails());
        $this->assertTrue($termoRecusado->errors()->has('termo_responsabilidade'));

        $limitesInvalidos = Validator::make([
            'publico_estimado' => 6000,
            'categoria' => str_repeat('a', 101),
        ], $regras);
        $this->assertTrue($limitesInvalidos->errors()->has('publico_estimado'));
        $this->assertTrue($limitesInvalidos->errors()->has('categoria'));
    }

    /**
     * @param  array<string, mixed>  $sobrescrever
     * @return array<string, mixed>
     */
    private function payload(array $sobrescrever = []): array
    {
        $espaco = Espaco::factory()->create();
        Agenda::where('espaco_id', $espaco->id)->delete();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'turno' => 'manha',
            'user_id' => $this->gestor->id,
        ]);

        return array_merge([
            'titulo' => 'Reserva de dados',
            'descricao' => 'Descricao da reserva',
            'data_inicial' => '2026-11-23',
            'data_final' => '2026-11-23',
            'recorrencia' => 'unica',
            'termo_responsabilidade' => true,
            'publico_estimado' => 40,
            'categoria' => 'Palestra',
            'horarios_solicitados' => [
                [
                    'data' => '2026-11-23',
                    'horario_inicio' => '08:00:00',
                    'horario_fim' => '10:00:00',
                    'agenda_id' => $agenda->id,
                ],
            ],
        ], $sobrescrever);
    }
}
