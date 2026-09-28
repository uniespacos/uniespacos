# Relatório de Análise das Issues Abertas

Data da análise: 2026-08-20
Branch analisada: `develop` (HEAD `44c10e1`)

Este relatório audita as 16 issues abertas no GitHub, comparando o que cada uma pede com o estado atual do código. Nenhuma alteração de código foi feita — apenas leitura/investigação.

Legenda de status:
- ✅ **CORRIGIDA** — pode ser fechada.
- 🟡 **PARCIALMENTE CORRIGIDA** — parte do pedido já existe, falta complementar.
- ❌ **NÃO CORRIGIDA** — segue válida, nada ou quase nada implementado.
- ⚠️ **REGREDIU** — chegou a ser corrigida e voltou a quebrar depois.
- 🚫 **WONTFIX** — já marcada como não será feita.

---

## Resumo rápido

| # | Título | Status |
|---|--------|--------|
| [222](https://github.com/uniespacos/uniespacos/issues/222) | Bug - Click on link to reservation on notification | 🟡 Parcial |
| [119](https://github.com/uniespacos/uniespacos/issues/119) | IDOR Vulnerability in Reservation Details and Editing | ⚠️ **Regrediu** |
| [112](https://github.com/uniespacos/uniespacos/issues/112) | Robust error handling/logging for API endpoints | ❌ Não corrigida |
| [111](https://github.com/uniespacos/uniespacos/issues/111) | Delete Confirmation Alert Positioned Incorrectly | ✅ Corrigida |
| [108](https://github.com/uniespacos/uniespacos/issues/108) | Filter/Archive (Soft Delete) para Reservas | 🟡 Parcial |
| [107](https://github.com/uniespacos/uniespacos/issues/107) | Alert for Pending Overlapping Requests | ❌ Não corrigida |
| [106](https://github.com/uniespacos/uniespacos/issues/106) | Add Day of Week to Slot Groups | 🟡 Parcial |
| [105](https://github.com/uniespacos/uniespacos/issues/105) | Display Space and Module Information | 🟡 Parcial |
| [104](https://github.com/uniespacos/uniespacos/issues/104) | Manager Slot Template Configuration | ❌ Não corrigida |
| [102](https://github.com/uniespacos/uniespacos/issues/102) | Sorting Options for Reservation Requests | ❌ Não corrigida |
| [101](https://github.com/uniespacos/uniespacos/issues/101) | Admin Page: Managers List Order Incorrect | ❌ Não corrigida |
| [98](https://github.com/uniespacos/uniespacos/issues/98) | Dynamic build version in admin footer via CI/CD | ❌ Não corrigida |
| [49](https://github.com/uniespacos/uniespacos/issues/49) | Navegação Rápida entre Salas do Pavilhão | ❌ Não corrigida |
| [48](https://github.com/uniespacos/uniespacos/issues/48) | Filtro/Busca no Dashboard do Gestor | 🟡 Parcial |
| [46](https://github.com/uniespacos/uniespacos/issues/46) | Edição Administrativa de Reserva | ❌ Não corrigida |
| [41](https://github.com/uniespacos/uniespacos/issues/41) | Necessidade de Refresh Manual (F5) | 🚫 Wontfix (já marcada) |

**Destaque crítico:** a issue #119 (IDOR) foi corrigida em algum momento e **voltou a ficar vulnerável** depois de um refactor de arquitetura. Ver detalhes abaixo — recomendo tratar como prioridade máxima, mesmo estando com label P2.

---

## #222 — Bug: Click on link to reservation on notification
**Status: 🟡 Parcialmente corrigida**

- **Fluxo do gestor: OK.** `GestorReservaController::show` → `ReservaService::getForGestorReview` já resolve a semana a partir de `data_inicial` da reserva quando não há `semana` na query (`app/Services/ReservaService.php:196-198`). O link de notificação do gestor abre no período correto.
- **Fluxo de edição: OK.** `ReservaController::edit` → `ReservaService::getEditData` já deriva a data do primeiro `horario` da reserva (`app/Services/ReservaService.php:72-77`).
- **Fluxo do usuário comum ainda quebrado.** As notificações `ReservationCreatedNotification`, `ReservationUpdatedNotification` e `ReservationEvaluatedNotification` linkam para `route('reservas.show', $reserva->id)`. Mas `ReservaController::show` (`app/Http/Controllers/ReservaController.php:68-71`) faz um redirect simples para `reservas.index` **sem propagar nenhum parâmetro `semana`**, e `index` então usa `semana=today` por padrão. Resultado: o modal abre na semana atual (podendo até vir sem horários, se a reserva for de outro período), reproduzindo exatamente o bug relatado.
- O botão "Detalhes" dentro do próprio app (não vindo de notificação) já funciona corretamente, pois passa `semana` explicitamente (`ReservasList.tsx:57-71`).

**Recomendação:** issue permanece válida — falta corrigir especificamente `ReservaController::show` para propagar a semana da reserva (mesma lógica já usada em `getEditData`/`getForGestorReview`).

---

## #119 — IDOR Vulnerability in Reservation Details and Editing ⚠️ REGREDIU
**Status: ❌ Não corrigida (e pior: já foi corrigida uma vez e voltou)**

Achado mais importante desta auditoria: o commit `725d76f` ("hotfix - Fixing vulnerabilitys...", PR #122) **já havia corrigido** essa exata vulnerabilidade, adicionando `authorize('view', ...)`/`authorize('update', ...)` em `index`, `show` e `edit` do `ReservaController`. Depois, o commit `214c437` ("refactor: alterar camada de controllers... arquitetura em camadas") reescreveu o controller para delegar a `ReservaService`/`ReservaRepositoryEloquent` e **removeu as três checagens de autorização** nesse processo. `214c437` é ancestral do HEAD atual (`44c10e1`), ou seja, **a vulnerabilidade está live em `develop` agora**.

Estado atual:
- `ReservaController::index` (linhas 31-40) — `ReservaRepositoryEloquent::findWithWeekSlots` faz `->find($reservaId)` sem filtrar por `user_id` (`app/Repositories/ReservaRepositoryEloquent.php:69-79`). Qualquer usuário autenticado vendo `?reserva=<id_de_outro>` acessa os detalhes.
- `ReservaController::show` (linhas 68-71) — sem `authorize('view', ...)`, apenas redireciona.
- `ReservaController::edit` (linhas 76-81) — sem `authorize('update', ...)` para *carregar* a página (o `update()` POST em si, linha 88, já chama `authorize('update', $reserva)` corretamente — só falta na etapa de visualização).
- `ReservaPolicy::view()` (linhas 23-26) — ao contrário do que o texto da issue afirma, o método **já está implementado corretamente** (`hasPermissionTo('reservas.visualizar') || $user->id === $reserva->user_id`). O problema não é a policy, é que ela não está sendo chamada pelo controller.
- `GestorReservaController::show` já chama `authorize('viewForGestor', $reserva)` corretamente. Mas `GestorReservaController::index` → `findForGestorModal` filtra apenas o relacionamento `horarios` pelas `agendaIds` do gestor, e não a `Reserva` base — um gestor pode ver metadados (`titulo`/`descricao`/`situacao`/`user_id`) de uma reserva totalmente fora de suas agendas, como a issue original também apontava.

**Recomendação:** reabrir com prioridade máxima. O fix sugerido na issue original (reaplicar os `authorize()` calls) é exatamente o que existia antes do refactor `214c437` — só precisa ser reintroduzido na camada de service/controller atual.

---

## #112 — Robust error handling and logging for API endpoints
**Status: ❌ Não corrigida**

- `bootstrap/app.php:41-43` — `->withExceptions(function (Exceptions $exceptions) { // })` é um bloco vazio, sem nenhuma lógica de renderização/relato customizada.
- Não existe `app/Exceptions/Handler.php` customizado (esqueleto padrão do Laravel 11, sem modificação).
- Controllers que retornam JSON (`NotificationController`, `GestorRelatorioController`, `InstitucionalRelatorioController`, `InstitucionalPermissionController`) usam `response()->json(...)` cru, sem schema de erro consistente (`error_code`/`message`/`details`).
- Logging existe de forma pontual (`Log::error(...)` espalhado em `ReservaController`, `UpdateReservaJob`), mas sem padronização nem contexto estruturado.

**Recomendação:** feature grande, segue integralmente por fazer.

---

## #111 — Delete Confirmation Alert Positioned Incorrectly
**Status: ✅ Corrigida**

`resources/js/presentation/molecules/delete-item.tsx` já implementa a confirmação como um `Dialog`/`DialogContent` do Radix (linhas 11, 54-100) — um modal centralizado, sempre visível no viewport, não mais uma div inline no fim da página. `ReservasList.tsx:187-197` monta o componente condicionalmente ao clicar em excluir.

**Recomendação:** fechar a issue.

---

## #108 — Filter/Archive (Soft Delete) Option para Reservas
**Status: 🟡 Parcialmente corrigida**

- Mecanismo de "soft delete" existe: `Reserva` usa um campo `situacao` (não a trait `SoftDeletes` do Laravel) com o valor `'inativa'`. `ReservaController::destroy` → `ReservaService::cancel()` (`app/Services/ReservaService.php:136-157`) marca `situacao = 'inativa'` na reserva e nos horários, em vez de apagar linhas. Isso já atende ao pedido central de não deletar permanentemente.
- Filtro de UI existe, mas só para gestores: `ReservasFilters.tsx:55` só mostra a opção `"Inativa"` quando `isGestor` é true. A página "Minhas Reservas" (usuário comum, `isGestor={false}`) não tem como visualizar suas próprias reservas arquivadas/canceladas.
- Não existe alternância real "Ativas / Arquivadas / Todas": o repositório por padrão exclui `inativa` (`ReservaRepositoryEloquent.php:96`), e escolher "Todas" na UI apenas limpa o parâmetro `situacao`, que segue excluindo `inativa` por padrão — não há opção que mostre ativas+arquivadas juntas.

**Recomendação:** manter aberta, mas atualizar escopo — falta apenas estender o filtro para usuários comuns e implementar a opção "Todas" de fato.

---

## #107 — Alert for Pending Overlapping Requests
**Status: ❌ Não corrigida**

- No backend, o comportamento de permitir prosseguir mesmo com pendência já existe: `HorarioDisponivel.php:41-46` só bloqueia quando existe horário com `situacao === 'deferida'`; `em_analise` não bloqueia.
- Mas não existe nenhum indicador visual de "já existe uma solicitação pendente nesse slot":
  - `calendar-shift-section.tsx:31-46` só mapeia horários com `situacao === 'deferida'` no `horariosReservadosMap`; slots com pendência de outro usuário aparecem como `'livre'`, sem qualquer aviso.
  - `AgendaDialogReserva.tsx:52-78` (`verificarConflitos`) também só verifica `situacao === 'deferida'`.
  - `ConflictDetectionService.php:19-40` também só considera `situacao = 'deferida'`, e é usado exclusivamente na tela de revisão do gestor, não na seleção de slots pelo usuário.
  - O status `'solicitado'` (amarelo) já existe no tipo `SlotCalendario` (`calendar-slot-cell.tsx:46-47,70`), mas só é usado para os horários da própria reserva em edição, nunca para pendências de outros usuários na agenda geral.

**Recomendação:** feature segue integralmente por fazer.

---

## #106 — Add Day of Week to Slot Groups
**Status: 🟡 Parcialmente corrigida**

- `AgendaCalendario.tsx:34-45` já renderiza um cabeçalho global fixo (`sticky top-0`) com o dia da semana no topo da tabela do calendário.
- Porém, dentro de cada grupo de turno (Manhã/Tarde/Noite), `calendar-shift-section.tsx:62-67` renderiza células vazias por dia — só mostra o nome do turno, sem repetir/reforçar o dia da semana dentro do próprio grupo, como pedido literalmente na issue.

**Recomendação:** manter aberta como refinamento de UX — o essencial (visibilidade do dia da semana) já existe via header sticky, mas o pedido específico (dentro de cada grupo) não foi feito. Vale re-avaliar com o time se o header sticky já resolve a necessidade real antes de investir mais nisso.

---

## #105 — Reservation List UI: Display Space and Module Information
**Status: 🟡 Parcialmente corrigida**

- `ReservasList.tsx` (compartilhado entre "Minhas Reservas" e "Gerenciar Reservas") já tem uma coluna "Local" mostrando o nome do espaço (`ReservasList.tsx:98,118-122`, `reserva.horarios[0]?.agenda?.espaco?.nome`).
- Falta o módulo/pavilhão: nem `ReservaRepositoryEloquent::getPaginatedForUser` (carrega só `'agenda.espaco'`) nem `getPaginatedForGestor` (carrega só `'agenda.espaco:id,nome'`, colunas limitadas) trazem a cadeia `andar.modulo`. A UI não exibe esse dado.

**Recomendação:** manter aberta, escopo reduzido — falta só acrescentar o módulo/pavilhão ao eager loading e à listagem.

---

## #104 — Manager Slot Template Configuration
**Status: ❌ Não corrigida**

Nenhuma base para essa feature foi encontrada:
- Horários seguem totalmente fixos em `resources/js/constants/turnos.ts` (`HORARIOS_PADRAO`), consumidos direto em `calendar-shift-section.tsx`.
- `Agenda.php` (`$fillable = ['turno', 'espaco_id', 'user_id']`) não tem campo para horário customizado/intervalo/referência a template.
- Não existe migration, model ou tabela relacionada a "template de horário"/"modelo de horário" no projeto.
- `HorarioDisponivel` e `ConflictDetectionService` seguem validando apenas contra conflitos existentes, sem qualquer noção de template configurável.

**Recomendação:** feature grande, segue integralmente por fazer — nenhum progresso.

---

## #102 — Sorting Options for Reservation Requests
**Status: ❌ Não corrigida**

- Nenhum componente de ordenação encontrado em `resources/js/presentation/pages/Reservas/**` nem em `ReservasFilters.tsx`.
- `ReservaRepositoryEloquent::getPaginatedForUser` (linha 62) e `getPaginatedForGestor` (linha 107) usam `->latest()` fixo, sem nenhum parâmetro de ordenação vindo da query string.

**Recomendação:** segue integralmente por fazer.

---

## #101 — Admin Page: Managers List Order Incorrect
**Status: ❌ Não corrigida**

- `GestoresEspaco.tsx:20-38` itera `agendas` sem nenhuma ordenação; o objeto `turnos` (linhas 14-18) é usado só como lookup de rótulo, não para ordenar.
- `TabelaEspacos.tsx:80` repassa `espaco.agendas` sem alteração.
- `Espaco::agendas()` (relação `HasMany`) não tem `orderBy`.
- `EspacoRepositoryEloquent::getAllByInstituicao` (linhas 77-83) carrega `agendas.user` sem cláusula de ordenação — a ordem do SQL não é garantida.
- Interessante: `AgendaCalendario.tsx:24-27` (componente diferente, usado na visualização de agenda de reserva) **já implementa** exatamente o padrão de correção necessário: `const ordemTurnos = ['manha', 'tarde', 'noite']; ...sort(...)`. Ou seja, o padrão já existe no código, só não foi aplicado em `GestoresEspaco.tsx`.

**Recomendação:** correção pequena e direta — replicar o padrão de `AgendaCalendario.tsx` em `GestoresEspaco.tsx`.

---

## #98 — Feature: Display dynamic build version in admin footer via CI/CD
**Status: ❌ Não corrigida**

- `.github/workflows/cicd-production.yml` e `cicd-staging.yml` só passam `VITE_REVERB_*` como build-args; nenhum `APP_VERSION`/SHA do git.
- `docker/production/php-fpm/Dockerfile:7-16` só declara ARG/ENV para as variáveis do Reverb.
- Nenhuma ocorrência de `APP_VERSION` em todo o código (`app`, `resources`, `config`, `routes`).
- O único "version" existente é o versionamento de assets do Inertia (`HandleInertiaRequests::version()`), que não tem relação com exibição de build no footer.
- `nav-footer.tsx` é apenas uma lista de links de navegação da sidebar, sem nenhuma lógica de exibição de versão nem gate de admin.

**Recomendação:** feature não iniciada, segue integralmente por fazer.

---

## #49 — Navegação Rápida entre Salas do Pavilhão
**Status: ❌ Não corrigida**

- Nenhuma ocorrência de UI de "próxima sala"/"sala anterior" em `resources/js/presentation/pages/Espacos/**` nem `organisms/**`.
- O único conceito de "anterior/próxima" existente é navegação de **semana** no calendário (`EspacoAgenda.tsx:33,84`), não de sala.
- `VisualizarEspacoPage.tsx` renderiza a agenda de um único espaço fixo, sem busca/links para salas irmãs no mesmo pavilhão.

**Recomendação:** segue integralmente por fazer.

---

## #48 — Filtro/Busca no Dashboard do Gestor
**Status: 🟡 Parcialmente corrigida**

Existe uma busca, mas incompleta em relação ao pedido:
- `DashboardGestorPage.tsx:40-59` tem `searchTerm`/`setSearchTerm` com filtro (sem debounce) por `nome`, `andar.nome` e `andar.modulo.nome`, aplicado à aba "Espaços Favoritos" (`tabs-item-espacos-favoritos.tsx:26-36`).
- **Falta debounce**: o filtro reage a cada keystroke, sem `setTimeout`/debounce.
- **Escopo errado**: a aba que de fato representa "cards de espaços do gestor" — "Espaços que gerencio" (`espacosUnicos`, linhas 189-209) — **não tem campo de busca nenhum**, apenas um grid estático.
- **Sem filtro dedicado de pavilhão**: o filtro por módulo acontece implicitamente dentro da busca textual livre, não como um seletor dedicado.

**Recomendação:** manter aberta — implementação parcial e na aba errada; falta adicionar busca com debounce na aba "Espaços que gerencio" e um filtro de pavilhão dedicado.

---

## #46 — Edição Administrativa de Reserva
**Status: ❌ Não corrigida**

- Não existe botão "Editar" para gestores/admin: em `ReservasList.tsx:140-158`, o branch de gestor só renderiza "Avaliar"/"Reavaliar" (aprovar/negar horários com justificativa) — uma feature pré-existente e diferente de uma edição completa de título/descrição/datas. O botão "Editar" só aparece no branch do próprio dono da reserva (`reserva.can_update`).
- `ReservaService::getGestorListing` nunca define `can_update` nas reservas listadas para gestor (diferente de `getListingForUser`, que define), então mesmo reaproveitando o componente, a affordance de edição não aparece.
- O backend tem uma base teórica para permitir edição privilegiada: `ReservaPolicy::update()` já libera para quem tem a permission `reservas.atualizar`, e `UpdateReservaJob.php` já tem lógica/comentários pensando em "gestor editando reserva de outra pessoa". **Porém `reservas.atualizar` nunca é atribuída a nenhum role** em `RoleSeeder.php` (só `reservas.avaliar` é atribuída) — ou seja, esse caminho é inalcançável para qualquer usuário real hoje.
- Não existe log de alteração/auditoria (nenhuma tabela/model de Audit/ActivityLog, nem uso do pacote Spatie activitylog).
- Notificação: `UpdateReservaJob::handle()` notifica quem chamou o update (`Auth::user()`), não necessariamente o dono original da reserva — se o caminho de edição por admin fosse habilitado hoje, o requisito de "notificar o usuário original" não seria atendido como está implementado.

**Recomendação:** segue integralmente por fazer; há resquícios de intenção no backend, mas nada exposto/funcional.

---

## #41 — Necessidade de Refresh Manual (F5) para Visualizar Status
**Status: 🚫 Já marcada como `wontfix`**

Não investigada a fundo — já está com o label `wontfix` no GitHub, presumivelmente decidida pelo time. Mantida na lista apenas para registro completo das issues abertas.

---

## Observações gerais

1. **Estrutura de pastas mudou.** O código foi migrado de `resources/js/pages/**` (caminhos citados nas issues) para uma arquitetura de atomic design em `resources/js/presentation/{pages,organisms,molecules,atoms}/**`. Isso não afeta a validade das issues, mas os caminhos citados nelas estão desatualizados.
2. **Regressão de segurança (#119) é o achado mais urgente deste relatório** — recomendo tratá-la com prioridade mesmo com label P2, já que é uma vulnerabilidade real e ativa em `develop`, não apenas uma feature pendente.
3. Várias issues "parcialmente corrigidas" têm o núcleo do problema já resolvido, faltando apenas extensão de escopo (ex: #108, #105, #106, #48) — podem ser reescritas como issues menores/mais específicas em vez de fechadas ou mantidas como estão.
