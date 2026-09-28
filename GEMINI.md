# UniEspaços

Sistema de reserva de espaços da UESB. Laravel 12 (PHP 8.4) + Inertia 2 + React 19 + TypeScript 5.8,
Tailwind v4 (Catppuccin Theming), PostgreSQL 16, Laravel Reverb (WebSocket), tudo em Docker.

## Regras invioláveis

1. **Nunca use `RefreshDatabase` em teste.** Ele apaga o banco de desenvolvimento. Use sempre
   `DatabaseTransactions` (já é o padrão em `tests/TestCase.php`).
2. **BANIDO: `migrate:fresh`, `migrate:reset`, `db:wipe`, `cache:clear --database`.** Não rode esses
   comandos em ambiente local/desenvolvimento. Eles limpam o banco ou cache. Se um teste quebrou
   e você acha que o banco está sujo, relata ao dev; nunca limpe por conta própria.
3. **Toda Notification implementa `ShouldQueue`.** Envio síncrono trava a request.
4. **`notify()` dentro de Job sempre em `try-catch`.** Sem isso, uma falha do provedor de e-mail
   derruba a lógica central do job e dispara alerta falso de "falha" para o usuário.
5. **`REVERB_SCHEME=http` para comunicação interna** (backend → Reverb, dentro do Docker).
   HTTPS só no caminho externo (browser → Caddy → Reverb).
6. **Não commitar com trailer de co-autoria.** Os commits saem só com a autoria do dev.

## Comandos

Tudo roda dentro do container — `php artisan` no host falha porque o host `postgres` só resolve
na rede do Docker.

```bash
# Backend
docker exec uniespacos-workspace-1 php artisan <comando>
docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test
docker exec uniespacos-workspace-1 vendor/bin/pint          # lint PHP

# Frontend (rodam no host)
npx tsc --noEmit          # checagem de tipos
npx jest                  # testes de frontend
npx prettier --write <arquivo>
```

`-e APP_ENV=testing` no teste é obrigatório: sem ele o ambiente vaza e dá 419 (CSRF).

## Fluxo de trabalho

- Branch a partir de `develop`. **PR obrigatória** — há CI/CD, não existe push direto em `develop`.
- Conventional commits, mensagem em português (`fix:`, `feat:`, `perf:`, `chore:`).
- Antes de dar merge: `npx tsc --noEmit`, `npx jest` e os testes de backend precisam passar.
- **Nunca criar a PR sozinho ao terminar uma tarefa.** Deixe branch e commit prontos, rode as
  verificações, e pare — só abra a PR quando o usuário validar o trabalho e autorizar explicitamente
  a criação. Commitar/pushar a branch de trabalho é ok; `gh pr create` não.
- **A PR do `release-please` é aprovada e mergeada manualmente pelo usuário.** Não aprove, não
  aprove-e-mergeie, não faça squash/merge nela por conta própria.

## Arquitetura

- **Backend em camadas:** Controller → Service → Repository (Interface + implementação Eloquent),
  com binding no `AppServiceProvider`. Validação em `FormRequest`, autorização em Policy + Spatie.
- **Frontend em atomic design:** `resources/js/presentation/{atoms,molecules,organisms,pages,templates}`.
  Primitivos shadcn ficam em `resources/js/components/ui`.
- **Linter & Qualidade:** ESLint 9 Flat Config (`strict-type-checked`). **Tolerância Zero a Suppressions**:
  `eslint-suppressions.json` está 100% purgado; novos arquivos ou linhas alteradas nunca devem introduzir
  supressões no linter.

Detalhe de convenção mora nas skills (carregam sob demanda, não pesam no contexto):
`backend-conventions`, `frontend-conventions`, `testing-and-env`.

## Agentes

O projeto define os próprios agentes em `.agents/plugins/uniespacos/agents/`: `master` (orquestrador de sessão),
`planner`, `frontend`, `backend`, `docs`.

Cada um já declara o `model` e o `effort` adequados à sua função. **Ao delegar, não sobrescreva o
modelo** — a definição do agente prevalece (isto é uma exceção deliberada à preferência global de
usar sempre o modelo mais leve).

## Armadilhas conhecidas

- `ErrorHandlingTest > inertia request does not receive the envelope` falha localmente quando existe
  `public/build/manifest.json`. É pré-existente, não é regressão sua.
- O Vite às vezes passa a servir um módulo **vazio** (~167 bytes) depois de um arquivo ser reescrito;
  a tela quebra com `Element type is invalid`. Confirme com
  `curl -s http://localhost:5173/<caminho>.tsx | wc -c` e resolva com `touch` no arquivo.
- **`queue:work` não relê código.** O worker carrega a aplicação na memória ao subir; qualquer
  alteração em Job, Event, Notification ou nas classes que eles usam só passa a valer depois de
  `docker restart uniespacos-queue-worker-1`. O sintoma engana: o job roda, é marcado DONE e a parte
  antiga do código funciona normalmente — só o trecho novo é que nunca executa, sem erro nenhum.
  Antes de investigar comportamento assíncrono que "não acontece", compare
  `docker inspect uniespacos-queue-worker-1 --format '{{.State.StartedAt}}'` (UTC) com a data do
  commit que introduziu o código. Para broadcast, `docker logs uniespacos-reverb-1 | grep
"Broadcasting To"` mostra se o evento chegou ao Reverb, separando problema de backend de
  problema de frontend.
