<?php

declare(strict_types=1);

namespace Tests\Unit\Jobs;

use App\Jobs\ProcessarCriacaoReserva;
use App\Models\Agenda;
use App\Models\Reserva;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Cobre a geracao de horarios na criacao de reserva.
 *
 * A versao anterior deste arquivo usava a anotacao `@test` sem prefixo `test_`,
 * que o PHPUnit 12 nao reconhece mais: os quatro testes nunca executaram
 * ("No tests found in class"). Alem disso, mockavam `Horario::create` e
 * `Agenda::findOrFail`, ou seja, assertavam o mecanismo da implementacao bugada
 * em vez da regra de negocio — nenhum deles pegaria a duplicacao.
 */
class ProcessarCriacaoReservaTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        Bus::fake();
        Notification::fake();
    }

    /**
     * @param  array<int, array<string, mixed>>  $slots
     * @return array<string, mixed>
     */
    private function dados(array $slots, string $recorrencia, string $dataInicial, string $dataFinal, string $titulo = 'Reserva de teste'): array
    {
        return [
            'titulo' => $titulo,
            'descricao' => 'Descricao de teste',
            'data_inicial' => $dataInicial,
            'data_final' => $dataFinal,
            'recorrencia' => $recorrencia,
            'horarios_solicitados' => $slots,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function slot(int $agendaId, string $data, string $inicio = '08:00:00', string $fim = '10:00:00'): array
    {
        return [
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'agenda_id' => $agendaId,
        ];
    }

    /**
     * `app()->call()` resolve o ExpansaoHorariosService injetado no handle(),
     * exatamente como o worker faria.
     *
     * @param  array<string, mixed>  $dados
     */
    private function executar(array $dados, User $solicitante): Reserva
    {
        $job = new ProcessarCriacaoReserva($dados, $solicitante);
        app()->call([$job, 'handle']);

        return Reserva::where('titulo', $dados['titulo'])->firstOrFail();
    }

    public function test_recorrencia_periodica_nao_multiplica_horarios_por_semana(): void
    {
        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        // O frontend manda uma entrada por semana ja selecionada. A versao
        // antiga expandia cada uma ate o fim: 4 + 3 + 2 + 1 = 10 registros.
        $dados = $this->dados([
            $this->slot($agenda->id, '2026-09-01'),
            $this->slot($agenda->id, '2026-09-08'),
            $this->slot($agenda->id, '2026-09-15'),
            $this->slot($agenda->id, '2026-09-22'),
        ], '1mes', '2026-09-01', '2026-09-28');

        $reserva = $this->executar($dados, $solicitante);

        $this->assertCount(4, $reserva->horarios);
        $this->assertSame(
            ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'],
            $reserva->horarios->pluck('data')->sort()->values()->all()
        );
    }

    public function test_recorrencia_unica_grava_apenas_as_datas_avulsas_enviadas(): void
    {
        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        // Tres slots na semana 1 e dois na semana 3, pulando a semana 2.
        $dados = $this->dados([
            $this->slot($agenda->id, '2026-09-01'),
            $this->slot($agenda->id, '2026-09-02', '14:00:00', '16:00:00'),
            $this->slot($agenda->id, '2026-09-03', '10:00:00', '12:00:00'),
            $this->slot($agenda->id, '2026-09-17'),
            $this->slot($agenda->id, '2026-09-18', '14:00:00', '16:00:00'),
        ], 'unica', '2026-09-01', '2026-09-18');

        $reserva = $this->executar($dados, $solicitante);

        $this->assertCount(5, $reserva->horarios);
        $this->assertSame(
            ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-17', '2026-09-18'],
            $reserva->horarios->pluck('data')->sort()->values()->all()
        );
    }

    public function test_cada_padrao_ancora_na_propria_data_selecionada(): void
    {
        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        // Quarta 02/09 e segunda 14/09: `data_inicial` e 02/09, entao ancorar a
        // reserva inteira nela faria a segunda comecar em 07/09.
        $dados = $this->dados([
            $this->slot($agenda->id, '2026-09-02'),
            $this->slot($agenda->id, '2026-09-14'),
        ], '1mes', '2026-09-02', '2026-09-28');

        $reserva = $this->executar($dados, $solicitante);

        $datas = $reserva->horarios->pluck('data')->sort()->values()->all();

        $this->assertNotContains('2026-09-07', $datas);
        $this->assertSame(
            ['2026-09-02', '2026-09-09', '2026-09-14', '2026-09-16', '2026-09-21', '2026-09-23', '2026-09-28'],
            $datas
        );
    }

    public function test_horarios_vao_para_o_banco_num_unico_insert(): void
    {
        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $dados = $this->dados(
            [$this->slot($agenda->id, '2026-09-01')],
            'personalizado',
            '2026-09-01',
            '2026-12-31' // ~18 semanas
        );

        $inserts = 0;
        DB::listen(function ($query) use (&$inserts) {
            if (str_contains(strtolower($query->sql), 'insert into "horarios"')) {
                $inserts++;
            }
        });

        $reserva = $this->executar($dados, $solicitante);

        $this->assertSame(1, $inserts, 'Os horarios devem ir num unico INSERT em lote.');
        $this->assertCount(18, $reserva->horarios);
    }

    public function test_payload_com_slot_repetido_nao_duplica_nem_falha(): void
    {
        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);

        $dados = $this->dados([
            $this->slot($agenda->id, '2026-09-01'),
            $this->slot($agenda->id, '2026-09-01'),
        ], 'unica', '2026-09-01', '2026-09-01');

        $reserva = $this->executar($dados, $solicitante);

        $this->assertCount(1, $reserva->horarios);
    }

    public function test_reserva_do_proprio_gestor_ja_nasce_deferida(): void
    {
        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $solicitante->id]);

        $dados = $this->dados(
            [$this->slot($agenda->id, '2026-09-01')],
            'unica',
            '2026-09-01',
            '2026-09-01'
        );

        $reserva = $this->executar($dados, $solicitante);

        $this->assertSame('deferida', $reserva->situacao);
        $this->assertSame('deferida', $reserva->horarios->first()->situacao);
    }

    public function test_reserva_com_agenda_de_terceiro_fica_parcialmente_deferida(): void
    {
        $solicitante = User::factory()->create();
        $outroGestor = User::factory()->create();

        $agendaPropria = Agenda::factory()->create(['user_id' => $solicitante->id]);
        $agendaDeTerceiro = Agenda::factory()->create(['user_id' => $outroGestor->id]);

        $dados = $this->dados([
            $this->slot($agendaPropria->id, '2026-09-01'),
            $this->slot($agendaDeTerceiro->id, '2026-09-01', '14:00:00', '16:00:00'),
        ], 'unica', '2026-09-01', '2026-09-01');

        $reserva = $this->executar($dados, $solicitante);

        $this->assertSame('parcialmente_deferida', $reserva->situacao);
        $this->assertSame(
            ['deferida', 'em_analise'],
            $reserva->horarios->sortBy('horario_inicio')->pluck('situacao')->values()->all()
        );
    }

    public function test_agenda_sem_gestor_nao_quebra_a_criacao(): void
    {
        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => null]);

        $dados = $this->dados(
            [$this->slot($agenda->id, '2026-09-01')],
            'unica',
            '2026-09-01',
            '2026-09-01'
        );

        $reserva = $this->executar($dados, $solicitante);

        $this->assertCount(1, $reserva->horarios);
        $this->assertSame('em_analise', $reserva->situacao);
    }

    public function test_criacao_auto_aprovada_grava_user_id_do_avaliador(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-01 10:00:00'));

        try {
            $solicitante = User::factory()->create();
            $agenda = Agenda::factory()->create(['user_id' => $solicitante->id]);

            $dados = $this->dados(
                [$this->slot($agenda->id, '2026-09-01')],
                'unica',
                '2026-09-01',
                '2026-09-01'
            );

            $reserva = $this->executar($dados, $solicitante);

            $this->assertSame('deferida', $reserva->situacao);
            $horario = $reserva->horarios->first();
            $this->assertNotNull($horario);
            $this->assertSame('deferida', $horario->situacao);
            $this->assertSame($solicitante->id, $horario->user_id);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_criacao_nao_auto_aprovada_deixa_user_id_nulo(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-01 10:00:00'));

        try {
            $solicitante = User::factory()->create();
            $gestor = User::factory()->create();
            $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

            $dados = $this->dados(
                [$this->slot($agenda->id, '2026-09-01')],
                'unica',
                '2026-09-01',
                '2026-09-01'
            );

            $reserva = $this->executar($dados, $solicitante);

            $this->assertSame('em_analise', $reserva->situacao);
            $horario = $reserva->horarios->first();
            $this->assertNotNull($horario);
            $this->assertSame('em_analise', $horario->situacao);
            $this->assertNull($horario->user_id);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_criacao_mista_grava_user_id_apenas_para_agendas_proprias(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-01 10:00:00'));

        try {
            $solicitante = User::factory()->create();
            $outroGestor = User::factory()->create();

            $agendaPropria = Agenda::factory()->create(['user_id' => $solicitante->id]);
            $agendaDeTerceiro = Agenda::factory()->create(['user_id' => $outroGestor->id]);

            $dados = $this->dados([
                $this->slot($agendaPropria->id, '2026-09-01'),
                $this->slot($agendaDeTerceiro->id, '2026-09-01', '14:00:00', '16:00:00'),
            ], 'unica', '2026-09-01', '2026-09-01');

            $reserva = $this->executar($dados, $solicitante);

            $this->assertSame('parcialmente_deferida', $reserva->situacao);

            $horarioProprio = $reserva->horarios->firstWhere('agenda_id', $agendaPropria->id);
            $this->assertNotNull($horarioProprio);
            $this->assertSame('deferida', $horarioProprio->situacao);
            $this->assertSame($solicitante->id, $horarioProprio->user_id);

            $horarioDeTerceiro = $reserva->horarios->firstWhere('agenda_id', $agendaDeTerceiro->id);
            $this->assertNotNull($horarioDeTerceiro);
            $this->assertSame('em_analise', $horarioDeTerceiro->situacao);
            $this->assertNull($horarioDeTerceiro->user_id);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_criacao_periodica_auto_aprovada_grava_user_id_para_todos_horarios(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-01 10:00:00'));

        try {
            $solicitante = User::factory()->create();
            $agenda = Agenda::factory()->create(['user_id' => $solicitante->id]);

            $dados = $this->dados([
                $this->slot($agenda->id, '2026-09-01'),
                $this->slot($agenda->id, '2026-09-08'),
                $this->slot($agenda->id, '2026-09-15'),
            ], '1mes', '2026-09-01', '2026-09-15');

            $reserva = $this->executar($dados, $solicitante);

            $this->assertSame('deferida', $reserva->situacao);
            foreach ($reserva->horarios as $horario) {
                $this->assertSame('deferida', $horario->situacao);
                $this->assertSame($solicitante->id, $horario->user_id);
            }
        } finally {
            Carbon::setTestNow();
        }
    }
}
