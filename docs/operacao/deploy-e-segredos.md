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
