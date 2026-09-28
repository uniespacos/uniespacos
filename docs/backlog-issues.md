# Fila de Issues — Acompanhamento

A partir da auditoria em [`auditoria-issues-2026-08-20.md`](./auditoria-issues-2026-08-20.md).
Atualizado a cada entrega.

**Última atualização:** 2026-08-23 · develop em `854bf76` · limpeza de issues no GitHub (comentários de fechamento, reabertura de #41)

---

## ✅ Concluídas

- [x] **Revogar `reservas.deletar` do institucional** `P3` · `effort: small`
      Branch `fix/remove-admin-reserva-deletar`
      Segunda parte da revisão de regra de negócio iniciada no #260 (ver PR da branch irmã `fix/remove-admin-reserva-atualizar`): admin (`institucional`) é gestão institucional geral, não gerencia reservas de terceiros — nem editando, nem cancelando. Migration `2026_08_23_155138_revoke_reservas_deletar_from_institucional.php` revoga (não deleta) a permissão do role, mesma razão técnica da tarefa irmã: `ReservaPolicy::delete()` chama `hasPermissionTo('reservas.deletar')` incondicionalmente para todo usuário, deletar a permissão quebraria o cancelamento para todo mundo. `RoleSeeder` corrigido para não reatribuir a permissão a cada seed. Admin agora cancela apenas a própria reserva, como um usuário comum.
      _3 testes novos (`ReservaCancelamentoAdminTest`) · 176 testes passando · 1 falha pré-existente isolada (ErrorHandlingTest, não relacionada)_

- [x] **#119 — IDOR em detalhes/edição de reserva** `P0`
      Branch `fix/idor-reserva-authorization` → PR #253 → merged `4a59670`
      Regressão de um fix anterior (`725d76f` corrigiu, `214c437` removeu no refactor). Achados extras: vazamento de PII (email/telefone) e escalada de privilégio no `GestorReservaController::update`. Inclui página de erro Inertia (fatia da #112).
      _9 testes de regressão · baseline 6 falhas → 9 passando_

- [x] **#222 — Link de notificação abre semana errada** `P1`
      Branch `fix/222-semana-reserva-notificacao` → PR #256 → merged `3b62a3e`
      Corrigido no `show()` e não nas Notifications, porque a URL fica gravada na tabela `notifications` — assim o histórico já enviado também é consertado. Helper `resolveDataAncora` unificou o padrão em 3 pontos.
      _8 testes · baseline 5 falhas → 8 passando_

- [x] **#101 — Ordem dos gestores por turno no admin** `P1`
      Branch `fix/101-ordem-gestores-turno` → PR #258 → merged `4374bcd`
      Espelhou o padrão do `GerenciarGestoresDialog` (enumerar turnos fixos) em vez de só ordenar, atendendo ao "mesmo que o turno esteja vazio". Extraiu `TURNOS_ORDENADOS`/`TURNO_LABEL` eliminando 3 cópias da ordem.
      _6 testes de componente · baseline 5 falhas → 6 passando_

- [x] **#105 — Exibir espaço e módulo na lista de reservas** `P2`
      Branch `fix/105-modulo-lista-reservas` → PR #261 → merged `4cd67ea` · issue fechada
      Cadeia `andar.modulo` adicionada ao eager loading dos dois repositórios. No `getPaginatedForGestor`, que usa selects por coluna, foi preciso incluir `andar_id`/`modulo_id` — sem as chaves estrangeiras a relação aninhada volta `null` sem erro. Extraído o componente `LocalReserva`.
      _3 testes de payload + 4 de componente · baseline 3 falhas → 7 passando_

- [x] **#112 — Tratamento de erros e logging padronizados** `P2`
      Branch `fix/112-tratamento-erros-api` → PR #263 → merged `a504887` · ⚠️ **issue ainda OPEN no GitHub**
      A premissa da issue não batia com o código: não existe `routes/api.php`, e os únicos endpoints JSON vivos são os 4 de relatórios. Envelope feito **aditivo** (`error_code`/`details` ao lado de `message`/`errors`), porque `use-gerar-relatorio.ts` lê `data.message` na raiz e o `useForm` do Inertia depende do bag `errors` — mover qualquer um dos dois quebraria em silêncio.
      Decisão de segurança: a issue pedia "request data" no log, mas o app trafega senha em texto plano (`ConfirmPasswordRequest`, no cancelamento de reserva). O payload ficou **fora** do contexto, travado por teste.
      Achado de bug: `phpunit.xml` definia `APP_ENV=testing` sem `force="true"`, então o `.env` do container de dev vencia e **a suíte nunca rodou em env `testing`** — o bypass da página de erro da #119 nunca foi exercitado como documentado.
      O GitGuardian barrou o PR por causa dos literais `'password' => 'senha-super-secreta'` no teste novo; trocados por canários de runtime (`347ca67`). Falso positivo — nenhuma credencial real vazou.
      _26 chamadas de log padronizadas · 13 testes novos · 95 → 115 testes passando_

- [x] **#108 — Filtro/arquivamento (soft delete) de reservas** `P1`
      Branch `fix/108-filtro-arquivamento-reservas` → PR #266 → merged `8f180f0` (+ ajuste visual `ed85116`) · ⚠️ **issue ainda OPEN no GitHub**
      O requisito 1 da issue (soft delete) **já estava pronto** — `cancel()` marca `inativa` em transação e não existe delete permanente. A issue descrevia um risco inexistente.
      O bug real era outro: `getPaginatedForUser` aplicava `where('situacao', '!=', 'inativa')` incondicionalmente e logo depois oferecia filtro por situação, então filtrar por arquivadas produzia `situacao != 'inativa' AND situacao = 'inativa'` — **contradição lógica, lista sempre vazia**. O gestor tinha a versão correta do mesmo código; a assimetria era a raiz.
      Achado extra: **"Todas" mentia para os dois papéis** — mandava `''`, o parâmetro sumia, e ambos caíam no default que esconde arquivadas.
      Solução: separar os eixos. `situacao` fica só com resultado de avaliação; novo `arquivo` (`ativas`/`arquivadas`/`todas`) via `scopeArquivo` no model, usado pelos dois repositórios. URL legada `?situacao=inativa` é traduzida para não passar a devolver vazio. Entrou também uma guarda de idempotência no cancelamento (recancelar reserva arquivada não dispara mais notificação repetida).
      _12 testes de feature + 6 de componente · baseline 8 falhas → 12 passando · 115 → 127 testes PHP_

- [x] **#265 — Avaliar uma reserva arquivada a ressuscita** `P1` · `effort: small`
      Branch `fix/265-archived-resurrection` → PR #299 → merged `5161d2b`
      `AvaliarReservaJob::updateReservaOverallStatus` recalculava `situacao` a partir da contagem de horários sem tratar `inativa` — toda avaliação em uma reserva arquivada a ressuscitava. Match adicionado para validar que reserva é ativa antes de reatribuir status.
      _17 testes · 17 passando_

- [x] **GAP-03 — Escopo `recurring` em AvaliarReservaJob excede agendas do gestor** `P1` · `effort: small`
      Branch `fix/gap-03-recurring-scope-authorization` → PR #302 → merged 2026-08-22
      No `AvaliarReservaJob` com `scope=recurring`, a propagação não restringe às agendas que o gestor gerencia — pode exceder responsabilidade. Implementada validação em 2 níveis: (1) no `AvaliarReservaRequest::after()` valida cada horário ID pertence às agendas do gestor; (2) no `AvaliarReservaJob::validateHorariosAutorization()` revalida antes de processar. **Bônus 1:** Corrigido bug crítico de UX/acessibilidade no `Alert` com `variant="destructive"` — o alerta de reavaliação estava invisível por contraste 1:1. Corrigido com `text-destructive-accent` (vermelho escuro) que rende ~5:1. **Bônus 2:** Adicionados contadores de horários na lista do gestor (`ReservasList`). Quando uma reserva está em `parcialmente_deferida`, mostra quantos horários estão `em_analise` e quantos foram `indeferida`, dando clareza de quais ações o gestor ainda precisa tomar.
      _9 testes novos/atualizados · 19 testes passando · 0 regressões · docs atualizada (6.1)_

- [x] **#255 — `data_inicial`/`data_final` dessincronizam na edição single** `P2` · `effort: medium`
      Branch `fix/255-data-dessincronizam` → PR #311 → merged `fa758ae`
      Ao editar com `edit_scope='single'` (dia/horário específico), o `UpdateReservaJob` reescrevia `data_inicial`/`data_final` com os limites da semana editada em vez de recalcular a partir do MIN/MAX real dos horários restantes. Bloqueava navegação para semanas fora do range incorreto. Solução: na scope 'single', recalcula datas a partir dos horários após a edição; na scope 'recurring', usa as datas do `validatedData`. Incluída command `reservas:fix-datas-periodo` para correção de dados legados com opções `--dry-run` e `--force`.
      _3 testes novos + 1 command de migração · 160+ testes passando_

- [x] **GAP-02 — UpdateReservaJob não regenera conflitos** `P1` · `effort: medium`
      Branch `fix/gap-02-regenerate-conflicts` → commit `554e85a`
      Após edição de reserva (single ou recurring), o `conflict_cache` fica obsoleto. Solução: despachar `ValidateReservationConflictsJob` ao final de `UpdateReservaJob::handle()`, fora da transaction, garantindo que o cache é regenerado após cada edição. Job é idempotente e funciona para ambos os escopos. Padrão segue `ProcessarCriacaoReserva` e `AvaliarReservaJob`.
      _2 testes novos · 12 testes passando_

- [x] **#106 — Dia da semana nos grupos de turno** `P4`
      Branch `feature/106-dias-turno` → PR #323 → merged `c52b4e7` (squash)
      O dia da semana passou a aparecer no header de cada grupo de turno (`AgendaCalendario`, `calendar-shift-section`) e o header global duplicado de dias da semana foi removido. No mobile, `CalendarDiaMobile` passou a agrupar as agendas por turno, eliminando linhas repetidas. Ajuste visual: removido o `gap-6` herdado do `Card` entre a legenda e o cabeçalho do turno. A ressalva "o header sticky já entrega o essencial" foi levantada antes da execução, mas a entrega foi validada e mergeada.

- [x] **GAP-11 Fase 4 — Canais WebSocket privados por espaço** `P3` · `effort: medium`
      Branch `feature/gap-11-fase-4-expand-channels` → PR #338 → merged `197b202` (2026-08-23)
      Implementação de broadcasting em tempo real específico por espaço. **Backend:** ReservaEvent enriquecido com `espacoId` e `horariosCount`, broadcast dual (público `reserva-channel` + privado `App.Models.Espaco.{id}`), autorização via policy em `routes/channels.php`. **Validação:** Nova rule `HorariosMesmoEspaco` garante que todas as reservas abrangem um único espaço. **Frontend:** Novo hook `useEspacoLiveUpdates(espacoId)` subscreve a atualizações privadas de espaço; hook `useReservationLiveUpdates()` reutiliza o público. **Infraestrutura:** Channel registry com reference counting integrado em ambos os hooks. **Testes:** 7 testes de integração em `VisualizarEspacoPage`, 8 de unitário em hooks, cobertura de registry. Atualizado em `docs/realtime-websocket-channels.md` (novo arquivo) e `docs/validation-rules.md`.
      _24 testes novos · ESLint/TypeScript/PHPUnit limpos · 0 regressões_

---

## 🔨 Em andamento

- [ ] **Revogar `reservas.deletar` do institucional** `P3` · `effort: small`
      Branch `fix/remove-admin-reserva-deletar`
      Mesma inconsistência de regra de negócio identificada no #260: admin não deveria cancelar reserva alheia, só a própria — cancelamento de reserva de terceiros é decisão do próprio dono, não do admin. Achado colateral da revisão de `reservas.atualizar`.

---

## 📋 Fila

- [ ] **GAP-05 — ReservasGestorPage sem filtro de período** `P2` · `effort: medium`
      Lista traz todas as reservas sem data filter — lento em produção. Adicionar período + índice.

**UX em tempo real (do core-workflow-report.md)**

- [ ] **GAP-07 — Falta feedback de progresso para solicitante na criação** `P2` · `effort: medium`
      Flash genérico "sendo processado". Adicionar dashboard com barra de progresso via Reverb.

**Escalabilidade e UX (do core-workflow-report.md)**

- [ ] **GAP-04 — Notificações de e-mail sem template HTML** `P2` · `effort: small`
      `BaseNotification.toMail()` usa texto puro. Usar template Blade customizado.

**Outros GitHub issues**

- [ ] **#104 — Templates de horário configuráveis pelo gestor** `P0 de negócio` · `effort: large`
      Nenhuma base no código. Exige migration, revisão da lógica de conflito e do calendário. **Precisa de design antes da execução.**

- [ ] **#98 — Versão de build no footer** `P3`
      a ideia é sempre ter ciencia de qual versão está em produção, quando reportado um problema saber qual branch corrigir

- [ ] **#107 — Alerta de solicitações pendentes sobrepostas** `P4` · `effort: large` no caso quando o usuario gestor estiver com reservas que sao sobrepostas ele ter noção que há duas solicitações de interesse

- [ ] **#46 — Edição administrativa de reserva** `P4`
      Escopo maior: exige audit log, notificação ao dono, habilitar permission `reservas.atualizar`.a ideia é que o usuario possa editar o titulo ou a descrição da reserva mediante autorização do gestor, envolve planejar uma forma de validar como esse fluxo vai acontecer, voce precisa criar um brainstorm comigo para entender as regras e oque pode ser feito

- [ ] **#49 — Navegação rápida entre salas do pavilhão** `P4` a ideia é que o gestor quando estiver buscando uma sala ele possa atraves do visualizar agenda selecionar a proxima sala do modulo que ele está, para percorrer entre a lista de salas

**Futuro (requer design)**

- [ ] **GAP-08 — Dashboard com métricas de ocupação** `P3` · `effort: large`
      `HomeController`/`HomeService` existem mas não consolidam ocupação. Gráficos e tendências.

- [ ] **GAP-09 — Aprovação parcial granular** `P3` · `effort: medium`
      Status `parcialmente_deferida` sem caminho claro. Notificar solicitante com opções.

- [ ] **GAP-10 — Histórico e audit trail de avaliações** `P3` · `effort: medium`
      Falta rastreabilidade além de `user_id` no `Horario`. Tabela de log ou eventos de domínio.

---

## 🚫 Fora da fila

- [x] **#111 — Alerta de exclusão mal posicionado** → **fechada em 2026-08-20**
      Já estava corrigida no código antes da auditoria (`Dialog` do Radix em `delete-item.tsx:54-100`), aparentemente por refatoração que não referenciou a issue. Verificada e fechada. A label `P0` estava obsoleta.

- [ ] **#41 — Refresh manual (F5)** `P4` → reabrindo para reavaliação
      Estava marcado `wontfix` sem documentação de contexto. Reabrindo em 2026-08-23 para investigar:
      - Ainda é problema em produção?
      - WebSocket broadcasting resolveu?
      - Vale realmente wontfix ou merece fix?

---

## 🗑️ Obsoletos/Descontinuados

- [x] **GAP-01 — AvaliarReservaPage não auto-reload após ValidateJob terminar** `P0` · `effort: medium`
      **Status:** Descontinuado em 2026-08-22 — O fluxo mudou.
      **Motivo:** A página `AvaliarReservaPage` redireciona **imediatamente** após submit para `gestor.reservas.index`. O hook `useReservationValidation` que deveria escutar o evento `ReservationValidated` nunca executa porque o usuário já saiu da página. O cenário descrito (gestor vendo loader + auto-reload) não ocorre mais. O hook causava erro `channel.leave is not a function` sem propósito. Removido do código e do backlog.
      **Ações tomadas:**
    - Removido import de `useReservationValidation` de `AvaliarReservaPage.tsx`
    - Removido hook call (linha 56)
    - Adicionado guard defensivo ao hook para futuros usos (`channel?.leave`)

---

## Pendências de gestão (não são código)

- [x] Fechar a **#111** — feita em 2026-08-20
- [x] Fechar **#119**, **#222**, **#101** com comentário do que foi corrigido — feitas em 2026-08-20
- [x] Fechar **#112** e **#108** no GitHub com comentário — feitas em 2026-08-23 (envelope JSON + soft delete)
- [ ] Repriorizar a **#119** de `P2` → `P0` no GitHub (registro histórico; a issue já está fechada)
- [ ] Decidir se `institucional` sem agendas **deveria** avaliar reservas (efeito colateral documentado na #119)
- [x] Decidir o escopo pretendido de `reservas.atualizar` — resolvido: revogada do institucional, admin edita só a própria reserva
- [x] Fechar a **#260** no GitHub com comentário explicando a revisão de escopo — feita em 2026-08-23
- [x] Fechar a **#255** no GitHub com comentário — feita em 2026-08-23 (datas em single scope)
- [x] Validar a **#106** com o time antes de investir — entregue e mergeada em 2026-08-23 (PR #323)
- [x] Re-abrir **#41** para reavaliação de escopo (wontfix foi descisão sem contexto) — reabrindo 2026-08-23

> A ressalva sobre o corpo da #119 (`ReservaPolicy::view()` desatualizada) ficou registrada no comentário de fechamento, então não é mais necessário editar o corpo da issue.

---

## Placar

|                        |                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Concluídas e mergeadas | **12** (#119, #222, #101, #105, #112, #108, #265, GAP-03, #255, GAP-02, #106, GAP-11-F4) |
| Concluídas, aguardando PR | **2** (#260/`reservas.atualizar` — PR #343; revogação de `reservas.deletar` — branch `fix/remove-admin-reserva-deletar`) |
| Fechadas no GitHub     | **12** (#119, #222, #101, #105, #111, #112, #108, #255, #260, #265, #106, GAP-11-F4)    |
| Em andamento           | **0**                                                                                     |
| Na fila                | **17** (6 GitHub + 7 GAPs + futuro + #41 reabrindo para reavaliação)                     |
| Obsoletos              | **1** (GAP-01)                                                                           |
| Wontfix                | **0**                                                                                     |

> ⚠️ **Fechar issues manualmente após o merge.** O `Closes #NNN` no commit **não** dispara o auto-close quando o merge é para `develop` — o GitHub só fecha automaticamente em merges para o branch default (`main`).
