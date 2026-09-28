# Central de Documentação Técnica & Arquitetural — UniEspaços

> **Sistema de Gestão e Reserva de Espaços da UESB**  
> Stack: **Laravel 12 (PHP 8.4) • React 19 • Inertia.js 2.0 • TypeScript 5.8 • Tailwind CSS v4 (Catppuccin) • PostgreSQL 16 • Laravel Reverb**

---

## 🧭 1. Visão Geral da Arquitetura Documental

A documentação técnica do UniEspaços é organizada sob o princípio de **Documentação Viva e Canônica**. Todos os contratos de interface, regras de negócio de backend, políticas de acesso, enums nativos e arquitetura de componentes estão centralizados nos documentos de domínio listados abaixo, servindo de fonte única da verdade para a equipe e para os agentes de inteligência artificial (`master`, `planner`, `frontend`, `backend`, `docs`).

---

## 📚 2. Índice da Documentação Viva de Domínio (`@docs/*.md`)

| Documento                                                              | Descrição & Escopo                                                                                                                                                                                                                                   | Quando Consultar                                                                          |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`REGRAS_INVIOLAVEIS_E_PADROES.md`](./REGRAS_INVIOLAVEIS_E_PADROES.md) | **Guia Canônico de Regras Invioláveis, Padrões e Design System:** Referência mandatória para novos prompts contendo regras de banco, Docker, theeming Catppuccin, ResponsiveModal, DataTable, contratos SSOT, PBAC e Tolerância Zero a Suppressions. | **Referência mandatória em qualquer novo prompt ou refatoração.**                         |
| [`core-workflow-report.md`](./core-workflow-report.md)                 | **Relatório Central de Arquitetura e Workflows:** Ciclo de vida completo de reservas, detecção de conflitos, avaliação por gestores, matriz de transição de status e topologia completa de componentes frontend (**Atomic Design**).                 | **Leitura obrigatória** para entendimento geral da aplicação e fluxo central de reservas. |
| [`models-business-rules.md`](./models-business-rules.md)               | **Regras de Negócio dos Models:** Mapeamento de relacionamentos Eloquent, scopes, casts nativos, campos protegidos e prevenção mandatória de N+1 via cache estático por request.                                                                     | Ao criar ou modificar Models, scopes, accessors ou consultas ao banco de dados.           |
| [`authorization-policies.md`](./authorization-policies.md)             | **Políticas de Autorização e RBAC:** Matriz de permissões Spatie, Policies do Laravel (`ReservaPolicy`, `EspacoPolicy`), prevenção contra IDOR e contratos de flags `can_update`/`can_delete`.                                                       | Antes de criar controllers, endpoints ou verificar permissões de usuário.                 |
| [`validation-rules.md`](./validation-rules.md)                         | **Regras de Validação FormRequest:** Especificação das regras customizadas de validação (`HorarioDisponivel`, `HorariosMesmoEspaco`, `HorariosValidos`), formatos e mensagens de erro.                                                               | Ao validar formulários de criação/edição de reservas, usuários, setores e espaços.        |
| [`enums-and-constants.md`](./enums-and-constants.md)                   | **Enums e Constantes Nativas:** Mapeamento exaustivo dos enums PHP (`SituacaoReservaEnum`, `ModoArquivoEnum`, `AgendaEnum`, `CampusEnum`, `ErrorCode`) e seus equivalentes TypeScript.                                                               | Para evitar _magic strings_ e garantir coerência de tipos entre backend e frontend.       |
| [`notifications-and-channels.md`](./notifications-and-channels.md)     | **Sistema de Notificações e Canais:** Arquitetura assíncrona (`ShouldQueue` universal), canais de entrega (e-mail, database, broadcast), proteção com `try-catch` em Jobs e templates.                                                               | Ao disparar novas notificações ou criar templates de alerta ao usuário.                   |
| [`realtime-websocket-channels.md`](./realtime-websocket-channels.md)   | **WebSockets e Canais em Tempo Real:** Arquitetura do Laravel Reverb (`REVERB_SCHEME=http` interno / HTTPS externo), canais privados/presence e integração com Laravel Echo no frontend.                                                             | Ao trabalhar com broadcast de eventos em tempo real ou sincronização reativa de telas.    |
| [`repositories-pattern.md`](./repositories-pattern.md)                 | **Padrão de Repositórios:** Contratos de interfaces e implementações Eloquent no `AppServiceProvider`, isolando o acesso a dados dos Domain Services.                                                                                                | Ao realizar queries complexas no banco de dados ou criar novos repositórios.              |
| [`error-handling-and-logging.md`](./error-handling-and-logging.md)     | **Tratamento de Erros e Envelope JSON:** Padrão estruturado de resposta de erro HTTP/JSON (`error_code`, `message`, `details`, `errors`) e logging contextualizado.                                                                                  | Ao tratar exceções, configurar retornos de API ou capturar falhas no cliente Inertia.     |
| [`auto-approval-rule.md`](./auto-approval-rule.md)                     | **Regra de Auto-Aprovação de Gestores:** Lógica de negócio que defere automaticamente reservas solicitadas por gestores de seus próprios espaços e suprime e-mails redundantes.                                                                      | Ao alterar o fluxo de criação de reservas ou o comportamento de avaliação.                |
| [`recorrencia-semantica.md`](./recorrencia-semantica.md)                | **Semântica de Recorrência:** Especificação dos 4 tipos de recorrência (`unica`, `15dias`, `1mes`, `personalizado`), comportamento de expansão e reclassificação de falsos positivos de auditoria.                                                    | Ao trabalhar com reservas recorrentes ou investigar expansão de horários.                 |
| [`archive-soft-delete-flow.md`](./archive-soft-delete-flow.md)         | **Fluxo de Arquivamento e Soft-Delete:** Separação estrita entre o estado de avaliação (`situacao`) e o eixo de arquivamento (`modo_arquivo`), além de cancelamento com senha.                                                                       | Ao manipular filtros de visualização de reservas ou regras de exclusão lógica.            |
| [`ROADMAP.md`](./ROADMAP.md)                                           | **Roadmap Estratégico do Produto:** Planejamento de versões (`v1.x` consolidação/modernização, `v2.x` expansão/analytics, `v3.x` inovação/PWA) e marcos entregues.                                                                                   | Para acompanhamento de metas de engenharia e planejamento de novas sprints.               |

### 🛠️ Outros Documentos Técnicos de Apoio

- [`deployment-secrets.md`](./deployment-secrets.md) — Guia de variáveis de ambiente, secrets e deploy seguro.
- [`data-model.dbml`](./data-model.dbml) — Esquema gráfico do banco de dados em formato DBML.
- [`backlog-issues.md`](./backlog-issues.md) — Backlog consolidado de débitos técnicos e melhorias identificadas.
- [`auditoria-issues-2026-08-20.md`](./auditoria-issues-2026-08-20.md) — Mapeamento histórico de issues de segurança e usabilidade.

---

## 🏛️ 3. Marcos Históricos de Auditoria e Modernização

O UniEspaços evolui por meio de ciclos contínuos de auditoria arquitetural e execução em fases atômicas.

> [!NOTE]
> Os relatórios detalhados de auditoria interna e planos de execução passo a passo (`docs/auditoria*`, `docs/plano-*`) são mantidos localmente no ambiente de desenvolvimento e governados via `.gitignore` para manter o repositório remoto limpo e focado no código-fonte. O resultado consolidado de cada ciclo é refletido de forma perene nos documentos vivos catalogados acima.

Abaixo está o registro histórico das modernizações executadas:

| Ciclo / Marco                        | Tema Principal                                    | Conclusão   | Impacto Consolidado                                                                                               |
| ------------------------------------ | ------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| **Auditoria 1 (Backend)**            | Refatoração de Controllers, Paginação e Naming    | Julho/2026  | Fim de queries diretas nos Controllers, introdução do Repository Pattern e paginação unificada.                   |
| **Auditoria 2 (Governança & RBAC)**  | Enums Nativos PHP 8.4, FormRequests e Autorização | Agosto/2026 | Eliminação de _magic strings_, adoção de Enums tipados, FormRequests estritos e blindagem contra IDOR.            |
| **Auditoria UI 1 & Execução Design** | Fundação Clean Code e Transição Shadcn UI         | Agosto/2026 | Fundação do Design System, substituição de componentes legados e estruturação em Atomic Design.                   |
| **Auditoria UI 2 & Execução Mobile** | Ergonomia Mobile-First e Theming Catppuccin       | Agosto/2026 | Implementação do `<ResponsiveModal>` (híbrido Drawer/Dialog), `<MobileBottomBar>` e suporte a temas Latte/Frappé. |
| **Execução Upgrade Stack**           | Modernização React 19, Tailwind v4 e Purga ESLint | Agosto/2026 | Migração para React 19, Tailwind v4 com LightningCSS engine e **Tolerância Zero** a supressões no ESLint 9.       |
| **Auditoria & Sincronização Docs**   | Governança Raiz, Skills, Docs Vivas e Tooling     | Agosto/2026 | Correção de fluxo de PRs para `develop`, sincronização dos agentes de IA, PHPStan Nível 9 ativo e testes limpos.  |

---

## 🧭 4. Guia Rápido de Governança para Agentes e Desenvolvedores

1. **Branching e PRs:** Todo desenvolvimento parte de `develop` e abre Pull Request exclusivamente contra `develop`. A branch `main` só recebe merges automatizados via `release-please`.
2. **Banco de Dados em Testes:** Nunca utilize `RefreshDatabase`, `migrate:fresh` ou `db:wipe`. Testes de backend utilizam exclusivamente a trait `DatabaseTransactions`.
3. **Ambiente de Execução:**
    - Comandos de backend (`php artisan`, `composer`, `pint`) rodam dentro do container Docker: `docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test`.
    - Comandos de frontend (`npx tsc --noEmit`, `npx jest`, `npm run dev`) rodam no **host**.
4. **Tolerância Zero a Suppressions:** O ESLint opera em modo estrito (`strict-type-checked`). É terminantemente proibido reintroduzir supressões no `eslint-suppressions.json` ou usar comentários `@ts-ignore` / `eslint-disable`.

---

_UniEspaços — Sistema de Gestão de Espaços da UESB_
