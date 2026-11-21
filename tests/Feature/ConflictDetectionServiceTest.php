<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Services\ConflictDetectionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ConflictDetectionServiceTest extends TestCase
{
    use DatabaseTransactions;

    private function horario(Reserva $reserva, Agenda $agenda, string $inicio, string $fim, string $situacao, string $data = '2027-03-01'): Horario
    {
        return Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'situacao' => $situacao,
        ]);
    }

    public function test_com_varios_conflitos_reporta_o_primeiro_por_horario_de_inicio_independente_da_ordem_de_insercao(): void
    {
        $agenda = Agenda::factory()->create();
        $consultada = Reserva::factory()->create(['titulo' => 'Consultada']);
        $horarioChecado = $this->horario($consultada, $agenda, '10:00:00', '12:00:00', 'em_analise');

        $this->horario(Reserva::factory()->create(['titulo' => 'Zeta']), $agenda, '11:00:00', '12:00:00', 'deferida');
        $this->horario(Reserva::factory()->create(['titulo' => 'Ypsilon']), $agenda, '10:00:00', '11:00:00', 'deferida');

        $conflitos = app(ConflictDetectionService::class)->findConflictsFor($consultada->id);

        $this->assertCount(1, $conflitos);
        $this->assertSame($horarioChecado->id, $conflitos->first()->horario_checado_id);
        $this->assertSame('Ypsilon', $conflitos->get($horarioChecado->id)->conflito_reserva_titulo);
    }

    public function test_ignora_horarios_nao_deferidos_da_propria_reserva_e_intervalos_encostados(): void
    {
        $agenda = Agenda::factory()->create();
        $consultada = Reserva::factory()->create();
        $this->horario($consultada, $agenda, '10:00:00', '11:00:00', 'deferida');
        $this->horario($consultada, $agenda, '13:00:00', '14:00:00', 'em_analise');
        $this->horario(Reserva::factory()->create(), $agenda, '09:00:00', '10:00:00', 'deferida');
        $this->horario(Reserva::factory()->create(), $agenda, '14:00:00', '15:00:00', 'deferida');
        $this->horario(Reserva::factory()->create(), $agenda, '13:00:00', '14:00:00', 'em_analise');

        $conflitos = app(ConflictDetectionService::class)->findConflictsFor($consultada->id);

        $this->assertTrue($conflitos->isEmpty());
    }
}
