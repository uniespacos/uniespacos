<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Anonimização de base não produtiva
|--------------------------------------------------------------------------
|
| Usado por `base:anonimizar`. Toda tabela de `Schema::getTables()` precisa
| estar em exatamente um dos grupos abaixo: `tratadas`, `apagar` ou
| `sem_dado_pessoal`. Tabela nova sem classificação quebra
| AnonimizacaoCoberturaDeTabelasTest.
|
*/

return [

    'ambientes_permitidos' => ['local', 'development', 'staging', 'testing'],

    'textos' => [
        'neutro' => 'Texto anonimizado.',
        'telefone' => '(00) 00000-0000',
    ],

    'arquivos' => [
        'disco' => 'public',
        'diretorio' => 'avatars',
    ],

    'revisao_manual' => [
        storage_path('logs'),
        storage_path('backups'),
    ],

    'tratadas' => [
        'users' => 'name, email, telefone, profile_pic, password, remember_token e two_factor_* tratados; id, setor_id, papéis e email_verified_at preservados; contas da exclusão de conta puladas',
        'reservas' => 'titulo, descricao, observacao e conflict_cache tratados',
        'horarios' => 'justificativa tratada',
        'espacos' => 'descricao (texto livre de gestor) tratada; nome e imagens são institucionais',
        'roles' => 'description (texto livre administrativo) tratada; name preservado',
    ],

    'apagar' => [
        'password_reset_tokens' => 'email',
        'sessions' => 'id',
        'notifications' => 'id',
        'jobs' => 'id',
        'failed_jobs' => 'id',
        'job_batches' => 'id',
        'cache' => 'key',
        'cache_locks' => 'key',
        'espaco_user' => null,
        'telescope_entries' => 'sequence',
        'telescope_entries_tags' => null,
        'telescope_monitoring' => 'tag',
    ],

    'sem_dado_pessoal' => [
        'agendas' => 'vínculo de gestor por user_id, sem texto livre',
        'andars' => 'nome e tipo_acesso institucionais',
        'instituicaos' => 'nome, sigla e endereço institucionais',
        'migrations' => 'controle interno do Laravel',
        'model_has_permissions' => 'vínculo por id com permissões do Spatie',
        'model_has_roles' => 'vínculo por id com papéis do Spatie',
        'modulos' => 'nome institucional',
        'permissions' => 'catálogo de permissões do Spatie',
        'role_has_permissions' => 'vínculo papel-permissão do Spatie',
        'setors' => 'nome e sigla institucionais',
        'unidades' => 'nome e sigla institucionais',
    ],

];
