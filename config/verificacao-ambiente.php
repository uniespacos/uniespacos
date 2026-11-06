<?php

declare(strict_types=1);
use Laravel\Telescope\TelescopeServiceProvider;

/*
|--------------------------------------------------------------------------
| Verificação de ambiente (app:check-env)
|--------------------------------------------------------------------------
|
| Listas e níveis usados pelo comando de auditoria da configuração efetiva.
| Os níveis aceitos são 'falha' e 'aviso'; qualquer outro valor é tratado
| como 'falha'. A mesma lista vale para staging e produção.
|
*/

return [

    'ambientes_aceitos' => ['production', 'staging'],

    'senhas_banco_proibidas' => [
        'uniespacossecretkey',
        'postgres',
        'password',
        'secret',
        'root',
        'laravel',
        'changeme',
        '123456',
    ],

    'hosts_locais' => ['localhost', '127.0.0.1'],

    'hosts_smtp_de_desenvolvimento' => ['mailpit', 'localhost', '127.0.0.1'],

    'mailers_inseguros' => ['log', 'array'],

    'caches_inseguros' => ['array', 'null'],

    'niveis_de_log_ruidosos' => ['debug'],

    'prazos_retencao' => [
        'jobs_falhos_dias',
        'notificacoes_lidas_dias',
        'cache_dias',
        'sessoes_dias',
        'tokens_redefinicao_dias',
        'jobs_pendentes_alerta_dias',
    ],

    'limites' => [
        'bcrypt_rounds_minimos' => 12,
        'chave_bytes' => 32,
    ],

    'classes' => [
        'telescope' => TelescopeServiceProvider::class,
    ],

    'niveis' => [
        'app_debug' => 'falha',
        'app_key' => 'falha',
        'telescope_habilitado' => 'falha',
        'log_queries' => 'falha',
        'session_secure' => 'falha',
        'session_same_site' => 'falha',
        'senha_banco' => 'falha',
        'chaves_reverb' => 'falha',
        'broadcast_padrao' => 'falha',

        'app_env' => 'aviso',
        'app_url' => 'aviso',
        'nivel_de_log' => 'aviso',
        'session_encrypt' => 'aviso',
        'session_http_only' => 'aviso',
        'mail_mailer' => 'aviso',
        'mail_host_smtp' => 'aviso',
        'queue_sync' => 'aviso',
        'cache_padrao' => 'aviso',
        'bcrypt_rounds' => 'aviso',
        'telescope_instalado' => 'aviso',
        'retencao_prazos' => 'aviso',
    ],

];
