<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Andar;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Modulo;
use App\Models\Reserva;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Regression guard for issue #105 (reservation lists missing space/module info).
 *
 * The "Local" column only had the space name because neither repository eager
 * loaded the andar.modulo chain — getPaginatedForUser stopped at 'agenda.espaco'
 * and getPaginatedForGestor used a column-limited 'agenda.espaco:id,nome'.
 *
 * These assertions live on the Inertia payload rather than on the rendered
 * markup because the failure mode is a missing eager load: the column renders
 * blank, no error is raised, and only the payload shows the relation is absent.
 */
class ReservaListagemLocalTest extends TestCase
{
    private const MODULO = 'Pavilhão Central';

    private const ANDAR = 'Terceiro Andar';

    private const ESPACO = 'Sala 203';

    /**
     * Builds the full location chain so espaco -> andar -> modulo can be asserted.
     *
     * A user is created inside the new instituicao on purpose: EspacoFactory's
     * afterCreating hook picks a manager with User::whereHas('setor.unidade', ...)
     * scoped to the space's instituicao, and would fail on an empty collection.
     */
    private function criarEspacoComLocalizacao(): Espaco
    {
        $unidade = Unidade::factory()->create();
        $setor = Setor::where('unidade_id', $unidade->id)->firstOrFail();
        User::factory()->create(['setor_id' => $setor->id]);

        $modulo = Modulo::factory()->create(['nome' => self::MODULO, 'unidade_id' => $unidade->id]);
        $andar = Andar::factory()->create(['nome' => self::ANDAR, 'modulo_id' => $modulo->id]);

        return Espaco::factory()->create(['nome' => self::ESPACO, 'andar_id' => $andar->id]);
    }

    private function criarReserva(User $dono, Espaco $espaco, User $gestorDaAgenda): Reserva
    {
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestorDaAgenda->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => 'em_analise',
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => now()->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return $reserva->fresh();
    }

    public function test_user_listing_carries_espaco_andar_and_modulo(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $espaco = $this->criarEspacoComLocalizacao();

        $this->criarReserva($dono, $espaco, $gestor);

        $response = $this->actingAs($dono)->get(route('reservas.index'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('reservas.data.0.horarios.0.agenda.espaco.nome', self::ESPACO)
            ->where('reservas.data.0.horarios.0.agenda.espaco.andar.nome', self::ANDAR)
            ->where('reservas.data.0.horarios.0.agenda.espaco.andar.modulo.nome', self::MODULO)
        );
    }

    public function test_gestor_listing_carries_espaco_andar_and_modulo(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $espaco = $this->criarEspacoComLocalizacao();

        $this->criarReserva($dono, $espaco, $gestor);

        $response = $this->actingAs($gestor)->get(route('gestor.reservas.index'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('reservas.data.0.horarios.0.agenda.espaco.nome', self::ESPACO)
            ->where('reservas.data.0.horarios.0.agenda.espaco.andar.nome', self::ANDAR)
            ->where('reservas.data.0.horarios.0.agenda.espaco.andar.modulo.nome', self::MODULO)
        );
    }

    /**
     * getPaginatedForGestor selects explicit columns, and a nested relation only
     * resolves when its foreign key is among them. Without andar_id on espaco and
     * modulo_id on andar the chain silently comes back null.
     */
    public function test_gestor_listing_keeps_the_foreign_keys_needed_for_the_chain(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $espaco = $this->criarEspacoComLocalizacao();

        $this->criarReserva($dono, $espaco, $gestor);

        $response = $this->actingAs($gestor)->get(route('gestor.reservas.index'));

        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->whereNot('reservas.data.0.horarios.0.agenda.espaco.andar', null)
            ->whereNot('reservas.data.0.horarios.0.agenda.espaco.andar.modulo', null)
        );
    }
}
