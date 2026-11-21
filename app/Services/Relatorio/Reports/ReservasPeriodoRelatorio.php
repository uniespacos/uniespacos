<?php

declare(strict_types=1);

namespace App\Services\Relatorio\Reports;

use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Reserva;
use App\Models\User;
use App\Repositories\ReservaRepositoryInterface;
use App\Services\Relatorio\Data\ColunaRelatorio;
use App\Services\Relatorio\Data\DadosRelatorio;
use App\Services\Relatorio\Data\FiltrosRelatorio;
use Carbon\CarbonImmutable;

final class ReservasPeriodoRelatorio implements RelatorioInterface
{
    public function __construct(
        private ReservaRepositoryInterface $reservas,
    ) {}

    public function gerar(User $usuario, FiltrosRelatorio $filtros): DadosRelatorio
    {
        $reservas = $this->reservas->listarParaRelatorioDePeriodo(
            $filtros->dataInicio,
            $filtros->dataFim,
            $filtros->situacoes,
            $filtros->agendaIds,
            $filtros->turnos,
            $filtros->instituicaoId,
        );

        $linhas = $reservas->map(fn (Reserva $r) => [
            'id' => $r->id,
            'titulo' => $r->titulo,
            'solicitante' => $r->user->name ?? '—',
            'data_inicial' => CarbonImmutable::parse($r->data_inicial)->setTimezone('America/Bahia')->format('d/m/Y H:i'),
            'data_final' => CarbonImmutable::parse($r->data_final)->setTimezone('America/Bahia')->format('d/m/Y H:i'),
            'situacao' => SituacaoReservaEnum::labelDe($r->situacao),
            'recorrencia' => $r->recorrencia ?? '—',
            'total_slots' => (int) $r->getAttribute('horarios_count'),
        ])->toArray();

        $colunas = [
            new ColunaRelatorio('id', 'ID', 'integer', 5),
            new ColunaRelatorio('titulo', 'Título', 'string', 20),
            new ColunaRelatorio('solicitante', 'Solicitante', 'string', 15),
            new ColunaRelatorio('data_inicial', 'Data Inicial', 'datetime', 12),
            new ColunaRelatorio('data_final', 'Data Final', 'datetime', 12),
            new ColunaRelatorio('situacao', 'Situação', 'string', 12),
            new ColunaRelatorio('recorrencia', 'Recorrência', 'string', 10),
            new ColunaRelatorio('total_slots', 'Slots', 'integer', 5),
        ];

        $sumario = [
            'Total de Reservas' => count($linhas),
            'Deferidas' => $reservas->where('situacao', SituacaoReservaEnum::DEFERIDA->value)->count(),
            'Indeferidas' => $reservas->where('situacao', SituacaoReservaEnum::INDEFERIDA->value)->count(),
            'Em Análise' => $reservas->where('situacao', SituacaoReservaEnum::EM_ANALISE->value)->count(),
        ];

        $subtitulo = '';
        if ($filtros->dataInicio !== null && $filtros->dataFim !== null) {
            $subtitulo = "Período: {$filtros->dataInicio->format('d/m/Y')} a {$filtros->dataFim->format('d/m/Y')}";
        }

        return new DadosRelatorio(
            tipo: TipoRelatorioEnum::RESERVAS_PERIODO,
            titulo: TipoRelatorioEnum::RESERVAS_PERIODO->titulo(),
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
