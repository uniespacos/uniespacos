<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Tests\Concerns\CongelaRelogio;
use Tests\TestCase;

class SemanaInvalidaTest extends TestCase
{
    use CongelaRelogio;

    private User $dono;

    private User $gestor;

    private Reserva $reserva;

    private Espaco $espaco;

    protected function setUp(): void
    {
        parent::setUp();

        $this->congelarRelogio();

        $this->dono = User::factory()->create();
        $this->gestor = User::factory()->create();
        $this->gestor->assignRole('gestor');

        $this->espaco = Espaco::factory()->create();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $this->espaco->id,
            'user_id' => $this->gestor->id,
            'turno' => 'manha',
        ]);

        $this->reserva = Reserva::factory()->create([
            'user_id' => $this->dono->id,
            'situacao' => 'em_analise',
            'data_inicial' => '2026-11-23',
            'data_final' => '2026-11-23',
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $this->reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => '2026-11-23',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);
    }

    public function test_listagem_do_usuario_rejeita_semana_texto_invalido(): void
    {
        $this->actingAs($this->dono)
            ->get(route('reservas.index', ['semana' => 'abc']))
            ->assertRedirect()
            ->assertSessionHasErrors('semana');
    }

    public function test_listagem_do_usuario_rejeita_semana_array(): void
    {
        $this->actingAs($this->dono)
            ->get('/reservas?semana[]=x')
            ->assertRedirect()
            ->assertSessionHasErrors('semana');
    }

    public function test_listagem_do_gestor_rejeita_semana_texto_invalido(): void
    {
        $this->actingAs($this->gestor)
            ->get(route('gestor.reservas.index', ['semana' => 'abc']))
            ->assertRedirect()
            ->assertSessionHasErrors('semana');
    }

    public function test_listagem_do_gestor_rejeita_semana_array(): void
    {
        $this->actingAs($this->gestor)
            ->get('/gestor/reservas?semana[]=x')
            ->assertRedirect()
            ->assertSessionHasErrors('semana');
    }

    public function test_edicao_de_reserva_rejeita_semana_invalida(): void
    {
        $this->actingAs($this->dono)
            ->get(route('reservas.edit', ['reserva' => $this->reserva, 'semana' => 'abc']))
            ->assertRedirect()
            ->assertSessionHasErrors('semana');

        $this->actingAs($this->dono)
            ->get('/reservas/'.$this->reserva->id.'/edit?semana[]=x')
            ->assertRedirect()
            ->assertSessionHasErrors('semana');
    }

    public function test_revisao_do_gestor_rejeita_semana_invalida(): void
    {
        $this->actingAs($this->gestor)
            ->get(route('gestor.reservas.show', ['reserva' => $this->reserva, 'semana' => 'abc']))
            ->assertRedirect()
            ->assertSessionHasErrors('semana');

        $this->actingAs($this->gestor)
            ->get('/gestor/reservas/'.$this->reserva->id.'?semana[]=x')
            ->assertRedirect()
            ->assertSessionHasErrors('semana');
    }

    public function test_agenda_publica_do_espaco_rejeita_semana_invalida(): void
    {
        $this->actingAs($this->dono)
            ->get(route('espacos.show', ['espaco' => $this->espaco, 'semana' => 'abc']))
            ->assertRedirect()
            ->assertSessionHasErrors('semana');

        $this->actingAs($this->dono)
            ->get('/espacos/'.$this->espaco->id.'?semana[]=x')
            ->assertRedirect()
            ->assertSessionHasErrors('semana');
    }

    public function test_agenda_institucional_do_espaco_rejeita_semana_invalida(): void
    {
        $institucional = User::factory()->create();
        $institucional->assignRole('institucional');

        $this->actingAs($institucional)
            ->get(route('institucional.espacos.show', ['espaco' => $this->espaco, 'semana' => 'abc']))
            ->assertRedirect()
            ->assertSessionHasErrors('semana');

        $this->actingAs($institucional)
            ->get('/institucional/espacos/'.$this->espaco->id.'?semana[]=x')
            ->assertRedirect()
            ->assertSessionHasErrors('semana');
    }

    public function test_filtro_de_texto_como_array_nao_gera_erro_interno(): void
    {
        $this->actingAs($this->dono)
            ->get('/reservas?search[]=x')
            ->assertRedirect()
            ->assertSessionHasErrors('search');
    }

    public function test_semana_valida_continua_respondendo_normalmente(): void
    {
        $this->actingAs($this->dono)
            ->get(route('reservas.index', ['semana' => '2026-11-23']))
            ->assertOk();

        $this->actingAs($this->dono)
            ->get(route('reservas.index', ['semana' => 'today']))
            ->assertOk();

        $this->actingAs($this->dono)
            ->get('/reservas?semana=')
            ->assertOk();
    }
}
