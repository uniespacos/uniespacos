<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Retenção de dados
|--------------------------------------------------------------------------
|
| Prazos provisórios (DT-11), valor final na T-12. Ajustáveis por env, sem
| alterar código. Os logs diários não têm prazo aqui: usam
| logging.channels.daily.days como fonte única.
|
*/

return [

    'jobs_falhos_dias' => env('RETENCAO_JOBS_FALHOS_DIAS', 30),

    'notificacoes_lidas_dias' => env('RETENCAO_NOTIFICACOES_LIDAS_DIAS', 90),

    'cache_dias' => env('RETENCAO_CACHE_DIAS', 7),

    'sessoes_dias' => env('RETENCAO_SESSOES_DIAS', 7),

    'tokens_redefinicao_dias' => env('RETENCAO_TOKENS_REDEFINICAO_DIAS', 1),

    'jobs_pendentes_alerta_dias' => env('RETENCAO_JOBS_PENDENTES_ALERTA_DIAS', 7),

    'logs' => [
        'diretorio' => env('RETENCAO_LOGS_DIRETORIO', storage_path('logs')),
    ],

];
