# Secrets do GitHub Actions — Staging e Produção

Levantado direto de `.github/workflows/cicd-staging.yml` e `.github/workflows/cicd-production.yml`
(GitHub → Settings → Secrets and variables → Actions). Nenhum destes valores está no repositório —
esta tabela documenta só os **nomes** esperados pelos workflows.

| Uso | Staging | Produção |
|---|---|---|
| Build do frontend (Vite) | `VITE_REVERB_APP_KEY_STAGING`, `VITE_REVERB_HOST_STAGING`, `VITE_REVERB_PORT_STAGING`, `VITE_REVERB_SCHEME_STAGING` | `VITE_REVERB_APP_KEY`, `VITE_REVERB_HOST`, `VITE_REVERB_PORT`, `VITE_REVERB_SCHEME` |
| Build da imagem Docker | `APP_NAME` | `APP_NAME`, `APP_ENV` |
| Cloudflare Access (túnel SSH) | `CF_ACCESS_CLIENT_ID_STAGING`, `CF_ACCESS_CLIENT_SECRET_STAGING` | `CF_ACCESS_CLIENT_ID_PRODUCTION`, `CF_ACCESS_CLIENT_SECRET_PRODUCTION` |
| SSH para o deploy | `SSH_HOST_STAGING`, `SSH_USER_STAGING`, `SSH_PRIVATE_KEY_STAGING` | `SSH_HOST_PRODUCTION`, `SSH_USER_PRODUCTION`, `SSH_PRIVATE_KEY_PRODUCTION` |
| Caminho remoto da aplicação | `PATH_TO_APP_FOLDER_STAGING` | `PATH_TO_APP_FOLDER_PRODUCTION` |
| Login no GHCR durante o deploy | `PAT_STAGING` | `PAT_RELEASE_PLEASE_PRODUCTION` |

`GITHUB_TOKEN` é automático (fornecido pelo próprio Actions), usado no login do GHCR durante o
`build-and-push`, não precisa ser cadastrado.

## Observações (não são bugs corrigidos aqui, é registro para quem for mexer nos secrets)

- **`APP_NAME` e `APP_ENV` (produção) não têm sufixo `_STAGING`/`_PRODUCTION`** — são os mesmos
  secrets usados (ou reaproveitados) nos dois workflows. Trocar `APP_NAME` pensando só em produção
  afeta staging também, já que é o mesmo nome de secret.
- **`PAT_RELEASE_PLEASE_PRODUCTION`** faz login no GHCR durante o deploy de produção
  (`docker login ghcr.io`), mas o nome sugere que é o token do bot do `release-please`. Pode ser
  reaproveito intencional de um PAT com escopo suficiente, ou uma confusão de nomenclatura — vale
  confirmar antes de rotacionar/revogar esse token achando que ele só serve pro release-please.
- Nenhum dos dois pipelines expõe `DB_PASSWORD`, `MAIL_PASSWORD`, `REVERB_APP_SECRET`, `APP_KEY` etc.
  como secret do GitHub — esses vivem só no `.env` real dentro do servidor (staging/produção), lido
  via `source .env` no passo de deploy. O que os workflows carregam como secret é só o necessário
  para o **build** (chaves públicas do Reverb para o Vite) e para **conectar** no servidor (SSH,
  Cloudflare Access, GHCR).

---

## Workflow de aquecimento de cache (`cache-warmup.yml`)

Arquivo: `.github/workflows/cache-warmup.yml`. Não faz deploy nem usa segredos. Popula, na branch base, o cache de dependências que as PRs reaproveitam.

### Gatilhos

| Evento | Condição |
|---|---|
| `push` em `develop` ou `main` | Só quando mudam `package-lock.json`, `composer.lock`, algum arquivo em `.github/actions/**` ou o próprio `cache-warmup.yml` |
| `workflow_dispatch` | Execução manual |

### Por que existe

O cache do GitHub Actions é isolado por ref: uma PR só enxerga cache salvo na própria PR, na branch base (`develop` ou `main`) ou na branch padrão. Sem este workflow, nada rodava em push para `develop`, e cada PR nova começava com cache frio, com cerca de 50s só no `npm ci`.

### Jobs

Os dois jobs usam as actions compostas de `.github/actions/` com `lookup-only: 'true'`:

| Job | Action | Chave do cache |
|---|---|---|
| `⚛️ node_modules` | `setup-node-deps` | `node-modules-{SO}-node{versão}-{hash de package-lock.json}` |
| `🐘 vendor` | `setup-php-deps` (com `composer-flags: --no-scripts`) | `vendor-{SO}-php{versão}-{hash de composer.lock}` |

| Situação | Comportamento |
|---|---|
| Cache hit | O job só confere a chave. O passo de instalação é pulado e o job termina em segundos. |
| Cache miss | O passo de instalação roda normalmente (`npm ci` ou `composer install`). |

Os workflows de PR e de deploy (`tests.yml`, `lint-static-analysis.yml`, `cicd-staging.yml` e `cicd-production.yml`) usam as mesmas actions sem `lookup-only`. Eles restauram o cache salvo por este workflow.

### Cuidados

- A chave de `node_modules` inclui SO e versão do Node, porque os binários nativos (esbuild, rollup, lightningcss etc.) são por plataforma.
- Não há `restore-keys` de propósito: um `node_modules` parcial de outro lock é pior que instalar do zero.
- O `concurrency` cancela a execução anterior do mesmo ref.

---

## Agendador de produção (`agendador:executar`)

O serviço `scheduler` do `compose.prod.yml` roda `php artisan agendador:executar`, que substitui o `schedule:work`. O comando dispara `schedule:run` a cada minuto. Em SIGTERM ou SIGINT, não dispara rodada nova, espera as rodadas em curso (até 100 s, por `--teto-parada`) e sai com código 0. O serviço tem `stop_grace_period: 2m`. Logs e detalhes da parada em [`arquitetura/erros-e-logs.md`](../arquitetura/erros-e-logs.md) (seção "Agendador com parada limpa").

> **Risco de rollback (T-19d).** O compose novo chama `agendador:executar`, que só existe na imagem nova. Imagem antiga com este compose faz o `scheduler` entrar em loop de restart. Imagem nova com compose antigo funciona, porque o compose antigo usa `schedule:work`. Por isso, o rollback reverte imagem e compose juntos.

- Verificação em staging: pendente (T-19d). A linha correspondente está na tabela de verificações do [backlog](../backlog.md).
- Desenvolvimento: `compose.dev.yml` segue com `schedule:work`. O comando novo não é exercitado localmente (OP-02 no backlog).

---

## Verificação da configuração (`app:check-env`)

O comando `app:check-env` audita a configuração efetiva e mostra `OK`, `AVISO` ou `FALHA` por checagem, com o motivo. Ele não imprime valores. É manual: não roda no deploy, no entrypoint nem no workflow (a chamada como aviso no deploy é a T-35b).

```bash
# Desenvolvimento
docker exec uniespacos-workspace-1 php artisan app:check-env

# Produção (no servidor, container da aplicação)
docker exec app-production php artisan app:check-env

# Sai com código 1 se houver alguma FALHA
docker exec app-production php artisan app:check-env --estrito
```

- Sem `--estrito`, o comando sempre sai com 0. Com `--estrito`, sai com 1 se houver `FALHA`.
- No desenvolvimento, `senha_banco` acusa `FALHA` porque o `.env` usa a senha de exemplo. É o esperado.
- Os valores da configuração de produção ainda não foram lidos; a lista de checagens é calibrada na T-08 (ver o [backlog](../backlog.md)).
- Antes de rodar o [`base:anonimizar`](./anonimizacao-de-bases.md), confira o ambiente com este comando.
