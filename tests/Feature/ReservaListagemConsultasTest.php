<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Services\ReservaService;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CongelaRelogio;
use Tests\TestCase;

class ReservaListagemConsultasTest extends TestCase
{
    use CongelaRelogio;

    private const DATA = '2026-11-23';

    private Agenda $agenda;

    protected function setUp(): void
    {
        parent::setUp();

        $this->congelarRelogio();

        $this->agenda = Agenda::factory()->create([
            'espaco_id' => Espaco::factory()->create()->id,
            'turno' => 'manha',
        ]);
    }

    public function test_quantidade_de_consultas_nao_cresce_com_o_numero_de_reservas(): void
    {
        $dono = User::factory()->create();
        $this->criarReservaEmAnalise($dono);

        $this->contarConsultas(fn () => $this->listar($dono));

        $comUma = $this->contarConsultas(fn () => $this->listar($dono));

        for ($i = 0; $i < 9; $i++) {
            $this->criarReservaEmAnalise($dono);
        }

        $comDez = $this->contarConsultas(fn () => $this->listar($dono));

        $this->assertSame($comUma, $comDez, 'A listagem não pode consultar por reserva.');
    }

    public function test_can_update_reflete_horario_avaliado_sem_consulta_por_item(): void
    {
        $dono = User::factory()->create();
        $editavel = $this->criarReservaEmAnalise($dono);
        $avaliada = $this->criarReservaEmAnalise($dono);
        Horario::query()->where('reserva_id', $avaliada->id)->update(['situacao' => 'deferida']);

        $reservas = $this->listar($dono)['reservas']->getCollection()->keyBy('id');

        $this->assertTrue($reservas[$editavel->id]->can_update);
        $this->assertFalse($reservas[$avaliada->id]->can_update);
    }

    public function test_atributo_auxiliar_nao_vaza_para_o_payload(): void
    {
        $dono = User::factory()->create();
        $this->criarReservaEmAnalise($dono);

        $reserva = $this->listar($dono)['reservas']->getCollection()->first();

        $this->assertArrayNotHasKey('possui_horario_avaliado', $reserva->toArray());
    }

    /**
     * @return array<string, mixed>
     */
    private function listar(User $dono): array
    {
        return app(ReservaService::class)->getListingForUser(User::query()->findOrFail($dono->id), null, []);
    }

    private function criarReservaEmAnalise(User $dono): Reserva
    {
        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => 'em_analise',
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $this->agenda->id,
            'situacao' => 'em_analise',
            'data' => self::DATA,
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return $reserva;
    }

    private function contarConsultas(callable $acao): int
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        try {
            $acao();

            return count(DB::getQueryLog());
        } finally {
            DB::disableQueryLog();
        }
    }
}
