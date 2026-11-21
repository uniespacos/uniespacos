<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Repositories\HorarioRepositoryInterface;
use App\Services\TravaDeHorarios;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HorarioConflitosEmLoteTest extends TestCase
{
    private const DATA = '2026-11-02';

    private function repositorio(): HorarioRepositoryInterface
    {
        return app(HorarioRepositoryInterface::class);
    }

    private function horarioExistente(Agenda $agenda, string $data, string $inicio, string $fim, string $situacao = SituacaoReservaEnum::DEFERIDA->value, ?Reserva $reserva = null, string $titulo = 'Reserva existente'): Reserva
    {
        $reserva ??= Reserva::factory()->create(['titulo' => $titulo]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'situacao' => $situacao,
        ]);

        return $reserva;
    }

    /**
     * @return array{agenda_id: int, data: string, horario_inicio: string, horario_fim: string}
     */
    private function linha(Agenda $agenda, string $inicio, string $fim, string $data = self::DATA): array
    {
        return [
            'agenda_id' => $agenda->id,
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
        ];
    }

    public function test_linha_sobreposta_a_horario_deferido_conflita_com_detalhes(): void
    {
        $agenda = Agenda::factory()->create();
        $existente = $this->horarioExistente($agenda, self::DATA, '10:00:00', '12:00:00', titulo: 'Aula de Cálculo');

        $conflitos = $this->repositorio()->conflitosDeferidos([$this->linha($agenda, '11:00', '13:00')]);

        $this->assertCount(1, $conflitos);
        $this->assertSame([
            'linha' => [
                'agenda_id' => $agenda->id,
                'data' => self::DATA,
                'horario_inicio' => '11:00:00',
                'horario_fim' => '13:00:00',
            ],
            'conflito' => [
                'reserva_id' => $existente->id,
                'reserva_titulo' => 'Aula de Cálculo',
                'data' => self::DATA,
                'horario_inicio' => '10:00:00',
                'horario_fim' => '12:00:00',
            ],
        ], $conflitos->get(0));
    }

    public function test_linha_sem_sobreposicao_nao_aparece_no_resultado(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, self::DATA, '10:00:00', '12:00:00');

        $conflitos = $this->repositorio()->conflitosDeferidos([$this->linha($agenda, '13:00', '14:00')]);

        $this->assertCount(0, $conflitos);
    }

    public function test_horarios_em_analise_ou_indeferidos_nao_contam_como_conflito(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, self::DATA, '10:00:00', '12:00:00', SituacaoReservaEnum::EM_ANALISE->value);
        $this->horarioExistente($agenda, self::DATA, '10:00:00', '12:00:00', SituacaoReservaEnum::INDEFERIDA->value);

        $conflitos = $this->repositorio()->conflitosDeferidos([$this->linha($agenda, '10:00', '12:00')]);

        $this->assertCount(0, $conflitos);
    }

    public function test_ignora_horarios_da_propria_reserva_quando_informada(): void
    {
        $agenda = Agenda::factory()->create();
        $propria = $this->horarioExistente($agenda, self::DATA, '10:00:00', '12:00:00');
        $linhas = [$this->linha($agenda, '11:00', '13:00')];

        $this->assertCount(0, $this->repositorio()->conflitosDeferidos($linhas, $propria->id));
        $this->assertCount(1, $this->repositorio()->conflitosDeferidos($linhas));
    }

    public function test_intervalos_encostados_nao_conflitam(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, self::DATA, '09:00:00', '10:00:00');
        $this->horarioExistente($agenda, self::DATA, '14:00:00', '15:00:00');

        $conflitos = $this->repositorio()->conflitosDeferidos([
            $this->linha($agenda, '10:00', '11:00'),
            $this->linha($agenda, '13:00', '14:00'),
        ]);

        $this->assertCount(0, $conflitos);
    }

    public function test_formato_hh_mm_da_linha_e_comparado_como_hh_mm_ss(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, self::DATA, '09:00:00', '10:00:00');

        $encostado = $this->repositorio()->conflitosDeferidos([$this->linha($agenda, '10:00', '11:00')]);
        $sobreposto = $this->repositorio()->conflitosDeferidos([$this->linha($agenda, '09:59', '11:00')]);

        $this->assertCount(0, $encostado);
        $this->assertCount(1, $sobreposto);
    }

    public function test_outra_data_ou_outra_agenda_nao_conflitam(): void
    {
        $agenda = Agenda::factory()->create();
        $outraAgenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, '2026-11-03', '10:00:00', '12:00:00');
        $this->horarioExistente($outraAgenda, self::DATA, '10:00:00', '12:00:00');

        $conflitos = $this->repositorio()->conflitosDeferidos([$this->linha($agenda, '10:00', '12:00')]);

        $this->assertCount(0, $conflitos);
    }

    public function test_resultado_e_indexado_pela_chave_original_das_linhas(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, '2026-11-04', '08:00:00', '09:00:00');

        $conflitos = $this->repositorio()->conflitosDeferidos([
            0 => $this->linha($agenda, '08:00', '09:00', '2026-11-02'),
            1 => $this->linha($agenda, '08:30', '09:30', '2026-11-04'),
            2 => $this->linha($agenda, '08:00', '09:00', '2026-11-05'),
        ]);

        $this->assertSame([1], $conflitos->keys()->all());
    }

    public function test_lote_sem_linhas_nao_consulta_o_banco(): void
    {
        DB::enableQueryLog();
        DB::flushQueryLog();

        $conflitos = $this->repositorio()->conflitosDeferidos([]);

        $this->assertCount(0, $conflitos);
        $this->assertCount(0, DB::getQueryLog());
    }

    public function test_lote_de_mais_de_cem_linhas_consulta_o_banco_uma_vez(): void
    {
        $agenda = Agenda::factory()->create();
        $reserva = Reserva::factory()->create(['titulo' => 'Semestre inteiro']);
        $inicio = Carbon::parse(self::DATA);

        $linhas = [];
        for ($dia = 0; $dia < 120; $dia++) {
            $data = $inicio->copy()->addDays($dia)->toDateString();
            $linhas[] = $this->linha($agenda, '08:00', '09:00', $data);
        }

        foreach ([0, 40, 80, 119] as $dia) {
            $this->horarioExistente(
                $agenda,
                $inicio->copy()->addDays($dia)->toDateString(),
                '08:30:00',
                '09:30:00',
                reserva: $reserva,
            );
        }

        DB::enableQueryLog();
        DB::flushQueryLog();

        $conflitos = $this->repositorio()->conflitosDeferidos($linhas);

        $this->assertCount(4, $conflitos);
        $this->assertCount(1, DB::getQueryLog());
    }

    public function test_trava_dentro_de_transacao_bloqueia_os_horarios_do_periodo(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, self::DATA, '10:00:00', '12:00:00');

        DB::enableQueryLog();
        DB::flushQueryLog();

        DB::transaction(fn () => app(TravaDeHorarios::class)->adquirir([$agenda->id], self::DATA, self::DATA));

        $sqls = array_map(
            static fn (array $consulta): string => strtolower($consulta['query']),
            DB::getQueryLog(),
        );
        $this->assertTrue(
            collect($sqls)->contains(fn (string $sql): bool => str_contains($sql, 'for update')),
        );
    }
}
