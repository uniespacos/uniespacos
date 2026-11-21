<?php

declare(strict_types=1);

namespace Tests\Feature\Rules;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Rules\HorarioDisponivel;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class HorarioDisponivelTest extends TestCase
{
    use DatabaseTransactions;

    private const DATA = '2027-03-01';

    protected function setUp(): void
    {
        parent::setUp();

        app()->setLocale('pt_BR');
    }

    /**
     * @param  array<string, mixed>  $dados
     * @return array<string, list<string>>
     */
    private function validar(array $dados, ?int $ignorarReservaId = null): array
    {
        $validator = Validator::make($dados, [
            'horarios_solicitados.*.agenda_id' => [new HorarioDisponivel($ignorarReservaId)],
        ]);
        $validator->fails();

        return $validator->errors()->toArray();
    }

    /**
     * @return array<string, mixed>
     */
    private function dados(array $horarios, array $extras = []): array
    {
        return array_merge([
            'recorrencia' => 'unica',
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
            'horarios_solicitados' => $horarios,
        ], $extras);
    }

    /**
     * @return array{agenda_id: int, data: string, horario_inicio: string, horario_fim: string}
     */
    private function slot(Agenda $agenda, string $inicio, string $fim, string $data = self::DATA): array
    {
        return [
            'agenda_id' => $agenda->id,
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
        ];
    }

    private function horarioExistente(Agenda $agenda, string $inicio, string $fim, string $situacao = 'deferida', string $data = self::DATA, ?Reserva $reserva = null): Reserva
    {
        $reserva ??= Reserva::factory()->create();

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

    public function test_horario_deferido_sobreposto_na_mesma_agenda_e_data_reprova_o_slot(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, '10:00:00', '11:00:00');

        $erros = $this->validar($this->dados([$this->slot($agenda, '10:30:00', '11:30:00')]));

        $this->assertSame(
            ['horarios_solicitados.0.agenda_id' => ['O horário 10:30–11:30 de 01/03/2027 já está reservado.']],
            $erros,
        );
    }

    public function test_intervalos_encostados_nao_conflitam(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, '09:00:00', '10:00:00');

        $erros = $this->validar($this->dados([$this->slot($agenda, '10:00:00', '11:00:00')]));

        $this->assertSame([], $erros);
    }

    public function test_horario_em_analise_nao_bloqueia_o_slot(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, '10:00:00', '11:00:00', 'em_analise');

        $erros = $this->validar($this->dados([$this->slot($agenda, '10:00:00', '11:00:00')]));

        $this->assertSame([], $erros);
    }

    public function test_horario_deferido_de_outra_agenda_ou_outra_data_nao_bloqueia(): void
    {
        $agenda = Agenda::factory()->create();
        $outraAgenda = Agenda::factory()->create();
        $this->horarioExistente($outraAgenda, '10:00:00', '11:00:00');
        $this->horarioExistente($agenda, '10:00:00', '11:00:00', 'deferida', '2027-03-02');

        $erros = $this->validar($this->dados([$this->slot($agenda, '10:00:00', '11:00:00')]));

        $this->assertSame([], $erros);
    }

    public function test_horarios_da_propria_reserva_sao_ignorados_na_edicao(): void
    {
        $agenda = Agenda::factory()->create();
        $reserva = $this->horarioExistente($agenda, '10:00:00', '11:00:00');
        $dados = $this->dados([$this->slot($agenda, '10:00:00', '11:00:00')]);

        $this->assertSame([], $this->validar($dados, $reserva->id));
        $this->assertCount(1, $this->validar($dados));
    }

    public function test_recorrencia_reprova_citando_a_data_da_serie_que_conflita(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, '10:00:00', '11:00:00', 'deferida', '2027-03-22');

        $dados = $this->dados(
            [$this->slot($agenda, '10:00:00', '11:00:00')],
            ['recorrencia' => '1mes', 'data_final' => '2027-04-01'],
        );

        $this->assertSame(
            ['horarios_solicitados.0.agenda_id' => ['O horário 10:00–11:00 de 22/03/2027 já está reservado.']],
            $this->validar($dados),
        );
    }

    public function test_edit_scope_single_ignora_conflito_fora_da_semana_editada(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, '10:00:00', '11:00:00');
        $dados = $this->dados(
            [$this->slot($agenda, '10:00:00', '11:00:00')],
            ['recorrencia' => '1mes', 'edit_scope' => 'single', 'edited_week_date' => '2027-03-15'],
        );

        $this->assertSame([], $this->validar($dados));
    }

    public function test_edit_scope_single_reprova_conflito_dentro_da_semana_editada(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, '10:00:00', '11:00:00');
        $dados = $this->dados(
            [$this->slot($agenda, '10:00:00', '11:00:00')],
            ['recorrencia' => '1mes', 'edit_scope' => 'single', 'edited_week_date' => '2027-03-03'],
        );

        $this->assertCount(1, $this->validar($dados));
    }

    public function test_so_o_slot_conflitante_recebe_erro_em_requisicao_com_varios_slots(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, '14:00:00', '15:00:00');

        $erros = $this->validar($this->dados([
            $this->slot($agenda, '09:00:00', '10:00:00'),
            $this->slot($agenda, '14:30:00', '15:30:00'),
        ]));

        $this->assertSame(
            ['horarios_solicitados.1.agenda_id' => ['O horário 14:30–15:30 de 01/03/2027 já está reservado.']],
            $erros,
        );
    }

    public function test_todos_os_slots_sao_checados_em_uma_unica_consulta_a_horarios(): void
    {
        $agenda = Agenda::factory()->create();
        $this->horarioExistente($agenda, '14:00:00', '15:00:00');

        $consultas = [];
        DB::listen(function ($consulta) use (&$consultas): void {
            if (str_contains($consulta->sql, '"horarios"')) {
                $consultas[] = $consulta->sql;
            }
        });

        $this->validar($this->dados([
            $this->slot($agenda, '08:00:00', '09:00:00'),
            $this->slot($agenda, '10:00:00', '11:00:00'),
            $this->slot($agenda, '14:30:00', '15:30:00'),
        ]));

        $this->assertCount(1, $consultas);
    }

    public function test_slot_sem_dados_validos_reprova_com_mensagem_generica(): void
    {
        $agenda = Agenda::factory()->create();

        $erros = $this->validar($this->dados([
            ['agenda_id' => $agenda->id, 'data' => 'nao-e-data', 'horario_inicio' => '10:00:00', 'horario_fim' => '11:00:00'],
        ]));

        $this->assertSame(['horarios_solicitados.0.agenda_id' => ['Dados de horário inválidos.']], $erros);
    }
}
