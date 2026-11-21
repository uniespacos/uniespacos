<?php

declare(strict_types=1);

namespace App\Services\Relatorio\Reports;

use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Models\Espaco;
use App\Models\User;
use App\Repositories\EspacoRepositoryInterface;
use App\Services\Relatorio\Data\ColunaRelatorio;
use App\Services\Relatorio\Data\DadosRelatorio;
use App\Services\Relatorio\Data\FiltrosRelatorio;
use Carbon\CarbonImmutable;

final class InventarioEspacosRelatorio implements RelatorioInterface
{
    public function __construct(
        private EspacoRepositoryInterface $espacos,
    ) {}

    public function gerar(User $usuario, FiltrosRelatorio $filtros): DadosRelatorio
    {
        $espacos = $this->espacos->listarParaInventario(
            $filtros->agendaIds,
            $filtros->instituicaoId,
            $filtros->unidadeId,
            $filtros->moduloId,
            $filtros->andarId,
            $filtros->espacoId,
        );

        $linhas = $espacos->map(function (Espaco $espaco) {
            $gestores = $espaco->agendas
                ->pluck('user.name')
                ->unique()
                ->join(', ');

            return [
                'id' => $espaco->id,
                'nome' => $espaco->nome,
                'capacidade_pessoas' => $espaco->capacidade_pessoas,
                'unidade' => $espaco->andar->modulo->unidade->nome ?? '—',
                'modulo' => $espaco->andar->modulo->nome ?? '—',
                'andar' => $espaco->andar->nome ?? '—',
                'total_agendas' => $espaco->agendas->count(),
                'gestores' => $gestores ?: '—',
            ];
        })->toArray();

        $colunas = [
            new ColunaRelatorio('id', 'ID', 'integer', 5),
            new ColunaRelatorio('nome', 'Nome', 'string', 20),
            new ColunaRelatorio('capacidade_pessoas', 'Capacidade', 'integer', 10),
            new ColunaRelatorio('unidade', 'Unidade', 'string', 15),
            new ColunaRelatorio('modulo', 'Módulo', 'string', 15),
            new ColunaRelatorio('andar', 'Andar', 'string', 10),
            new ColunaRelatorio('total_agendas', 'Agendas', 'integer', 8),
            new ColunaRelatorio('gestores', 'Gestores', 'string', 25),
        ];

        $capacidadeTotal = $espacos->sum('capacidade_pessoas');
        $mediaCapacidade = count($linhas) > 0 ? $capacidadeTotal / count($linhas) : 0;
        $totalGestores = $espacos
            ->flatMap(fn ($e) => $e->agendas->pluck('user.id'))
            ->unique()
            ->count();

        $sumario = [
            'Total de Espaços' => count($linhas),
            'Capacidade Total' => $capacidadeTotal,
            'Média de Capacidade' => number_format($mediaCapacidade, 0),
            'Total de Gestores Únicos' => $totalGestores,
        ];

        return new DadosRelatorio(
            tipo: TipoRelatorioEnum::INVENTARIO_ESPACOS,
            titulo: TipoRelatorioEnum::INVENTARIO_ESPACOS->titulo(),
            subtitulo: '',
            colunas: $colunas,
            linhas: $linhas,
            sumario: $sumario,
            filtrosAplicados: $filtros->resumo(),
            geradoPor: $usuario->name,
            geradoEm: CarbonImmutable::now(),
        );
    }
}
