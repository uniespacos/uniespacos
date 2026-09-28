---
name: git-workflow
description: Branching strategy, conventional commits, e fluxo de PR no UniEspaços. Carregue ao iniciar tarefa de código ou mergear PR.
---

# Git Workflow — UniEspaços

## Branching Strategy

**Regra inviolável:** Branches SEMPRE a partir de `develop`, NUNCA a partir de `main`.

- **`main`** → Produção (protegido, sem push direto)
- **`develop`** → Linha de desenvolvimento principal
- **Feature branches** → Sempre `git checkout -b <nome> origin/develop`

**Se alguém pedir "cria branch da main":** Redirecione para `develop`.

**Nunca faça merge em main** — é via release-please automático.

---

## Conventional Commits

Mensagens em **português**, formato: `<tipo>: <descrição concisa>`

Tipos comuns:
- `feat:` — Nova funcionalidade
- `fix:` — Correção de bug
- `perf:` — Otimização
- `chore:` — Refatoração pura, atualização de deps, config

**Exemplo:**
```
feat: adicionar validação de conflito de horários
fix: corrigir N+1 em listagem de usuários
perf: cache de permissões por request
```

**Regra:** Sem trailer de co-autoria. Os commits saem só com autoria do dev.

---

## Fluxo de Pull Request

### Criação da PR

**Nunca criar a PR sozinho ao terminar a tarefa.** Pipeline é:

1. **Commit e push** da feature branch em `develop` ✅
2. **Rode verificações:**
   ```bash
   npx tsc --noEmit              # frontend
   npx jest                       # frontend
   docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test  # backend
   ```
3. **Reporte ao master:** "Branch X commitada e pushada. Validações: [resultado]"
4. **Aguarde permissão explícita do usuário:** "OK, cria a PR"
5. **Master cria PR com `gh pr create`** e retorna URL

### Após merge (Automático)

1. **Release-please** dispara automaticamente
2. Cria PR de versioning (changelog, bump de versão)
3. **Usuário aprova manualmente** (nunca aprove/mergeie isso automático)
4. Release-please faz o merge e tagueia

**Importante:** Release-please PR é sempre manual — não mexa nela sem permissão explícita.

---

## Validação antes de push

Antes de considerar a tarefa "pronta", rode:

**Frontend:**
```bash
npx tsc --noEmit           # tipos TypeScript
npx eslint <arquivo>       # linting (type-aware)
npx jest <arquivo>         # testes (se houver)
```

**Backend:**
```bash
docker exec uniespacos-workspace-1 vendor/bin/pint --test        # lint
docker exec uniespacos-workspace-1 composer analyse              # PHPStan
docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test --filter=<relacionado>
```

**Nenhuma validação pode falhar** antes de chamar o usuário para revisar.

---

## Rebase vs. Merge

Prefira **rebase** se a feature branch for curta (1-2 commits):
```bash
git rebase develop
git push --force-with-lease
```

Para branches longas com múltiplos commits, prefira **merge commit**:
```bash
git merge --no-ff develop -m "feat: ..."
git push
```

Squash só se o usuário pedir explicitamente.

---

## Se algo quebrou (pré-existente vs. meu)

**Distinguir:**
- Falha em `npx tsc` ou `npx jest` → Rode `git stash` e repita. Se passa limpo, foi você.
- Falha em artisan test → Teste no CLAUDE.md (`known-pitfalls` skill) — pode ser pré-existente (ErrorHandlingTest, queue não recarregado).
- Vite servindo vazio → Ver `known-pitfalls`, é Vite, não código.

**Quando realmente foi você:** Corrija, recomite, rode validação novamente.

**Quando é pré-existente:** Documente no report ao master — "X falha, mas é conhecida em [motivo]".

