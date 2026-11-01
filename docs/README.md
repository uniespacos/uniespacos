# Documentação do UniEspaços

Sistema de reserva de espaços da UESB. Esta pasta é a fonte de verdade sobre o que a aplicação faz, como ela é construída e o que falta fazer. Cada assunto tem um documento dono; os outros apontam para ele em vez de repetir.

## Por onde começar

| Quero saber | Leia |
| --- | --- |
| O que falta fazer e em que ordem | [`backlog.md`](./backlog.md) |
| Para onde o produto vai (v2 e depois) | [`roadmap.md`](./roadmap.md) |
| Como uma reserva funciona de ponta a ponta | [`regras-de-negocio/fluxo-de-reservas.md`](./regras-de-negocio/fluxo-de-reservas.md) |
| Regras invioláveis, comandos, fluxo de PR e armadilhas do ambiente | [`CLAUDE.md`](../CLAUDE.md), na raiz do repositório |
| Convenções de código (backend, frontend, testes, git) | skills em [`.claude/skills/`](../.claude/skills/) |

## Mapa

### Regras de negócio — `regras-de-negocio/`

| Documento | Assunto |
| --- | --- |
| [`fluxo-de-reservas.md`](./regras-de-negocio/fluxo-de-reservas.md) | Ciclo de vida da reserva: criação, avaliação, status agregado, cascata de revalidação de conflitos e cancelamento. |
| [`autorizacao.md`](./regras-de-negocio/autorizacao.md) | Papéis e permissões (Spatie), policies, prevenção de IDOR, flags `can_*`, escopo dos relatórios, visibilidade de dados pessoais e limites de taxa. |
| [`validacao.md`](./regras-de-negocio/validacao.md) | FormRequests e regras customizadas (`HorarioDisponivel`, `HorariosMesmoEspaco`), incluindo a regra de sobreposição de horários e as datas. |
| [`auto-aprovacao.md`](./regras-de-negocio/auto-aprovacao.md) | Auto-aprovação de reservas feitas por gestores das próprias agendas e supressão de e-mails redundantes. |
| [`recorrencia.md`](./regras-de-negocio/recorrencia.md) | Tipos de recorrência (`unica`, `15dias`, `1mes`, `personalizado`) e expansão de horários. |
| [`arquivamento.md`](./regras-de-negocio/arquivamento.md) | Situação da avaliação × eixo de arquivamento (`arquivo`: ativas, arquivadas, todas), cancelamento e anonimização de conta. |
| [`cache-de-conflitos.md`](./regras-de-negocio/cache-de-conflitos.md) | Contrato do snapshot `conflict_cache` e da revalidação de conflitos. |
| [`relatorios.md`](./regras-de-negocio/relatorios.md) | Tipos de relatório, formatos de exportação, escopo e cache. |

### Arquitetura — `arquitetura/`

| Documento | Assunto |
| --- | --- |
| [`modelos-eloquent.md`](./arquitetura/modelos-eloquent.md) | Relacionamentos, scopes, casts, accessors com cache por request, prevenção de N+1 e payloads mínimos. |
| [`enums-e-constantes.md`](./arquitetura/enums-e-constantes.md) | Enums PHP e seus equivalentes TypeScript. |
| [`repositorios.md`](./arquitetura/repositorios.md) | Padrão Repository: interfaces, implementações Eloquent e binding no `AppServiceProvider`. |
| [`notificacoes.md`](./arquitetura/notificacoes.md) | Notificações por e-mail, banco e broadcast; fila, retentativas e rodapé LGPD dos e-mails. |
| [`tempo-real.md`](./arquitetura/tempo-real.md) | Laravel Reverb: canais privados, eventos e integração com o Echo. |
| [`erros-e-logs.md`](./arquitetura/erros-e-logs.md) | Envelope de erro JSON e logs com contexto sanitizado. |
| [`modelo-de-dados.dbml`](./arquitetura/modelo-de-dados.dbml) | Esquema do banco em DBML. |

### Operação — `operacao/`

| Documento | Assunto |
| --- | --- |
| [`deploy-e-segredos.md`](./operacao/deploy-e-segredos.md) | Variáveis de ambiente, segredos do CI/CD e deploy. |

### Privacidade — `privacidade/`

| Documento | Assunto |
| --- | --- |
| [`pagina-de-privacidade.md`](./privacidade/pagina-de-privacidade.md) | Página pública `/privacidade`: flag, textos, versão, vigência e links no cadastro, nos rodapés e nos e-mails. |

O inventário de dados e o runbook de incidente entram nesta pasta quando forem aprovados (T-14 e T-16 no backlog).

### Processo — `processo/`

| Documento | Assunto |
| --- | --- |
| [`auditorias-e-planos.md`](./processo/auditorias-e-planos.md) | Como conduzir uma auditoria e um plano em fases, e como fechar o ciclo no backlog. |

### Material acadêmico — `UniEspaço Web/`

Documentação da disciplina que originou o projeto (2023–2024): diagramas, protótipos de tela, planos de escopo e de requisitos. Fica como está até a conferência de dados pessoais nesses arquivos (F-14 no backlog); depois disso, deve ganhar um nome no padrão abaixo.

## Convenções desta pasta

- **Nome de arquivo:** português, minúsculas, palavras separadas por hífen, sem acento, sem data e sem número de versão. Só `README.md` fica em maiúsculas. Exemplo: `regras-de-negocio/cache-de-conflitos.md`.
- **Uma pasta por área:** `regras-de-negocio/`, `arquitetura/`, `operacao/`, `privacidade/` e `processo/`. O planejamento (`backlog.md` e `roadmap.md`) fica na raiz de `docs/`.
- **Documento novo só se o assunto não couber num existente.** Ao criar, mover ou renomear, atualize este índice e as tabelas de documentos dos agentes (`.claude/agents/` e o espelho em `.agents/plugins/uniespacos/agents/`).
- **Documento descreve o código atual.** Intenção, plano e pendência vão para o [`backlog.md`](./backlog.md).
- **Idioma:** português do Brasil.
- **Repositório público:** pendência de segurança é descrita pelo objetivo, sem detalhe de exploração.

## Auditorias e planos locais

Auditorias e planos de execução são material de trabalho e ficam fora do git: `docs/auditoria*` e `docs/plano-*` estão no `.gitignore`. Ao fechar um ciclo:

1. o que falta entra no [`backlog.md`](./backlog.md);
2. as regras que passaram a valer entram no documento da área;
3. o material local é arquivado fora de `docs/`.

Detalhe em [`processo/auditorias-e-planos.md`](./processo/auditorias-e-planos.md).
