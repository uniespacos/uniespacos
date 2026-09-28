<?php

declare(strict_types=1);

use App\Services\Relatorio\Reports\IndicadoresConsolidadosRelatorio;
use App\Services\Relatorio\Reports\InventarioEspacosRelatorio;
use App\Services\Relatorio\Reports\OcupacaoEspacosRelatorio;
use App\Services\Relatorio\Reports\ReservasPeriodoRelatorio;

return [
    'tipos' => [
        'reservas_periodo' => ReservasPeriodoRelatorio::class,
        'ocupacao_espacos' => OcupacaoEspacosRelatorio::class,
        'inventario_espacos' => InventarioEspacosRelatorio::class,
        'indicadores_consolidados' => IndicadoresConsolidadosRelatorio::class,
    ],
    'limites' => [
        'max_linhas_csv_xlsx' => 10_000,
    ],
    'cache_ttl' => (int) env('RELATORIOS_CACHE_TTL', 1800),
    'pdf' => [
        'orientacao_padrao' => 'portrait',
        'tamanho' => 'A4',
        'max_linhas_amostra' => 30,
        'cor_primaria' => '#0284c7',
    ],
    'csv' => [
        'delimiter' => ';',
        'use_bom' => true,
    ],
    'slots_por_turno' => [
        'manha' => 6,
        'tarde' => 6,
        'noite' => 5,
    ],
];
