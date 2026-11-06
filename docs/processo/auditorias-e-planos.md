# Auditorias e planos em fases

Biblioteca de prompts para iniciativas de médio e grande porte (refatoração, recurso amplo, atualização de dependências) que precisam de diagnóstico antes do código. Use quando a mudança cruza camadas ou não cabe em uma sessão; para tarefa pequena, vá direto ao código.

Ciclo: **auditoria → plano mestre → execução por fase (sessão limpa por fase) → consolidação**. A consolidação é obrigatória, porque é ela que devolve o resultado aos documentos vivos. Backlog: [`../backlog.md`](../backlog.md) · Índice: [`../README.md`](../README.md).

## Material local (não versionado)

- `docs/auditoria*` e `docs/plano-*` estão no `.gitignore`. Auditorias, planos, instruções de fase e relatórios de execução são **material de trabalho local**: não são versionados e não entram em commit nem em PR.
- Não use `git add -f` para forçá-los.
- Convenção de nome, que casa com o `.gitignore`: `docs/auditoria-<tema>-<aaaa-mm-dd>/` e `docs/plano-<tema>/`.

## Backlog reativo

[`../backlog.md`](../backlog.md) é a fonte única do que falta fazer. Ele é atualizado **no momento em que o status de um item muda**, não em lote no fim do ciclo. Vale para qualquer agente ou pessoa que mexa no trabalho: `master`, `planner`, `backend`, `frontend`, `docs` ou o dev.

| Mudança de status | O que registrar no item |
|---|---|
| Iniciado | "Em andamento" e o nome da branch de trabalho |
| Bloqueado | o motivo e de qual decisão ou item ele depende |
| Adiado | o gatilho de retomada (um evento ou uma data), não "depois" |
| Decisão tomada | a decisão e a data; o item de decisão é fechado ou desdobrado em itens de execução |
| Concluído | o item sai da lista de pendências e entra em "Entregas recentes" com o nº da PR, na própria PR (commit logo depois de abri-la) |

Regras:

1. **Pendência nova vira item na hora.** Bug, débito ou decisão pendente descoberto durante uma tarefa entra no backlog com ID, prioridade (`P0` a `P4`), esforço (pequeno, médio ou grande) e tipo, no padrão do arquivo.
2. **Mesmo branch e mesma PR.** A atualização entra no branch/PR da mudança que alterou o status. Não se abre PR separada depois para atualizar o backlog. Isso vale também para a conclusão: assim que a PR é aberta, um commit na mesma branch marca o item como concluído e o registra em "Entregas recentes" com o número da PR. Quando ela mergeia, o backlog já está certo.
3. **Data do topo.** A linha "Atualizado em" do `backlog.md` recebe a data da alteração.
4. **Material local junto.** Se o trabalho vem de plano ou auditoria local (`docs/plano-*`, `docs/auditoria*`), o arquivo de andamento local é atualizado no mesmo momento. Esse material nunca é citado como fonte em documento versionado.
5. **Quem escreve.** O `planner` propõe os itens e os IDs que cada tarefa move. O `master` confere, antes de commitar, que o backlog reflete o status novo, e inclui os IDs no prompt de cada delegação. O `docs` aplica a alteração quando a tarefa a pede. `backend` e `frontend` não reescrevem o backlog por conta própria, salvo se a tarefa pedir: reportam os IDs afetados, o status novo e as pendências novas, e o `master` as registra. Isso evita conflito entre agentes em paralelo.
6. **Segurança sem roteiro.** Item de segurança descreve o objetivo, sem passo a passo de exploração (ver Prompt 4).
7. **Estado completo no backlog.** O item acompanha o estado completo do trabalho: status, próximos passos, passos manuais pendentes (staging e produção), verificações com data e confirmações do responsável. O material local guarda só o detalhe sensível (hashes, caminhos, comandos de servidor), e o backlog não repete esse detalhe.
8. **Atualização na hora, inclusive sem código.** Toda mudança de estado, decisão, conferência ou passo manual feito entra no backlog no momento em que acontece. Quando não há PR de código (por exemplo, uma conferência em staging), a alteração é commitada na hora numa branch de documentação acumuladora (`docs/backlog-*`), e a PR dessa branch sai **por onda** (uma PR de atualização do backlog por onda, ao fechar a parte da onda que vai para a próxima versão minor), não a cada evento: antes de um release para produção ou quando o responsável pedir. Decidido pelo responsável em 03/11/2026 e revisto em 04/11/2026 (de "por bloco" para "por onda"). Mudança de status que acompanha uma PR de código continua na própria PR (regra 2).
9. **Verificação dependente de data.** Antes de pedir uma verificação que depende de data (por exemplo, "amanhã, depois da rodada das 03:30 UTC"), quem pede confere a data atual e confirma que o dia realmente mudou. No backlog, a data da verificação é escrita por extenso (dd/mm/aaaa).
10. **Código por onda.** Todo o código de uma onda sai numa PR única para `develop`. Cada item é feito na sua branch (a partir de `develop`) e, pronto e verificado, entra por merge na branch de integração da onda (`feat/onda-N-<tema>`), sem PR própria. Só a branch de integração abre PR, quando a parte da onda que vai para a próxima versão minor fecha. No backlog, o item fica "🔧 em andamento" citando a branch de integração; ao abrir a PR da onda, um commit na própria branch marca os itens como concluídos em "Entregas recentes" com o número da PR (regra 2). A branch de integração recebe `develop` por merge sempre que `develop` mudar, para não divergir. Decidido pelo responsável em 04/11/2026.

## Prompt 1: Auditoria técnica

Use no início da iniciativa. Entrega só diagnóstico.

```markdown
# PROMPT: Auditoria técnica — {{TEMA}}

Atue como arquiteto de software sênior no UniEspaços (Laravel 12, Inertia 2, React 19, Tailwind v4, PostgreSQL 16, Reverb).

Objetivo: {{OBJETIVO}}.

1. **Código:** analise `{{DIRETORIOS}}` e identifique gargalos, duplicações, débitos e violações de arquitetura.
2. **Domínio:** leia `docs/README.md` e os documentos de domínio relacionados. Confirme o comportamento no código; não documente por suposição.
3. **Riscos:** liste o que pode quebrar em autorizações (Policies e Spatie), validações, notificações, WebSocket e integridade transacional.
4. **Referências:** consulte a documentação oficial atual de {{TECNOLOGIAS}} e traga só o que agrega ao projeto.

Entrega em `docs/auditoria-{{TEMA}}-{{AAAA-MM-DD}}/`: `README.md` (objetivo, escopo, índice, resumo executivo) e `01-diagnostico.md` a `05-roadmap.md`. Não altere código nesta etapa.
```

## Prompt 2: Plano mestre

Use depois de aprovada a auditoria. Gera a estrutura de fases.

````markdown
# PROMPT: Plano mestre — {{TEMA}}

Com base em `docs/auditoria-{{TEMA}}-{{AAAA-MM-DD}}/`, crie `docs/plano-{{TEMA}}/`:

docs/plano-{{TEMA}}/
├── README.md                          # índice, diagrama das fases, regras que não podem regredir
├── AUDITORIA_CONFORMIDADE_REGRAS.md   # regras de negócio e autorização que continuam válidas
└── fase-01-{{SLUG}}/
    ├── INSTRUCOES.md                  # modelo na seção "Modelos"
    └── RELATORIO_IMPLEMENTACAO.md     # modelo vazio

Cada `INSTRUCOES.md` traz: cabeçalho (diretório, objetivo, ganho, independência); leitura prévia (`CLAUDE.md`, skills `backend-conventions`, `frontend-conventions` e `testing-and-env` em `.claude/skills/`, domínio indicado em `docs/README.md`); tarefas `T{X}.1`, `T{X}.2`... no formato abaixo; riscos; validação (comandos do Prompt 3); critérios de aceite `[ ]`.

Formato de cada tarefa (o mesmo do agente `planner`):

```
executor: frontend | backend | docs
objetivo: <uma frase, com resultado verificável>
arquivos: <caminhos exatos>
passos:
  - <passo concreto>
pronto quando: <comando ou critério objetivo>
não fazer: <o que fica fora do escopo>
```

Ao final, entregue o pre-prompt da Fase 1 (Prompt 3).
````

## Prompt 3: Execução de uma fase

Uma fase por sessão limpa.

```markdown
# PROMPT: Execução da Fase {{N}}: {{TITULO}}

Execute a Fase {{N}} do plano `docs/plano-{{TEMA}}/`.

Leitura obrigatória: `fase-{{NN}}-{{SLUG}}/INSTRUCOES.md`, `AUDITORIA_CONFORMIDADE_REGRAS.md`, `CLAUDE.md` (regras invioláveis e comandos), skills pertinentes em `.claude/skills/` e documentos de domínio em `docs/` (índice em `docs/README.md`).

Protocolo:
1. Execute T{N}.1 a T{N}.X na ordem do `INSTRUCOES.md`. Não toque em arquivos fora do escopo.
2. Preserve autorizações (Policies e Spatie), soft delete com confirmação de senha e canais WebSocket.
3. Valide: `npx tsc --noEmit`; `npx jest` (crie ou atualize testes dos arquivos alterados); `npm run lint:check` (nunca `npm run lint`, que aplica `--fix`); `docker exec uniespacos-workspace-1 vendor/bin/pint`; `docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test`.
4. As proibições de `CLAUDE.md` valem em qualquer fase: nada de `RefreshDatabase`, `migrate:fresh`, `migrate:reset`, `db:wipe` ou `cache:clear --database`.
5. Com os testes verdes: preencha o `RELATORIO_IMPLEMENTACAO.md` da fase (local) com as alterações e a saída real dos comandos; faça commit na branch de trabalho (a partir de `develop`), em conventional commit português, sem trailer de co-autoria; não abra PR, aguarde a validação do usuário; entregue o pre-prompt da Fase {{N+1}}.
```

## Prompt 4: Consolidação (obrigatória)

Fecha o ciclo. Sem ela, o resultado fica preso no material local e as pendências se perdem.

```markdown
# PROMPT: Consolidação — {{TEMA}}

Todas as fases do plano `docs/plano-{{TEMA}}/` foram executadas. Feche o ciclo:

1. **Pendências para `docs/backlog.md`:** cada item pendente vira entrada com ID, onda, prioridade (P0 a P4), esforço (pequeno, médio ou grande) e critério de pronto.
2. **Segurança com redação pública:** o repositório é público. Descreva o objetivo do item sem roteiro de exploração: sem passo a passo, payload, nome de endpoint vulnerável ou vetor. Os detalhes ficam no material local.
3. **Regras que passaram a valer:** atualize o documento existente da área em `docs/` (`regras-de-negocio/`, `arquitetura/`, `operacao/` ou `privacidade/`). Não crie documento novo solto.
4. **Arquivar o material local fora de `docs/`:** compacte `docs/auditoria-*` e `docs/plano-*` num arquivo datado (ex.: `uniespacos-plano-{{TEMA}}-{{AAAA-MM-DD}}.tar.gz`), guarde-o fora do repositório e remova as pastas de `docs/`.
5. Confirme que `backlog.md` e os documentos da área refletem o estado final e que `git status` não mostra material local.
```

## Modelos (material local, curtos)

### `INSTRUCOES.md` de cada fase

```markdown
# Fase {{N}}: {{Título}}

> **Diretório:** `docs/plano-{{TEMA}}/fase-{{NN}}-{{SLUG}}/` · **Objetivo:** {{1 a 2 frases}} · **Independência:** {{autônoma ou depende da Fase X}}

## Tarefas
### T{{N}}.1: {{nome}}
executor: frontend | backend | docs
objetivo: {{resultado verificável}}
arquivos: {{caminhos exatos}}
passos:
  - {{passo concreto}}
pronto quando: {{comando ou critério}}
não fazer: {{fora do escopo}}

## Riscos e critérios de aceite
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
- [ ] {{critério objetivo}}
- [ ] `npx tsc --noEmit` e `npm run lint:check` sem erro
```

### `RELATORIO_IMPLEMENTACAO.md` de cada fase

```markdown
# Relatório: Fase {{N}}, {{Título}}

- **Data:** {{AAAA-MM-DD}} · **Status:** {{concluída ou parcial}}

## Alterações
- [x] T{{N}}.1: {{resumo}}

## Evidências
- `npx tsc --noEmit`: {{saída real}}
- `npx jest`: {{Test Suites / Tests}}
- `php artisan test`: {{Tests / Assertions}}

## Desvios
1. {{decisão e justificativa}}
```
