<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Retenção de dados
|--------------------------------------------------------------------------
|
| Prazo de guarda de 90 dias para todas as categorias (decisão de 08/11/2026,
| F-03, e de 14/11/2026). Tokens de redefinição de senha (1 dia) e alerta de
| jobs pendentes (7 dias) são prazos técnicos, não prazo de guarda. Todos são
| ajustáveis por env, sem alterar código. Os logs diários seguem usando
| logging.channels.daily.days como fonte única.
|
*/

return [

    'jobs_falhos_dias' => env('RETENCAO_JOBS_FALHOS_DIAS', 90),

    'notificacoes_lidas_dias' => env('RETENCAO_NOTIFICACOES_LIDAS_DIAS', 90),

    'cache_dias' => env('RETENCAO_CACHE_DIAS', 90),

    'sessoes_dias' => env('RETENCAO_SESSOES_DIAS', 90),

    'tokens_redefinicao_dias' => env('RETENCAO_TOKENS_REDEFINICAO_DIAS', 1),

    'jobs_pendentes_alerta_dias' => env('RETENCAO_JOBS_PENDENTES_ALERTA_DIAS', 7),

    'jobs_pendentes_dias' => env('RETENCAO_JOBS_PENDENTES_DIAS', 90),

    'logs' => [
        'diretorio' => env('RETENCAO_LOGS_DIRETORIO', storage_path('logs')),
    ],

];
