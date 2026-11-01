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
