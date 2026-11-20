<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\Agenda;
use App\Services\ExpansaoHorariosService;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use PHPUnit\Framework\TestCase;

/**
 * Regra de expansao isolada — sem banco, sem container.
 */
class ExpansaoHorariosServiceTest extends TestCase
{
    private ExpansaoHorariosService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ExpansaoHorariosService;
    }

    /**
     * @param  array<int, int>  $ids
     * @return Collection<int, Agenda>
     */
    private function agendas(array $ids = [1]): Collection
    {
        return collect($ids)
            ->mapWithKeys(fn (int $id) => [$id => (new Agenda)->forceFill(['id' => $id])]);
    }

    /**
     * @return array<string, mixed>
     */
    private function slot(string $data, string $inicio = '08:00:00', string $fim = '10:00:00', int $agendaId = 1): array
    {
        return [
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'agenda_id' => $agendaId,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $linhas
     * @return array<int, string>
     */
    private function datas(array $linhas): array
    {
        return array_values(array_map(fn (array $l) => $l['data'], $linhas));
    }

    public function test_unica_grava_exatamente_as_datas_enviadas_sem_expandir(): void
    {
        // 3 slots na semana 1 e 2 na semana 3, pulando a semana 2.
        $slots = [
            $this->slot('2026-09-01'),
            $this->slot('2026-09-02', '14:00:00', '16:00:00'),
            $this->slot('2026-09-03', '10:00:00', '12:00:00'),
            $this->slot('2026-09-17'),
            $this->slot('2026-09-18', '14:00:00', '16:00:00'),
        ];

        [$linhas] = $this->service->montar(
            $slots, $this->agendas(), 'unica', Carbon::parse('2026-09-18'), 7, fn () => 'em_analise'
        );

        $this->assertCount(5, $linhas);
        $this->assertSame(
            ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-17', '2026-09-18'],
            $this->datas($linhas),
            'Nenhuma data da semana intermediaria pode ser inventada.'
        );
    }

    public function test_unica_deduplica_slot_repetido_no_payload(): void
    {
        $slots = [$this->slot('2026-09-01'), $this->slot('2026-09-01')];

        [$linhas] = $this->service->montar(
            $slots, $this->agendas(), 'unica', Carbon::parse('2026-09-07'), 7, fn () => 'em_analise'
        );

        $this->assertCount(1, $linhas);
    }

    public function test_periodica_repete_uma_vez_por_semana_ate_data_final(): void
    {
        // O payload chega redundante (uma entrada por semana) — e exatamente
        // isso que a versao antiga expandia de novo, gerando 4+3+2+1 = 10.
        $slots = [
            $this->slot('2026-09-01'),
            $this->slot('2026-09-08'),
            $this->slot('2026-09-15'),
            $this->slot('2026-09-22'),
        ];

        [$linhas] = $this->service->montar(
            $slots, $this->agendas(), '1mes', Carbon::parse('2026-09-28'), 7, fn () => 'em_analise'
        );

        $this->assertCount(4, $linhas);
        $this->assertSame(
            ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'],
            $this->datas($linhas)
        );
    }

    public function test_periodica_ancora_cada_padrao_na_propria_data_e_nao_em_data_inicial(): void
    {
        // Quarta 02/09 e segunda 14/09. Ancorar na data_inicial da reserva
        // (02/09) faria a segunda comecar em 07/09 — data nunca selecionada.
        $slots = [
            $this->slot('2026-09-02'),
            $this->slot('2026-09-14'),
        ];

        [$linhas] = $this->service->montar(
            $slots, $this->agendas(), '1mes', Carbon::parse('2026-09-28'), 7, fn () => 'em_analise'
        );

        $datas = $this->datas($linhas);

        $this->assertNotContains('2026-09-07', $datas, 'A segunda 07/09 nao foi selecionada e nao pode aparecer.');
        $this->assertSame(
            ['2026-09-02', '2026-09-09', '2026-09-16', '2026-09-23', '2026-09-14', '2026-09-21', '2026-09-28'],
            $datas
        );
    }

    public function test_padroes_distintos_nao_se_cruzam(): void
    {
        // Mesmo dia da semana, intervalos diferentes: sao dois padroes.
        $slots = [
            $this->slot('2026-09-01', '08:00:00', '10:00:00'),
            $this->slot('2026-09-01', '14:00:00', '16:00:00'),
        ];

        [$linhas] = $this->service->montar(
            $slots, $this->agendas(), '15dias', Carbon::parse('2026-09-15'), 7, fn () => 'em_analise'
        );

        $this->assertCount(6, $linhas);
        $this->assertSame(
            ['08:00:00', '08:00:00', '08:00:00', '14:00:00', '14:00:00', '14:00:00'],
            array_column($linhas, 'horario_inicio')
        );
    }

    public function test_slot_de_agenda_desconhecida_e_ignorado_sem_estourar(): void
    {
        $slots = [$this->slot('2026-09-01', agendaId: 1), $this->slot('2026-09-01', agendaId: 99)];

        [$linhas, $agendasUsadas] = $this->service->montar(
            $slots, $this->agendas([1]), 'unica', Carbon::parse('2026-09-07'), 7, fn () => 'em_analise'
        );

        $this->assertCount(1, $linhas);
        $this->assertCount(1, $agendasUsadas);
    }

    public function test_agenda_id_aceito_pela_regra_integer_encontra_a_agenda_em_qualquer_formato(): void
    {
        // A regra `integer` do FormRequest aceita int, string numérica e float de valor inteiro.
        foreach (['unica', 'periodica'] as $recorrencia) {
            foreach ([1, '1', 1.0] as $agendaId) {
                $slot = $this->slot('2026-09-01');
                $slot['agenda_id'] = $agendaId;

                [$linhas] = $this->service->montar(
                    [$slot], $this->agendas([1]), $recorrencia, Carbon::parse('2026-09-07'), 7, fn () => 'em_analise'
                );

                $this->assertCount(1, $linhas, sprintf('%s com agenda_id %s', $recorrencia, var_export($agendaId, true)));
            }
        }
    }

    public function test_todas_as_linhas_tem_o_mesmo_conjunto_de_chaves(): void
    {
        // Requisito do insert em lote: as colunas saem da primeira linha.
        $slots = [$this->slot('2026-09-01'), $this->slot('2026-09-02', '14:00:00', '16:00:00')];

        [$linhas] = $this->service->montar(
            $slots, $this->agendas(), '1mes', Carbon::parse('2026-09-15'), 7, fn () => 'em_analise'
        );

        $esperado = ['data', 'horario_inicio', 'horario_fim', 'agenda_id', 'reserva_id', 'situacao', 'justificativa', 'user_id', 'created_at', 'updated_at'];

        $this->assertNotEmpty($linhas);
        foreach ($linhas as $linha) {
            $this->assertSame($esperado, array_keys($linha));
        }
    }

    public function test_situacao_vem_do_resolvedor_recebendo_a_agenda(): void
    {
        $slots = [$this->slot('2026-09-01', agendaId: 1), $this->slot('2026-09-01', agendaId: 2)];

        [$linhas] = $this->service->montar(
            $slots,
            $this->agendas([1, 2]),
            'unica',
            Carbon::parse('2026-09-07'),
            7,
            fn (Agenda $agenda) => $agenda->id === 1 ? 'deferida' : 'em_analise'
        );

        $this->assertSame(['deferida', 'em_analise'], array_column($linhas, 'situacao'));
    }

    public function test_payload_vazio_nao_gera_linhas(): void
    {
        [$linhas, $agendas] = $this->service->montar(
            [], $this->agendas(), '1mes', Carbon::parse('2026-09-28'), 7, fn () => 'em_analise'
        );

        $this->assertSame([], $linhas);
        $this->assertCount(0, $agendas);
    }

    public function test_personalizado_expande_semanalmente_ate_data_final(): void
    {
        // Blindagem da Fase 05: 'personalizado' = periodo customizado pelo
        // usuario, mas com a MESMA semantica semanal de '15dias'/'1mes' -- nao
        // e selecao livre de datas avulsas (H1 da auditoria foi reclassificada
        // como falso positivo; ver docs/regras-de-negocio/recorrencia.md).
        $slots = [
            $this->slot('2026-09-01', '10:00:00', '11:00:00'), // terca
            $this->slot('2026-09-03', '14:00:00', '15:00:00'), // quinta
        ];

        [$linhas] = $this->service->montar(
            $slots, $this->agendas(), 'personalizado', Carbon::parse('2026-09-30'), 7, fn () => 'em_analise'
        );

        $datas = $this->datas($linhas);
        $tercas = array_filter($datas, fn (string $d) => Carbon::parse($d)->dayOfWeek === Carbon::TUESDAY);
        $quintas = array_filter($datas, fn (string $d) => Carbon::parse($d)->dayOfWeek === Carbon::THURSDAY);

        $this->assertCount(9, $linhas, 'Deve gerar 9 horarios (5 tercas + 4 quintas) ate 30/09.');
        $this->assertCount(5, $tercas, 'Tercas: 01, 08, 15, 22, 29.');
        $this->assertCount(4, $quintas, 'Quintas: 03, 10, 17, 24 (proxima seria 01/10, fora do periodo).');

        foreach ($datas as $data) {
            $this->assertLessThanOrEqual('2026-09-30', $data, 'Nenhum horario pode ultrapassar data_final.');
        }
    }

    public function test_unica_e_personalizado_preservam_semanas_e_turnos_distintos_sem_duplicar(): void
    {
        $slots = [
            $this->slot('2026-09-01', '08:20:00', '09:10:00', agendaId: 1),
            $this->slot('2026-09-10', '14:00:00', '14:50:00', agendaId: 2),
            $this->slot('2026-09-15', '08:20:00', '09:10:00', agendaId: 1),
        ];
        $agendas = $this->agendas([1, 2]);

        [$linhasUnica, $agendasUnica] = $this->service->montar(
            $slots,
            $agendas,
            'unica',
            Carbon::parse('2026-09-15'),
            7,
            fn () => 'em_analise'
        );

        $this->assertCount(3, $linhasUnica);
        $this->assertCount(2, $agendasUnica);

        [$linhasPersonalizado] = $this->service->montar(
            $slots,
            $agendas,
            'personalizado',
            Carbon::parse('2026-09-17'),
            7,
            fn () => 'em_analise'
        );

        $chaves = array_map(
            fn (array $linha): string => implode('|', [$linha['agenda_id'], $linha['data'], $linha['horario_inicio']]),
            $linhasPersonalizado
        );

        $this->assertSame(count($chaves), count(array_unique($chaves)), 'Nao deve gerar linhas duplicadas ao expandir semanas distintas no mesmo dia da semana.');
        $this->assertCount(5, $linhasPersonalizado, 'Tercas 01, 08, 15 (sem duplicar 15) + quintas 10, 17.');
    }

    public function test_periodica_respeita_selecao_explicita_em_semana_futura_sem_sobrescrever(): void
    {
        $slots = [
            $this->slot('2026-11-15', '18:20:00', '19:10:00'),
            $this->slot('2026-11-15', '19:10:00', '20:00:00'),
            $this->slot('2026-11-15', '20:00:00', '20:50:00'),
            $this->slot('2026-11-20', '18:20:00', '19:10:00'),
            $this->slot('2026-11-21', '19:10:00', '20:00:00'),
            $this->slot('2026-11-22', '19:10:00', '20:00:00'),
        ];

        [$linhas] = $this->service->montar(
            $slots,
            $this->agendas(),
            '15dias',
            Carbon::parse('2026-11-29'),
            7,
            fn () => 'em_analise'
        );

        $porData = [];
        foreach ($linhas as $linha) {
            $porData[$linha['data']][] = $linha['horario_inicio'];
        }
        foreach ($porData as &$horarios) {
            sort($horarios);
        }
        unset($horarios);

        $this->assertSame(['18:20:00', '19:10:00', '20:00:00'], $porData['2026-11-15'] ?? []);
        $this->assertSame(['19:10:00'], $porData['2026-11-22'] ?? [], 'Domingo 22/11 selecionado explicitamente nao deve receber os outros horarios de 15/11.');
        $this->assertSame(['19:10:00'], $porData['2026-11-29'] ?? [], 'Domingo 29/11 deve replicar apenas o padrao mais recente selecionado em 22/11.');
        $this->assertSame(['18:20:00'], $porData['2026-11-20'] ?? []);
        $this->assertSame(['18:20:00'], $porData['2026-11-27'] ?? []);
        $this->assertSame(['19:10:00'], $porData['2026-11-21'] ?? []);
        $this->assertSame(['19:10:00'], $porData['2026-11-28'] ?? []);
        $this->assertCount(9, $linhas);
    }

    public function test_datas_expandidas_para_slot_1mes_expande_ate_data_final(): void
    {
        $slot = $this->slot('2026-09-01', '10:00:00', '11:00:00');
        $datas = $this->service->datasExpandidasParaSlot($slot, [$slot], '1mes', '2026-10-01');

        $this->assertSame(
            ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'],
            $datas
        );
    }

    public function test_datas_expandidas_para_slot_para_antes_de_selecao_explicita_futura(): void
    {
        $slotSemana1 = $this->slot('2026-11-15', '18:20:00', '19:10:00');
        $slotSemana2 = $this->slot('2026-11-22', '19:10:00', '20:00:00');
        $todos = [$slotSemana1, $slotSemana2];

        $this->assertSame(
            ['2026-11-15'],
            $this->service->datasExpandidasParaSlot($slotSemana1, $todos, '15dias', '2026-11-29')
        );
        $this->assertSame(
            ['2026-11-22', '2026-11-29'],
            $this->service->datasExpandidasParaSlot($slotSemana2, $todos, '15dias', '2026-11-29')
        );
    }

    public function test_datas_expandidas_para_slot_unica_retorna_apenas_propria_data(): void
    {
        $slot = $this->slot('2026-09-01', '10:00:00', '11:00:00');
        $datas = $this->service->datasExpandidasParaSlot($slot, [$slot], 'unica', '2026-10-01');

        $this->assertSame(['2026-09-01'], $datas);
    }
}
