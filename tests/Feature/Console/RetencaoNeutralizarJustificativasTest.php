<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Models\Horario;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RetencaoNeutralizarJustificativasTest extends TestCase
{
    use DatabaseTransactions;

    private const TEXTO_NEUTRO = 'Conflito com outra reserva deferida neste horário.';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-02 12:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_troca_o_texto_antigo_com_titulo_e_nome_pelo_neutro_em_pt_br(): void
    {
        $ids = [
            $this->criarHorario("Conflito com a reserva 'Reunião da Congregação' de Maria Silva.")->id,
            $this->criarHorario("Conflito com a reserva 'Aula de Física' de João O'Neil.")->id,
            $this->criarHorario("Conflito com a reserva 'Sala 1.2' de .")->id,
        ];

        $this->artisan('retencao:neutralizar-justificativas')
            ->expectsOutputToContain('[justificativas_conflito] 3 neutralizadas.')
            ->assertExitCode(0);

        foreach ($ids as $id) {
            $this->assertSame(self::TEXTO_NEUTRO, $this->justificativa($id));
        }
    }

    public function test_motivos_digitados_e_textos_parecidos_permanecem_intactos(): void
    {
        $motivos = [
            'Conflito com a reserva A',
            'conflito com a reserva \'Sala\' de Maria.',
            'Conflito com outra reserva.',
            "Conflito com a reserva 'Sala' de Maria",
            "Conflito com a reserva 'Sala' de Maria. Favor reavaliar.",
            "Conflito com a reserva 'Sala' de Maria, verificar.",
            'Motivo digitado pelo gestor.',
            self::TEXTO_NEUTRO,
        ];

        $ids = array_map(fn (string $motivo): int => $this->criarHorario($motivo)->id, $motivos);

        $this->artisan('retencao:neutralizar-justificativas')
            ->expectsOutputToContain('[justificativas_conflito] 0 neutralizadas.')
            ->assertExitCode(0);

        foreach ($ids as $indice => $id) {
            $this->assertSame($motivos[$indice], $this->justificativa($id));
        }
    }

    public function test_justificativa_nula_permanece_nula(): void
    {
        $horario = $this->criarHorario(null);

        $this->artisan('retencao:neutralizar-justificativas')->assertExitCode(0);

        $this->assertNull($this->justificativa($horario->id));
    }

    public function test_dry_run_conta_sem_alterar_nada(): void
    {
        $ids = [
            $this->criarHorario("Conflito com a reserva 'Sala' de Maria Silva.")->id,
            $this->criarHorario("Conflito com a reserva 'Lab' de Ana Souza.")->id,
        ];

        $this->artisan('retencao:neutralizar-justificativas', ['--dry-run' => true])
            ->expectsOutputToContain('Simulação: nenhuma justificativa será alterada.')
            ->expectsOutputToContain('[justificativas_conflito] 2 seriam neutralizadas.')
            ->assertExitCode(0);

        $this->assertSame("Conflito com a reserva 'Sala' de Maria Silva.", $this->justificativa($ids[0]));
        $this->assertSame("Conflito com a reserva 'Lab' de Ana Souza.", $this->justificativa($ids[1]));
    }

    public function test_rodar_duas_vezes_e_idempotente(): void
    {
        $id = $this->criarHorario("Conflito com a reserva 'Sala' de Maria Silva.")->id;

        $this->artisan('retencao:neutralizar-justificativas')
            ->expectsOutputToContain('[justificativas_conflito] 1 neutralizadas.')
            ->assertExitCode(0);

        $this->artisan('retencao:neutralizar-justificativas')
            ->expectsOutputToContain('[justificativas_conflito] 0 neutralizadas.')
            ->assertExitCode(0);

        $this->assertSame(self::TEXTO_NEUTRO, $this->justificativa($id));
    }

    public function test_nao_altera_updated_at_nem_as_outras_colunas(): void
    {
        $horario = $this->criarHorario("Conflito com a reserva 'Sala' de Maria Silva.", 'indeferida');
        DB::table('horarios')->where('id', $horario->id)->update(['updated_at' => '2026-01-01 10:00:00']);
        $antes = DB::table('horarios')->where('id', $horario->id)->first();

        $this->artisan('retencao:neutralizar-justificativas')->assertExitCode(0);

        $depois = DB::table('horarios')->where('id', $horario->id)->first();

        $this->assertSame(self::TEXTO_NEUTRO, $depois->justificativa);
        $this->assertSame('2026-01-01 10:00:00', $depois->updated_at);
        $this->assertSame($antes->situacao, $depois->situacao);
        $this->assertSame($antes->user_id, $depois->user_id);
        $this->assertSame($antes->horario_inicio, $depois->horario_inicio);
        $this->assertSame($antes->data, $depois->data);
    }

    public function test_processa_todos_os_lotes_sem_repetir_nem_pular(): void
    {
        $base = Horario::factory()->create(['justificativa' => null]);
        $data = Carbon::parse('2030-01-01');
        $total = 1205;

        $linhas = [];

        for ($i = 0; $i < $total; $i++) {
            $linhas[] = [
                'agenda_id' => $base->agenda_id,
                'reserva_id' => $base->reserva_id,
                'horario_inicio' => '08:00:00',
                'horario_fim' => '09:00:00',
                'data' => $data->copy()->addDays($i)->toDateString(),
                'situacao' => 'indeferida',
                'justificativa' => "Conflito com a reserva 'Sala {$i}' de Maria Silva.",
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        foreach (array_chunk($linhas, 500) as $lote) {
            DB::table('horarios')->insert($lote);
        }

        $this->artisan('retencao:neutralizar-justificativas')
            ->expectsOutputToContain("[justificativas_conflito] {$total} neutralizadas.")
            ->assertExitCode(0);

        $this->assertSame(
            $total,
            DB::table('horarios')->where('justificativa', self::TEXTO_NEUTRO)->count(),
        );
    }

    private function criarHorario(?string $justificativa, string $situacao = 'indeferida'): Horario
    {
        return Horario::factory()->create([
            'justificativa' => $justificativa,
            'situacao' => $situacao,
        ]);
    }

    private function justificativa(int $id): ?string
    {
        $valor = DB::table('horarios')->where('id', $id)->value('justificativa');

        return is_string($valor) ? $valor : null;
    }
}
