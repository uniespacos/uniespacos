# Pontos de partida — UniEspaços

Mapa do que **já foi observado** ao preparar esta skill (data-base: 2026-10-31) e inventário inicial.
**Nada aqui é achado final.** São hipóteses com evidência parcial: a auditoria deve reconfirmar cada
uma (o código muda) e preencher o que falta. Se divergir do código atual, o código vence — corrija
este arquivo.

> **Reconferido em 2026-10-31** pela auditoria `docs/auditoria-lgpd-2026-10-31/` (commit `3941603`; a pasta é
> ignorada pelo git). Divergências corrigidas abaixo estão marcadas com ✎. A próxima auditoria parte daquela,
> não só deste mapa.

## 1. Inventário inicial de dados pessoais

| Dado | Origem (coleta) | Onde mora (retenção) | Cópias/derivados a procurar |
|---|---|---|---|
| `users.name`, `email`, `telefone` | cadastro (`CreateNewUser`), perfil (`UpdateUserProfileInformation`), admin (`InstitucionalUsuarioController@store`) | tabela `users` (Postgres) | Inertia shared props, `notifications.data`, e-mails (SMTP), relatórios (`solicitante`, `geradoPor`), logs, Telescope, `failed_jobs`/`jobs`, broadcast, dumps `.sql` |
| `users.profile_pic` | upload (`ProfileController`) | arquivo em `storage/app/public/avatars` (disco `public`) + caminho no banco | URL pública sem autenticação; cache de navegador/CDN; backup do storage |
| `users.password`, `remember_token`, `two_factor_*` | cadastro/2FA | `users` (hash/segredo; `$hidden`) | dumps; sessão |
| `sessions.ip_address`, `user_agent`, `user_id` | cada login (driver `database`) | tabela `sessions` | dumps; Telescope |
| IP e `user_id` em exceções | `ExceptionContext::build` | arquivo de log | rotação/retenção do log |
| `reservas` (quem, quando, finalidade, descrição livre), `horarios` (`user_id` = avaliador), `agendas` | uso do sistema | tabelas homônimas | notificações, relatórios CSV/XLSX/PDF, cache de conflito, broadcast `Espaco.{id}` |
| `espaco_user` (favoritos) | uso | tabela | — |
| `notifications` (`titulo`, `descricao`, `url`) | `BaseNotification::toArray` | tabela `notifications` (database channel) | broadcast Reverb; e-mail; shared prop `notifications` (últimas 15, em **toda** página) |
| Papéis/permissões (Spatie) | admin | `model_has_roles`, `model_has_permissions` | shared props (`roles`, `permissions`) — dado sobre a pessoa |
| `telescope_entries` | Telescope (se habilitado) | tabela | requisições, queries, e-mails e notificações inteiros |
| Dumps | operação | `backup-production_13-07-2026.sql`, `backup-16-08-2026.sql` na raiz | ver §2-1 |

**Dado sensível por desenho:** nenhuma coluna sensível óbvia (saúde, raça, religião, biometria). **Mas**
descrição livre de reserva e nome de evento podem revelar convicção religiosa, política ou sindical por
inferência (evento de culto, ato de sindicato, reunião partidária). Tratar como risco de coleta/inferência
sensível, não ignorar.

**Titulares prováveis:** servidores (docentes, técnicos), discentes, gestores de setor, administradores
institucionais; possivelmente menores de idade, se o cadastro é aberto (`Features::registration()` ligado).

## 2. Hipóteses a confirmar (ordem sugerida de verificação)

Cada item traz a evidência já vista e o que falta provar.

1. **Dumps de dados reais na raiz do repositório** — `backup-production_13-07-2026.sql` (~18 MB) e
   `backup-16-08-2026.sql` (~25 MB). `.gitignore:24` (`*.sql`) os mantém fora do git e `git log` não
   mostra commit deles, **mas continuam no disco**. Falta: conteúdo é produção real? quem tem a cópia?
   entram na imagem Docker (`.dockerignore` existe; conferir se exclui `*.sql`)? estão em sincronização de nuvem/backup de máquina? existe
   cofre e criptografia? **Candidato a S1.** Inspecionar só esquema.
   Idem `docs/plano-estabilizacao-v1.backup-2026-10-10.zip`: confirmar o conteúdo (listar nomes, não extrair dado).
   ✎ Confirmado (A-01): os dois dumps têm dados (`users` com 407 e 454 linhas) e o `.dockerignore` não exclui
   `*.sql`. O zip contém só os 45 arquivos `.md` do plano, sem dado.
2. **Nenhum aviso de privacidade / encarregado / base legal no produto** — grep por
   `lgpd|privacidade|privacy|termos|encarregado|consentimento` em `routes`, `resources/js/presentation`,
   `resources/js/pages`, `lang`, `app` não retornou nada. Falta: confirmar em `resources/views` e no site da UESB
   (pode existir fora do app). Se confirmado: R07 (informação insuficiente), art. 23 I e II.
3. **Telefone obrigatório no cadastro** — `CreateNewUser` valida `phone` como `required`; coluna `telefone`
   é `NOT NULL`. Falta: qual finalidade? É lido em algum fluxo (contato do solicitante pelo gestor)? Se
   não for, R06 (coleção excessiva); se for, documentar a finalidade.
4. **Serialização ampla de `User`** — `HandleInertiaRequests::formatAuthUser` faz `array_merge($user->toArray(), …)`
   e `UserService::getIndexData`/`getPermissionContext` idem para listas/modal. Isso envia ao navegador
   **toda** coluna não oculta. Falta: listar o JSON real de cada página e comparar com o que a UI usa; ver
   se a lista de usuários de um setor/instituição expõe `telefone`/`email` a papéis que não precisam.
   ✎ A listagem de usuários já usa `select` explícito (`UserRepositoryEloquent::getPaginatedForAdminByInstituicao`).
   Os pontos que ainda serializam `User` inteiro estão no A-14 da auditoria (inclui `formatAuthUser`, que carrega
   **todas** as notificações não lidas em toda página).
5. **Foto de perfil em disco público** — `ProfileController` grava em `store('avatars','public')`;
   `config/filesystems.php` define `public` com `visibility => public`. Falta: nome do arquivo é imprevisível?
   o arquivo é apagado na exclusão do usuário (`UserService::delete` → `destroy`)? há validação de MIME/tamanho?
   ✎ Nome aleatório (`store()`) e validação `image|max:2048` existem; o arquivo **não** é apagado na exclusão e o
   EXIF não é removido (A-19).
6. **Exclusão de usuário é física e não limpa derivados** — `UserService::delete` apenas chama
   `repoUser->destroy($user->id)`. Falta: FKs (`reservas`, `horarios`, `agendas`, `espaco_user`) com
   `cascade`/`restrict`/`set null`? órgão precisa reter histórico? avatar, notificações e sessões são removidos?
   Tensão real entre art. 18 IV e art. 16 I; **decisão de retenção é jurídica**.
7. **Retenção ilimitada por omissão** — `.env.example`: `LOG_STACK=single` (um arquivo, sem rotação) e
   `LOG_LEVEL=debug`; `notifications`, `sessions`, `failed_jobs`, `telescope_entries` sem rotina de limpeza
   evidente. Falta: `routes/console.php`/scheduler (`prune`, `queue:prune-failed`, `telescope:prune`,
   `LOG_DAILY_DAYS`); valores efetivos em produção.
8. **Sessão não cifrada em `.env.example`** — `SESSION_ENCRYPT=false` sobrepõe o default `true` de
   `config/session.php`. Falta: valor efetivo em produção (`docs/deployment-secrets.md`/compose prod).
9. **Telescope redige só `_token`** — `TelescopeServiceProvider`: `hideRequestParameters(['_token'])` e
   `Telescope::filter(fn => true)`; `TELESCOPE_ENABLED` default `false`. Falta: está ligado em algum
   ambiente com dado real? gate de acesso? `prune`? (CLAUDE.md registra vazamento de Telescope em
   `reverb-1` e `queue-worker-1`.) Se ligado: senha/e-mail/telefone ficam em `telescope_entries`.
   ✎ Corrigido: além de `_token`, oculta os headers `cookie`, `x-csrf-token` e `x-xsrf-token`, e o próprio
   Telescope oculta `password`/`password_confirmation` por padrão (não `current_password`). Só é registrado com
   `APP_ENV=development` e é `require-dev` (a imagem de produção usa `--no-dev`): **não existe em produção**. O
   risco real é o Telescope de dev sobre cópia de produção (A-02: 1.489 entradas de 28–29/08/2026).
10. **Canal de broadcast do espaço aberto a qualquer autenticado** — `routes/channels.php` autoriza
    `App.Models.Espaco.{id}` com `Espaco::query()->whereKey($id)->exists()` (Opção A, deliberada; a Opção B,
    por permissão, está comentada). Qualquer usuário logado assina o canal de qualquer espaço. Falta:
    o que o evento (`ReservaEvent` e afins) transmite nesse canal — se houver nome do solicitante, descrição
    ou outro dado pessoal de reserva, ele chega a quem não tem relação com o espaço (R01/R10, necessidade).
    Se só trafegarem IDs/horários, registre como controle adequado.
    ✎ Resolvido: `ReservaEvent::broadcastWith` só leva `action`, `reservaId`, `espacoId` e `horariosCount`
    (controle adequado, CP-05). Restam o canal público `reserva-channel` (só IDs) e `allowed_origins` `*` (A-28).
11. **Cabeçalhos de segurança incompletos** — `docker/production/nginx/default.ssl.conf` mostra
    `Strict-Transport-Security` e `X-Frame-Options`; não apareceram CSP, `X-Content-Type-Options`,
    `Referrer-Policy`. Falta: conferir também o Caddy citado no `CLAUDE.md` (borda externa).
    ✎ Corrigido: o nginx de `docker/production/nginx/` é residual e não roda. A borda real é o Caddy
    (`docker/production/caddy/Caddyfile`, imagem `web` do `compose.prod.yml`), que não tem **nenhuma** diretiva
    `header` — nem HSTS (A-20).
12. **Notificação carrega texto livre indefinidamente** — `BaseNotification::toArray` grava `descricao` em
    `notifications.data`; `HandleInertiaRequests` entrega as 15 mais recentes em toda página. Falta: o
    que cada Notification põe em `descricao` (nome do solicitante? justificativa da reserva?) e por
    quanto tempo fica gravado.
13. **Relatórios exportam nome de pessoa** — `ReservasPeriodoRelatorio` inclui `solicitante`; todos incluem
    `geradoPor`. Falta: quem pode gerar/baixar, escopo por instituição/setor (permissões `relatorios.escopo-instituicao` e `relatorios.escopo-agendas`),
    se o arquivo gerado fica armazenado em disco (retenção) e se há marca/aviso de confidencialidade.
14. **Decisões automatizadas** — `AutoAprovacaoService` e `ConflictDetectionService`. Falta: afetam a
    pessoa (aprovação/negativa) sem revisão humana? critério documentado (`auto-approval-rule.md`) e
    contestável? (art. 20).
15. **Senhas de seed** — `database/seeders/Development/UserSeeder.php` usa senha trivial. Falta: garantir
    que não executa em produção.
16. **Operadores não mapeados** — SMTP (`MAIL_USERNAME=uniespacos@gmail.com` indica Gmail/Google como
    provedor em algum ambiente), hospedagem/VPS, backup, DNS/CDN. Falta: lista oficial, contrato, país
    dos servidores (transferência internacional, art. 33 — fora do guia).
17. ✎ **Novos na reconferência de 2026-10-31** (detalhe na auditoria): o banco de dev é cópia de produção, com
    Telescope, log com SQL (`DB::listen` sob `APP_ENV=development`) e Mailpit (A-02); `pg_dump` em texto puro a
    cada deploy, sem rotação (A-07); B55 — log de verificação com cookie de sessão (A-03); nenhum institucional ou
    gestor com 2FA (A-10); nome de terceiros em `notifications.data` e `horarios.justificativa` (A-13); scheduler
    vazio e sem serviço em produção (A-06); repositório **público** no GitHub (sem dado versionado).

## 3. Controles positivos já vistos (registrar na auditoria, com reconfirmação)

- `User::$hidden` cobre `password`, `remember_token`, `two_factor_secret`, `two_factor_recovery_codes`.
- Senha com cast `hashed`; `Hash::make` no cadastro.
- `ExceptionContext` **exclui o corpo da requisição** do log de exceções de propósito, com justificativa
  escrita (senha trafega em texto em `ConfirmPasswordRequest`).
- 2FA disponível via Fortify (`Features::twoFactorAuthentication`); verificação de e-mail ativa.
- Autorização em camadas (Policy + Spatie PBAC, `authorization-policies.md`), escopo por instituição/setor.
- ✎ TLS no Caddy (o HSTS do nginx não vale: o nginx é residual); `SESSION_SECURE_COOKIE=true`, `SameSite=lax`;
  `APP_DEBUG=false` no `.env.example`.
- Notificações sempre em fila (`ShouldQueue`), `notify()` em `try-catch` nos Jobs.
- Telescope desligado por padrão (`TELESCOPE_ENABLED=false`).
- `*.sql` no `.gitignore` (impede commit; **não** resolve a presença no disco).
- `docs/error-handling-and-logging.md` e `docs/authorization-policies.md` existem como base documental.

## 4. Documentos do repositório úteis à auditoria

`docs/data-model.dbml` (modelo de dados), `docs/models-business-rules.md`, `docs/authorization-policies.md`,
`docs/notifications-and-channels.md`, `docs/realtime-websocket-channels.md`, `docs/error-handling-and-logging.md`,
`docs/archive-soft-delete-flow.md`, `docs/conflict-cache-contract.md`, `docs/deployment-secrets.md`,
`docs/auto-approval-rule.md`, `erd/`. Existem também auditorias anteriores
(`docs/auditoria-areas-foco/`, `docs/auditoria-debitos-tecnicos-2026-09/`): **use o mesmo formato** e
procure sobreposição antes de abrir achado duplicado (ex.: Telescope, broadcast, permissões).
