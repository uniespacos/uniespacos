<?php

declare(strict_types=1);

namespace App\Services\Relatorio\Reports;

use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\User;
use App\Services\Relatorio\Data\ColunaRelatorio;
use App\Services\Relatorio\Data\DadosRelatorio;
use App\Services\Relatorio\Data\FiltrosRelatorio;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;

final class OcupacaoEspacosRelatorio implements RelatorioInterface
{
    public function gerar(User $usuario, FiltrosRelatorio $filtros): DadosRelatorio
    {
        $inicio = $filtros->dataInicio ?? CarbonImmutable::now()->startOfMonth();
        $fim = $filtros->dataFim ?? CarbonImmutable::now()->endOfMonth();

        $query = Horario::query()
            ->where('situacao', 'deferida')
            ->whereBetween('data', [$inicio, $fim]);

        if ($filtros->agendaIds !== null) {
            $query->whereIn('agenda_id', $filtros->agendaIds);
        }

        if ($filtros->instituicaoId !== null && $filtros->agendaIds === null) {
            $query->whereHas('agenda.espaco.andar.modulo.unidade', function ($u) use ($filtros) {
                $u->where('instituicao_id', $filtros->instituicaoId);
            });
        }

        if ($filtros->turnos !== null) {
            $query->whereHas('agenda', fn ($q) => $q->whereIn('turno', $filtros->turnos));
        }
        $contagens = $query
            ->join('agendas', 'horarios.agenda_id', '=', 'agendas.id')
            ->groupBy('agendas.espaco_id')
            ->selectRaw('agendas.espaco_id as espaco_id, count(distinct (horarios.data, horarios.horario_inicio)) as total')
            ->pluck('total', 'espaco_id');

        $espacos = Espaco::query()
            ->with('andar.modulo.unidade')
            ->whereIn('id', $contagens->keys())
            ->get()
            ->keyBy('id');

        $linhas = $contagens
            ->filter(fn ($total, $espacoId) => $espacos->has($espacoId))
            ->map(function ($total, $espacoId) use ($espacos, $filtros, $inicio, $fim) {
                $espaco = $espacos->get($espacoId);

                $turnosSel = $filtros->turnos ?: ['manha', 'tarde', 'noite'];
                $slots = array_sum(array_map(
                    fn ($t) => config("relatorios.slots_por_turno.$t", 0),
                    $turnosSel
                ));
                $diasLetivos = 0;
                $periodo = CarbonPeriod::create($inicio, $fim);
                foreach ($periodo as $dia) {
                    if (! $dia->isSunday()) {
                        $diasLetivos++;
                    }
                }
                $capacidade = $diasLetivos * $slots;
                $totalOcupados = (int) $total;
                $taxaOcupacao = $capacidade > 0 ? ($totalOcupados / $capacidade) * 100 : 0;

                return [
                    'espaco_id' => $espaco->id,
                    'nome_espaco' => $espaco->nome,
                    'capacidade_pessoas' => $espaco->capacidade_pessoas,
                    'localizacao' => sprintf(
                        '%s / %s / %s',
                        $espaco->andar->nome ?? '—',
                        $espaco->andar->modulo->nome ?? '—',
                        $espaco->andar->modulo->unidade->nome ?? '—',
                    ),
                    'total_horarios_ocupados' => $totalOcupados,
                    'total_dias_no_periodo' => $diasLetivos,
                    'taxa_ocupacao' => number_format($taxaOcupacao, 2, '.', '').'%',
                    'taxa_ocupacao_num' => $taxaOcupacao,
                ];
            })
            ->values()
            ->toArray();

        $colunas = [
            new ColunaRelatorio('espaco_id', 'ID Espaço', 'integer', 8),
            new ColunaRelatorio('nome_espaco', 'Espaço', 'string', 20),
            new ColunaRelatorio('capacidade_pessoas', 'Capacidade', 'integer', 10),
            new ColunaRelatorio('localizacao', 'Localização', 'string', 25),
            new ColunaRelatorio('total_horarios_ocupados', 'Slots', 'integer', 8),
            new ColunaRelatorio('total_dias_no_periodo', 'Dias', 'integer', 6),
            new ColunaRelatorio('taxa_ocupacao', 'Taxa %', 'string', 8),
        ];

        $mediaTaxa = 0;
        if (count($linhas) > 0) {
            $totalTaxa = 0;
            foreach ($linhas as $linha) {
                $totalTaxa += (float) str_replace('%', '', $linha['taxa_ocupacao']);
            }
            $mediaTaxa = $totalTaxa / count($linhas);
        }

        $sumario = [
            'Total de Espaços' => count($linhas),
            'Média de Taxa de Ocupação' => number_format($mediaTaxa, 2).'%',
        ];

        $subtitulo = '';
        if ($filtros->dataInicio !== null && $filtros->dataFim !== null) {
            $subtitulo = "Período: {$filtros->dataInicio->format('d/m/Y')} a {$filtros->dataFim->format('d/m/Y')}";
        }

        return new DadosRelatorio(
            tipo: TipoRelatorioEnum::OCUPACAO_ESPACOS,
            titulo: TipoRelatorioEnum::OCUPACAO_ESPACOS->titulo(),
            subtitulo: $subtitulo,
            colunas: $colunas,
            linhas: $linhas,
            sumario: $sumario,
            filtrosAplicados: $filtros->resumo(),
            geradoPor: $usuario->name,
            geradoEm: CarbonImmutable::now(),
        );
    }
}
