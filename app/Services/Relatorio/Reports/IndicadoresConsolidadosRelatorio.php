<?php

declare(strict_types=1);

namespace App\Services\Relatorio\Reports;

use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\User;
use App\Repositories\EspacoRepositoryInterface;
use App\Repositories\HorarioRepositoryInterface;
use App\Repositories\ReservaRepositoryInterface;
use App\Repositories\UserRepositoryInterface;
use App\Services\Relatorio\Data\ColunaRelatorio;
use App\Services\Relatorio\Data\DadosRelatorio;
use App\Services\Relatorio\Data\FiltrosRelatorio;
use Carbon\CarbonImmutable;

final class IndicadoresConsolidadosRelatorio implements RelatorioInterface
{
    public function __construct(
        private EspacoRepositoryInterface $espacos,
        private UserRepositoryInterface $usuarios,
        private ReservaRepositoryInterface $reservas,
        private HorarioRepositoryInterface $horarios,
    ) {}

    public function gerar(User $usuario, FiltrosRelatorio $filtros): DadosRelatorio
    {
        $instituicaoId = $filtros->instituicaoId;

        $totalEspacos = $this->espacos->contarDaInstituicao($instituicaoId);
        $totalGestores = $this->usuarios->contarGestoresDaInstituicao($instituicaoId);
        $totalReservas = $this->reservas->contarDaInstituicao($instituicaoId, $filtros->dataInicio, $filtros->dataFim);
        $distribuicaoSituacoes = $this->reservas->contarPorSituacaoDaInstituicao($instituicaoId, $filtros->dataInicio, $filtros->dataFim);
        $top5Espacos = $this->horarios->rankingEspacosMaisOcupados($instituicaoId, 5);
        $top5Setores = $this->reservas->rankingSetoresDaInstituicao($instituicaoId, 5);

        $linhas = [
            ['metrica' => 'Total de Espaços', 'valor' => $totalEspacos],
            ['metrica' => 'Total de Gestores', 'valor' => $totalGestores],
            ['metrica' => 'Total de Reservas', 'valor' => $totalReservas],
        ];

        foreach ($distribuicaoSituacoes as $situacao => $count) {
            $linhas[] = [
                'metrica' => 'Reservas '.SituacaoReservaEnum::labelDe((string) $situacao),
                'valor' => $count,
            ];
        }

        $linhas[] = ['metrica' => '— Top 5 Espaços —', 'valor' => ''];

        foreach ($top5Espacos as $espaco) {
            $linhas[] = [
                'metrica' => $espaco['nome'],
                'valor' => $espaco['count'],
            ];
        }

        $linhas[] = ['metrica' => '— Top 5 Setores —', 'valor' => ''];

        foreach ($top5Setores as $setor) {
            $linhas[] = [
                'metrica' => $setor['nome'] ?? '—',
                'valor' => $setor['count'],
            ];
        }

        $colunas = [
            new ColunaRelatorio('metrica', 'Métrica', 'string', 40),
            new ColunaRelatorio('valor', 'Valor', 'string', 15),
        ];

        $sumario = [
            'Total de Espaços' => $totalEspacos,
            'Total de Gestores' => $totalGestores,
            'Total de Reservas' => $totalReservas,
        ];

        return new DadosRelatorio(
            tipo: TipoRelatorioEnum::INDICADORES_CONSOLIDADOS,
            titulo: TipoRelatorioEnum::INDICADORES_CONSOLIDADOS->titulo(),
            subtitulo: 'Visão Consolidada da Instituição',
            colunas: $colunas,
            linhas: $linhas,
            sumario: $sumario,
            filtrosAplicados: $filtros->resumo(),
            geradoPor: $usuario->name,
            geradoEm: CarbonImmutable::now(),
        );
    }
}
