# Auditorias e planos em fases

Biblioteca de prompts para iniciativas de médio e grande porte (refatoração, recurso amplo, atualização de dependências) que precisam de diagnóstico antes do código. Use quando a mudança cruza camadas ou não cabe em uma sessão; para tarefa pequena, vá direto ao código.

Ciclo: **auditoria → plano mestre → execução por fase (sessão limpa por fase) → consolidação**. A consolidação é obrigatória, porque é ela que devolve o resultado aos documentos vivos. Backlog: [`../backlog.md`](../backlog.md) · Índice: [`../README.md`](../README.md).

## Material local (não versionado)

- `docs/auditoria*` e `docs/plano-*` estão no `.gitignore`. Auditorias, planos, instruções de fase e relatórios de execução são **material de trabalho local**: não são versionados e não entram em commit nem em PR.
- Não use `git add -f` para forçá-los.
- Convenção de nome, que casa com o `.gitignore`: `docs/auditoria-<tema>-<aaaa-mm-dd>/` e `docs/plano-<tema>/`.

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
