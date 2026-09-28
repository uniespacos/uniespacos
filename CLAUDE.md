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
  Tolerância zero a novas supressões. Débito existente (medido em 2026-09-01, reconferido em
  2026-09-02): 92 supressões em 43 arquivos no `eslint-suppressions.json`, mais 9 ocorrências
  inline. Verificação pura: `npm run lint:check` (nunca `npm run lint`, que aplica `--fix` e altera
  o código-fonte). Débito: `npm run lint:debt`.

Detalhe de convenção mora nas skills (carregam sob demanda, não pesam no contexto):
`backend-conventions`, `frontend-conventions`, `testing-and-env`.

## Agentes

O projeto define os próprios agentes em `.agents/plugins/uniespacos/agents/` (espelhados em `.claude/agents/`):
`master` (orquestrador de sessão), `planner`, `frontend`, `backend`, `docs`.

Cada um já declara o `model` e o `effort` adequados à sua função. **Ao delegar, não sobrescreva o
modelo** — a definição do agente prevalece (isto é uma exceção deliberada à preferência global de
usar sempre o modelo mais leve).

## Armadilhas conhecidas

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
- **Ambiente local muito lento (requisições 1-8s, "Queued" minutos no Network tab).** Causas conjugadas:
  (1) Xdebug em modo pesado (`coverage`+`profile`) em toda requisição real — diagnóstico:
  `docker exec uniespacos-app-1 php -i | grep xdebug.mode` (esperado: `develop,debug` apenas);
  fix permanente: rebuild da imagem (já corrigido em `docker/development/php-fpm/Dockerfile`, ARG
  `XDEBUG_MODE` e `clear_env=no` adicionado). (2) Pool PHP-FPM subdimensionado (`pm.max_children=5`
  em máquina de 12 núcleos) — diagnóstico: `docker exec uniespacos-app-1 grep -nE "^pm"
/usr/local/etc/php-fpm.d/www.conf`; fix permanente: rebuild (já corrigido, `pm.max_children`
  5→20, `pm.start_servers` 2→4, `pm.min_spare_servers` 1→2, `pm.max_spare_servers` 3→8).
  (3) Telescope vazado em `reverb-1` e `queue-worker-1` mesmo com `TELESCOPE_ENABLED=false` — eles
  carregam config ao boot e mantêm em memória; diagnóstico: `docker exec uniespacos-workspace-1
tail -f storage/logs/laravel.log | grep telescope_entries`; fix ao vivo: `docker restart
  uniespacos-queue-worker-1 uniespacos-reverb-1`. (4) Cold-start pesado (`entrypoint.sh` faz
  `chown -R /var/www` e `*:clear` em cada boot, bind mount Windows↔WSL2 é lento) — esperado após
  restart: 8s → 6s → 3s → 0.25s conforme OPcache aquece; não é regressão. (5) **Regra prática no
  frontend:** `prefetch={['mount', 'hover']}` em `<Link>` dentro de `.map()` dispara visita
  completa de página em background pra cada item da lista; use `prefetch="hover"` nesses casos.
- **Container Reverb parado causa falhas intermitentes na suíte backend.** O conjunto de testes que
  falha **muda entre execuções**, e o nome do teste nunca menciona Reverb — parece bug de regra de
  negócio. Sintomas vistos: `ReservaArquivamentoTest > cancelar reserva ativa continua notificando`
  e `ValidateReservationConflictsJobTest` esperando `'completed'` e recebendo `'failed'`. Raiz:
  `uniespacos-reverb-1` fora do ar faz o broadcast lançar `BroadcastException: Pusher error: cURL
  error 6: Could not resolve host: reverb`, o que derruba o job. Diagnóstico:
  `docker ps -a --format '{{.Names}}\t{{.Status}}' | grep uniespacos` (procure `Exited`). Resolução:
  `docker start uniespacos-reverb-1` e confirme a resolução de nome — não só o container de pé —
  com `docker exec uniespacos-workspace-1 getent hosts reverb`.
