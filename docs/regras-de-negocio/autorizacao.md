# Autorização e Políticas de Acesso

Este documento descreve o sistema de autorização de reservas: papéis, permissões Spatie, fluxos de acesso para cada recurso, e prevenção de IDOR (Insecure Direct Object Reference).

## Sumário

- [Papéis (Roles)](#papéis-roles)
- [Permissões (Permissions)](#permissões-permissions)
- [ReservaPolicy — Métodos e Fluxos](#reservapolicy--métodos-e-fluxos)
- [IDOR Prevention](#idor-prevention)
- [Invariantes de Segurança](#invariantes-de-segurança)
- [Gerenciamento de papéis e agendas (modal de permissões)](#gerenciamento-de-papéis-e-agendas-modal-de-permissões)
- [Visibilidade de dados pessoais](#visibilidade-de-dados-pessoais)
- [Escopo dos relatórios](#escopo-dos-relatórios)
- [Limites de Taxa (Throttling) — T-29](#limites-de-taxa-throttling--t-29)

---

## Papéis (Roles)

O sistema de autorização reconhece **quatro atores** no contexto de reservas:

### 1. Solicitante (Proprietário)

**Quem é:** O usuário que criou a reserva (`reserva.user_id`).

**Permissões implícitas:**
- Ver sua própria reserva
- Editar sua própria reserva (se situação `em_analise` e nenhum horário foi avaliado)
- Cancelar sua própria reserva

**Permissões requeridas:** Nenhuma permissão Spatie específica; autorização por propriedade.

**Escopo:** Acesso limitado aos próprios dados.

---

### 2. Gestor de Agenda

**Quem é:** Usuário ligado a uma ou mais agendas (`user.agendas()`). Corresponde ao papel Spatie `'gestor'`.

**Permissões implícitas:**
- Listar e visualizar reservas que incluem horários em suas agendas
- Avaliar (aprovar/indeferir) horários de reservas que usam suas agendas
- Visualizar detalhes de reservas em avaliação para suas agendas

**Permissões requeridas:**
- `'reservas.avaliar'` — permissão gatilho para métodos de visualização e avaliação

**Escopo:** Acesso limitado a reservas que envolvem intersecção de agendas.

**Exemplo:** Um gestor da agenda de "Sala de Aula A" pode ver e avaliar reservas que incluem "Sala de Aula A", mas não pode ver reservas de "Sala de Aula B", mesmo que de outro gestor.

**Acúmulo:** o papel `'gestor'` pode coexistir com `'comum'` no mesmo usuário. É o estado que o sistema produz ao vincular um gestor a um espaço (`EspacoService::updateGestores()` adiciona `'gestor'` sem remover o papel anterior). As regras de acúmulo e a decisão pendente estão em [Gerenciamento de papéis e agendas](#gerenciamento-de-papéis-e-agendas-modal-de-permissões).

---

### 3. Usuário Institucional

**Quem é:** Usuário com o papel Spatie `'institucional'` (administração institucional). O seed de produção (`database/seeders/Production/RoleSeeder.php`) concede a esse papel todas as permissões `web`, exceto `'reservas.deletar'` e `'reservas.atualizar'`.

**Permissões implícitas:**
- Visualizar qualquer reserva (`'reservas.visualizar'`)
- Listar reservas (`'reservas.listar'`)
- Avaliar horários das agendas que gerencia, se também for gestor (`'reservas.avaliar'` + intersecção de agendas, ver `viewForGestor()`)
- Editar e cancelar apenas a própria reserva, com as mesmas regras de qualquer usuário (`update()` e `delete()`)

**Permissões requeridas:**
- `'reservas.visualizar'` — visualização de qualquer reserva (monitoramento)
- `'reservas.listar'` — acesso às listagens
- `'reservas.avaliar'` (opcional) — se também é gestor de agendas

**Escopo:** Visualização irrestrita ao domínio de reservas. Edição e cancelamento de reservas alheias não são concedidos a este papel.

**Exemplo:** Coordenador administrativo pode visualizar qualquer reserva, mas não edita nem cancela reservas de terceiros. Se também for gestor da agenda "Sala A", pode avaliar os horários da Sala A.

---

### 4. Usuário Anônimo / Não-Autenticado

**Quem é:** Visitante sem login.

**Permissões implícitas:** Nenhuma.

**Escopo:** Sem acesso a reservas. Redirecionado para login.

---

## Permissões (Permissions)

As permissões Spatie relacionadas a reservas são:

| Permissão | Descrição | Usado em |
|-----------|-----------|----------|
| `'reservas.listar'` | Listar reservas (acesso ao index) | `ReservaPolicy::viewAny()` |
| `'reservas.visualizar'` | Visualizar qualquer reserva (bypass de propriedade) | `ReservaPolicy::view()` |
| `'reservas.atualizar'` | ~~Editar qualquer reserva (bypass de propriedade e situação)~~ Permissão **não concedida a nenhum role desde 2026-08-23** (migration `2026_08_23_184530_revoke_reservas_atualizar_from_institucional`). A edição segue a regra do proprietário. | `ReservaPolicy::update()` |
| `'reservas.deletar'` | ~~Deletar qualquer reserva (bypass de propriedade)~~ Permissão **não concedida a nenhum role desde 2026-08-23** (migration `2026_08_23_155138_revoke_reservas_deletar_from_institucional`) — cancelamento é exclusivamente por proprietário. | `ReservaPolicy::delete()` |
| `'reservas.avaliar'` | Avaliar (aprovar/indeferir) horários de reservas em suas agendas | `ReservaPolicy::viewForGestor()`, `GestorReservaController::show()`, `GestorReservaController::update()` |

**Permissões de controle de seção:**
- `'secao.dashboard-gestor'` — acesso a dashboard do gestor
- `'secao.gestao-reservas'` — acesso a rotas `/gestor/reservas/*` (middleware em `routes/web.php`)

---

## ReservaPolicy — Métodos e Fluxos

`ReservaPolicy` em `app/Policies/ReservaPolicy.php` define seis métodos públicos (além de `restore()` e `forceDelete()`, que retornam falso).

### 1. `viewAny(User $user): bool`

**Propósito:** Autorizar acesso ao index de reservas (listagem).

**Lógica:**
```
return $user->hasPermissionTo('reservas.listar')
```

**Quem pode executar:**
- Qualquer usuário autenticado com permissão `'reservas.listar'`
- Papel `'institucional'` (recebe `'reservas.listar'` pelo seed)

O seed de produção não concede `'reservas.listar'` ao papel `'gestor'`. A listagem do gestor (`GET /gestor/reservas`) não chama esta policy; é protegida pelo middleware `secao.gestao-reservas`.

**Nota:** Não filtra resultados — a filtragem ocorre em `ReservaService`. Apenas autoriza o acesso ao endpoint.

**Rota associada:**
- `GET /reservas` (ReservaController::index)

---

### 2. `view(User $user, Reserva $reserva): bool`

**Propósito:** Autorizar visualização de uma reserva específica (incluindo detalhes em modal ou página de edição).

**Lógica:**
```
return $user->hasPermissionTo('reservas.visualizar')  // Institucional/Admin bypass
    || $user->id === $reserva->user_id;               // Solicitante (proprietário)
```

**Quem pode executar:**
- **Proprietário:** `$user->id === $reserva->user_id`
- **Institucional/Admin:** Qualquer usuário com `'reservas.visualizar'`

**Quem NÃO pode:**
- Gestor de agenda (mesmo que gerencie horários da reserva) — usa `viewForGestor()` em vez disso
- Usuário comum sem `'reservas.visualizar'` e que não é proprietário

**Condições especiais:**
- Nenhuma verificação de `situacao` (pode-se ver inativas)
- Nenhuma verificação de data (pode-se ver reservas futuras ou passadas)

**Rota associada:**
- `GET /reservas/{reserva}` (ReservaController::show) — redireciona para index com modal aberto
- `GET /reservas/{reserva}/edit` (ReservaController::edit) — exibe página de edição

**Segurança (IDOR Prevention):**
- **Vulnerabilidade a evitar:** Sem `$user->id === $reserva->user_id`, um atacante poderia acessar `GET /reservas/123/edit?semana=2026-w35` para ver (e talvez editar) reserva de outro usuário.
- **Proteção:** O check de propriedade ou permissão genérica é a única barreira. Ver seção [IDOR Prevention](#idor-prevention).

---

### 3. `create(User $user): bool`

**Propósito:** Autorizar a ação de criar uma reserva.

**Lógica:**
```
return false;  // Sempre recusa
```

**Quem pode executar:** Ninguém.

**Por quê:** Criação de reservas ocorre via job assíncrono em `ReservaService::create()`, não via policy. Validação é em `StoreReservaRequest`.

**Rota associada:** Nenhuma (formulário de criação está em `EspacoController::show()`; despatch em `ReservaController::store()`).

---

### 4. `update(User $user, Reserva $reserva): bool`

**Propósito:** Autorizar edição de uma reserva.

**Lógica:**
```
// Bypass: admin com permissão genérica
if ($user->hasPermissionTo('reservas.atualizar')) {
    return true;
}

// Proprietário: só se em análise e nenhum horário foi avaliado
if ($user->id !== $reserva->user_id || $reserva->situacao !== 'em_analise') {
    return false;
}

$hasProcessedSlots = $reserva->horarios()
    ->whereIn('situacao', ['deferida', 'indeferida'])
    ->exists();

return ! $hasProcessedSlots;
```

**Quem pode executar:**
- **Proprietário:** Apenas se:
  1. Situação é `'em_analise'` (não pode editar após aprovação/rejeição)
  2. Nenhum horário foi avaliado ainda (status `'deferida'` ou `'indeferida'`)
- **Institucional/Admin:** Não pode (permissão `'reservas.atualizar'` foi revogada em 2026-08-23; admin segue as mesmas regras do proprietário)

**Quem NÃO pode:**
- Gestor de agenda (mesmo que gerencie a agenda)
- Proprietário após primeira avaliação (qualquer horário em `'deferida'` ou `'indeferida'`)
- Proprietário se situação mudou para `'deferida'`, `'indeferida'`, ou `'parcialmente_deferida'`

**Condições para proprietário:**
| Situação | Horarios avaliados? | Pode editar? |
|----------|---------------------|------------|
| `em_analise` | Não | ✅ Sim |
| `em_analise` | Sim (1+) | ❌ Não |
| `deferida` | — | ❌ Não |
| `indeferida` | — | ❌ Não |
| `parcialmente_deferida` | — | ❌ Não |
| `inativa` | — | ❌ Não |

**Rota associada:**
- `PUT/PATCH /reservas/{reserva}` (ReservaController::update)
- Despatch job `UpdateReservaJob` em background

**Segurança (IDOR Prevention):**
- Sem `$user->id === $reserva->user_id`, qualquer usuário autenticado poderia editar reserva alheia.
- Permissão `'reservas.atualizar'` existe no código para futuro bypass de admin (backlog #260), mas está **revogada de todos os roles atualmente** — nenhum usuário pode editar reserva alheia.

---

### 5. `delete(User $user, Reserva $reserva): bool`

**Propósito:** Autorizar cancelamento de uma reserva (soft-delete).

**Lógica (código real, inalterado):**
```
return $user->hasPermissionTo('reservas.deletar')  // Bypass de propriedade, se concedida
    || $user->id === $reserva->user_id;             // Solicitante (proprietário)
```

**Quem pode executar:**
- **Proprietário:** Sempre (independente de situação ou data)
- **Institucional/Admin:** Não pode — a permissão `'reservas.deletar'` continua existindo na tabela (necessária para o `hasPermissionTo()` acima não lançar exceção), mas não é mais concedida a nenhum role desde 2026-08-23 (migration `2026_08_23_155138_revoke_reservas_deletar_from_institucional.php`)

**Quem NÃO pode:**
- Institucional/Admin (sem `'reservas.deletar'`, não é proprietário)
- Gestor de agenda (mesmo que gerencie a agenda)
- Usuário comum sem `'reservas.deletar'` e que não é proprietário

**Nota:** Cancelamento requer confirmação de senha (check em `ReservaController::destroy()`).

**Rota associada:**
- `DELETE /reservas/{reserva}` (ReservaController::destroy)
- Chama `ReservaService::cancel()`, de forma síncrona. Se a reserva já está `inativa`, retorna sem efeito (evita nova rodada de notificações). Senão, marca reserva e horários como `inativa` dentro de `DB::transaction` e, depois do commit, notifica os gestores, revalida reservas em conflito nos horários liberados e emite o evento que invalida o cache de relatórios (ver [fluxo de reservas](./fluxo-de-reservas.md))

---

### 6. `viewForGestor(User $user, Reserva $reserva): bool`

**Propósito:** Autorizar um gestor a visualizar e avaliar uma reserva.

**Lógica:**
```
// Requer permissão de avaliador
if (! $user->hasPermissionTo('reservas.avaliar')) {
    return false;
}

// Não pode avaliar reservas inativas
if ($reserva->situacao === SituacaoReservaEnum::INATIVA->value) {
    return false;
}

// Requer que ao menos uma agenda da reserva seja gerenciada pelo gestor
$agendasDaReservaIds = $reserva->horarios()->pluck('agenda_id')->unique();
$agendasDoGestorIds = $user->agendas()->pluck('id');

return $agendasDoGestorIds->intersect($agendasDaReservaIds)->isNotEmpty();
```

**Quem pode executar:**
1. Deve ter permissão `'reservas.avaliar'` (papel `'gestor'`)
2. Reserva deve **estar ativa** (situação ≠ `'inativa'`)
3. Deve gerenciar **ao menos uma agenda** que a reserva usa

**Quem NÃO pode:**
- Usuário sem `'reservas.avaliar'` (papel `'comum'`)
- Gestor de agenda **disjunta** (ex: gestor de Sala A não pode ver reserva de Sala B)
- Proprietário (mesmo que autor da reserva)
- Institucional sem ser também gestor (sem `'reservas.avaliar'`)

**Invariante crítico — Intersecção de Agendas:**

A policy verifica que `$agendasDoGestorIds.intersect($agendasDaReservaIds).isNotEmpty()`. Isto significa:

- Gestor de Agenda A vê reservas que usam Agenda A (e outras)
- Gestor de Agenda A **não** vê reservas de Agenda B (mesmo que outro gestor)
- Uma reserva com múltiplas agendas (ex: ["Sala A", "Sala B"]) é vista por gestor de A **e** gestor de B

**Exemplo:**
```
Gestor1 gerencia: [Agenda_SalaA]
Gestor2 gerencia: [Agenda_SalaB]

Reserva_1 usa: [Agenda_SalaA, Agenda_SalaB]
Reserva_2 usa: [Agenda_SalaA]
Reserva_3 usa: [Agenda_SalaB]

Gestor1 pode ver: Reserva_1 (intersecção: SalaA), Reserva_2 (SalaA) — NÃO Reserva_3
Gestor2 pode ver: Reserva_1 (intersecção: SalaB), Reserva_3 (SalaB) — NÃO Reserva_2
```

**Rota associada:**
- `GET /gestor/reservas/{reserva}` (GestorReservaController::show) — exibe página de avaliação
- `PUT/PATCH /gestor/reservas/{reserva}` (GestorReservaController::update) — despatch job de avaliação

**Segurança (IDOR Prevention):**
- Sem a intersecção de agendas, um gestor poderia avaliar qualquer reserva (acesso além de seu escopo).
- Sem `! $reserva->inativa`, um gestor poderia "reavaliar" reservas já processadas.

---

## IDOR Prevention

**IDOR (Insecure Direct Object Reference)** é uma vulnerabilidade onde um usuário acessa recursos que não deveria (ex: `GET /reservas/123` onde `123` é de outro usuário).

### Por Método

#### `view()` — Proteção contra visualização indevida

**Vulnerabilidade a evitar:**
```php
// ERRADO — qualquer autenticado acessa qualquer reserva
public function view(User $user, Reserva $reserva): bool {
    return $user !== null;  // Sempre true
}
```

**Implementação segura:**
```php
// CORRETO — proprietário OU permissão ampla
public function view(User $user, Reserva $reserva): bool {
    return $user->hasPermissionTo('reservas.visualizar') 
        || $user->id === $reserva->user_id;
}
```

**Defesa:**
- Check de propriedade (`$user->id === $reserva->user_id`)
- Permissão genérica (`'reservas.visualizar'`) para admin/institucional

**Teste associado:** `ReservaAuthorizationTest::test_user_cannot_view_another_users_reservation_via_query_param()`

---

#### `update()` — Proteção contra edição indevida

**Vulnerabilidade a evitar:**
```php
// ERRADO — qualquer um edita qualquer reserva se em análise
public function update(User $user, Reserva $reserva): bool {
    return $reserva->situacao === 'em_analise';
}
```

**Implementação segura:**
```php
if ($user->hasPermissionTo('reservas.atualizar')) {
    return true;  // Admin bypass
}

if ($user->id !== $reserva->user_id || $reserva->situacao !== 'em_analise') {
    return false;
}

$hasProcessedSlots = $reserva->horarios()
    ->whereIn('situacao', ['deferida', 'indeferida'])
    ->exists();

return ! $hasProcessedSlots;
```

**Defesa em camadas:**
1. Permissão genérica (`'reservas.atualizar'`) como bypass admin
2. Check de propriedade (`$user->id === $reserva->user_id`)
3. Check de situação (`'em_analise'`)
4. Check de avaliação (nenhum horário `'deferida'` ou `'indeferida'`)

**Invasor consegue editar se:** Conseguir fazer parecer que é proprietário OU conseguir permissão `'reservas.atualizar'`.

---

#### `delete()` — Proteção contra cancelamento indevido

**Implementação (código real, inalterado):**
```php
return $user->hasPermissionTo('reservas.deletar')
    || $user->id === $reserva->user_id;
```

**Defesa:**
- Proprietário pode cancelar qualquer hora (check de propriedade)
- Permissão `'reservas.deletar'` não é mais concedida a nenhum role (desde 2026-08-23) — na prática, só o check de propriedade se aplica hoje
- Gestor (sem `'reservas.deletar'`) não consegue cancelar reserva de outro usuário
- Admin (sem `'reservas.deletar'`, desde a revogação) não consegue cancelar reserva de terceiros

**Invasor consegue deletar se:** Conseguir fazer parecer que é proprietário. A permissão `'reservas.deletar'` continua existindo na tabela mas não está concedida a nenhum role — se um dia for reatribuída a algum role, esse role volta a ser um vetor de bypass válido (não é uma vulnerabilidade, é a mesma lógica de `'reservas.atualizar'`).

---

#### `viewForGestor()` — Proteção contra acesso a agendas alheias

**Vulnerabilidade a evitar:**
```php
// ERRADO — qualquer gestor avalia qualquer reserva
public function viewForGestor(User $user, Reserva $reserva): bool {
    return $user->hasPermissionTo('reservas.avaliar');
}
```

**Implementação segura:**
```php
if (! $user->hasPermissionTo('reservas.avaliar')) {
    return false;
}

if ($reserva->situacao === SituacaoReservaEnum::INATIVA->value) {
    return false;
}

$agendasDaReservaIds = $reserva->horarios()->pluck('agenda_id')->unique();
$agendasDoGestorIds = $user->agendas()->pluck('id');

return $agendasDoGestorIds->intersect($agendasDaReservaIds)->isNotEmpty();
```

**Defesa:**
- Permissão gatilho (`'reservas.avaliar'`)
- Intersecção de agendas: gestor só vê reservas que usam suas agendas
- Exclusão de reservas inativas (não reavaliar)

**Invasor consegue avaliar se:** Conseguir permissão `'reservas.avaliar'` OU conseguir ser assignado a uma agenda que a reserva usa.

---

### Histórico de Vulnerabilidades

**Issue #119 (IDOR em detalhes/edição):** Os checks de propriedade em `view()` e `update()` foram **removidos acidentalmente** durante refator de arquitetura de camadas (commit 214c437) e redescobertos em 2026-08-20. Testes de regressão em `ReservaAuthorizationTest` previnem re-ocorrência.

---

## Invariantes de Segurança

### 1. Separação entre Roles

Cada papel tem escopo bem definido, e as permissões de um usuário são a soma dos papéis que ele tem. Um usuário pode acumular papéis: `'comum'` + `'gestor'` é o estado produzido pelo sistema ao vincular um gestor a um espaço. O acúmulo não é uma exceção a ser evitada; a forma de tratá-lo (se é estado válido ou deve ser normalizado) é a decisão B44 pendente (ver [Gerenciamento de papéis e agendas](#gerenciamento-de-papéis-e-agendas-modal-de-permissões)).

As linhas "Solicitante" valem para qualquer usuário, inclusive para quem também tem o papel `'gestor'` ou `'institucional'`. Um "—" indica apenas que o papel, sozinho, não concede a ação.

| Ação | Solicitante | Gestor | Institucional |
|------|------------|--------|---------------|
| Ver própria | ✅ | — | ✅ |
| Ver alheia (via `reservas.visualizar`) | ❌ | ❌ | ✅ |
| Editar própria (se `em_analise` e sem horário avaliado) | ✅ | — | ✅ |
| Editar alheia (via `reservas.atualizar`) | ❌ | ❌ | ❌ |
| Cancelar própria | ✅ | — | ✅ |
| Cancelar alheia (via `reservas.deletar`) | ❌ | ❌ | ❌ |
| Avaliar (via `reservas.avaliar` + agendas) | ❌ | ✅ | ✅ (só nas agendas que gerencia) |

---

### 2. Permissão = Responsabilidade

Conceder permissão é explícito e centralizado:

- **`'reservas.listar'`** — Acesso à listagem (não filtra o quê vê, mas não há filtragem em policy)
- **`'reservas.visualizar'`** — Acesso irrestrito a qualquer reserva (implicação: staff confiável)
- **`'reservas.atualizar'`** — Bypass de edição. Não concedida a nenhum role desde 2026-08-23.
- **`'reservas.deletar'`** — **Não concedida a nenhum role desde 2026-08-23.** Cancelamento é direito exclusivo do proprietário (decisão de negócio).
- **`'reservas.avaliar'`** — Avaliação de reservas em agendas do gestor (implicação: responsável por agenda)

---

### 3. Bloqueio de Reavaliacão

Uma vez que um horário é avaliado (`'deferida'` ou `'indeferida'`), a reserva não pode ser editada pelo proprietário. Isto evita:

- Mudança de horários após aprovação parcial
- Contaminação do audit trail
- Gaming do sistema (ex: solicitar errado, après approval partial corrigir)

---

### 4. Invariante de Agenda em `viewForGestor()`

A intersecção garante que:

- Um gestor não consegue "escapar" para avaliar agendas alheias
- Não há forma de ser atribuído a uma agenda "secreta" sem explicitamente fazer `user->agendas()->attach()`
- A listagem em `GestorReservaController::index()` e `viewForGestor()` se alinham

---

## Visibilidade de dados pessoais

Esta seção descreve, por página, quais campos de usuário entram no payload Inertia. Os campos listados são os garantidos pelos testes indicados; campos fora da lista não devem ser assumidos.

**Regra de implementação:** os payloads cobertos por teste têm chaves exatas, o que indica consultas com colunas limitadas (`select`). `User::$hidden` oculta a senha e as colunas de 2FA, mas não oculta `telefone` nem `profile_pic`; por isso a restrição de cada página depende da consulta, não do modelo.

| Página / payload | Campos de usuário no payload | Testes |
|------------------|------------------------------|--------|
| `espacos.show` (agenda do espaço), usuário autenticado sem papel | `agendas[].user`: `id`, `name`, `email`, `setor_id`, `setor` (`id`, `nome`, `sigla`). `horarios[].reserva.user`: `id`, `name`, `setor_id`, `setor`, sem e-mail. `horarios[].avaliador`: `id`, `name` | `EspacoShowPrivacidadeTest`, `HorarioAvaliadorPrivacidadeTest` |
| `reservas.edit` (edição da própria reserva) | Mesmos campos da agenda em `espacos.show`. `reserva.user`: `id`, `name`, `setor_id`, `setor`. `horarios[].avaliador`: `id`, `name` | `ReservaEdicaoPrivacidadeTest`, `HorarioAvaliadorPrivacidadeTest` |
| `reservas.index` com modal aberto (`reservaToShow`) | `horarios[].agenda.user`: `id`, `name`, `email`, `setor_id`, sem `telefone` nem `profile_pic`. `horarios[].avaliador`: `id`, `name` | `PayloadsDePaginaPrivacidadeTest`, `HorarioAvaliadorPrivacidadeTest` |
| `gestor.reservas.index` com modal aberto (`reservaToShow`) | `horarios[].avaliador`: `id`, `name`. Os demais campos do modal não são cobertos por teste desta seção | `HorarioAvaliadorPrivacidadeTest` |
| `dashboard` (prop `auth.user`) | Apenas `unread_notifications_count`. A lista de notificações não vai no payload | `PayloadsDePaginaPrivacidadeTest` |
| `institucional.espacos.index` (combobox de gestores, prop `users`) | `id`, `name`, `email`, `profile_pic`, `setor_id`, `agendas` (`id`, `espaco_id`, `turno`, `user_id`), `setor` (`id`, `nome`, `sigla`), sem `telefone` nem `email_verified_at` | `PayloadsDePaginaPrivacidadeTest` |
| `institucional.espacos.index` (listagem de espaços) | `espacos.data[].agendas[].user`: `id`, `name`, `profile_pic` | `PayloadsDePaginaPrivacidadeTest` |
| `dashboard` do institucional | `gestores`: `id`, `name`, `email`. `users`: `id`, `name`. `agendas[].user` dos espaços: `id`, `name` | `PayloadsDePaginaPrivacidadeTest` |

**Avaliador do horário.** `horarios[].avaliador` expõe somente `id` e `name`. O valor é `null` enquanto o horário está `em_analise`. Os testes garantem que e-mail, telefone e foto do avaliador não voltam nas páginas acima.

### Telefone

O telefone não aparece em nenhum payload de agenda ou reserva da tabela acima. Fora dela, ele é serializado em duas telas institucionais, ambas protegidas por middleware de gestão:

- listagem de usuários (`institucional.usuarios.index`, middleware `secao.gestao-usuarios`, método `UserRepositoryEloquent::getPaginatedForAdminByInstituicao()`);
- endpoint JSON de usuários de um setor (`institucional.setors.usuarios`, middleware `secao.gestao-setores`, autorização `SetorPolicy::view`, método `InstitucionalSetorController::usuarios()`).

Decisão do responsável (P-07): o telefone é contato de emergência e deve ser visível apenas ao gestor da reserva. Hoje ele aparece nas duas telas institucionais acima e não aparece em nenhum payload de gestor coberto pelos testes. O ajuste aguarda o levantamento de quem mais precisa ver o telefone (F-06 no [backlog](../backlog.md)).

---

## Escopo dos relatórios

O escopo de dados de cada relatório é definido por `RelatorioPolicy::aplicarEscopoParaUsuario()` (`app/Policies/RelatorioPolicy.php`). O método está registrado como Gate `aplicarEscopoParaUsuario` no `AppServiceProvider`. `RelatorioService` consulta esse Gate e, se não houver resultado, chama a policy diretamente. Quando o escopo retornado é vazio, o serviço recusa a geração com `AuthorizationException`.

| Permissão de relatório | Escopo retornado | Origem no seed |
|------------------------|------------------|----------------|
| `relatorios.escopo-instituicao` | `tipo: 'institucional'`, com `instituicaoId` da instituição do setor do usuário | Migration `2026_08_28_160000_add_relatorio_scope_permissions.php` (papel `institucional`) |
| `relatorios.escopo-agendas` | `tipo: 'gestor'`, com `agendaIds` das agendas gerenciadas pelo usuário | Mesma migration (papel `gestor`) e `Production/RoleSeeder` |

A policy testa primeiro o escopo institucional. Um usuário que tenha as duas permissões recebe o escopo institucional.

**Fallback legado.** A policy ainda aceita permissões anteriores à criação das permissões de escopo, que não são permissões de relatório:

- escopo institucional: `secao.dashboard-institucional`;
- escopo de gestor: `secao.dashboard-gestor` e `reservas.avaliar`.

A remoção desse fallback está planejada e registrada em [backlog](../backlog.md).

Cache de resultados e tipos de relatório: ver [relatórios](./relatorios.md).

---

## Limites de Taxa (Throttling) — T-29

Limites de requisições contra força bruta, enumeração de contas e abuso de envio de e-mail. Não são regra de autorização, mas ficam aqui porque protegem os mesmos endpoints de autenticação e de canal.

### Limitadores

| Limitador | Rota (nome) | Limite | Chave | Definido em |
|-----------|-------------|--------|-------|-------------|
| `register` | `register.store` | 10/min | IP | `FortifyServiceProvider` |
| `forgot-password` | `password.email` | 5/min | IP | `FortifyServiceProvider` |
| `forgot-password` | `password.email` | 3/min | E-mail informado (minúsculas, sem acento) | `FortifyServiceProvider` |
| `reset-password` | `password.update` | 10/min | IP | `FortifyServiceProvider` |
| `reset-password` | `password.update` | 5/min | E-mail informado (minúsculas, sem acento) | `FortifyServiceProvider` |
| `confirm-password` | `password.confirm.store` | 5/min | Usuário autenticado (fallback: IP) | `FortifyServiceProvider` |
| `locale` | `locale.update` | 60/min | IP | `AppServiceProvider` |
| `broadcasting` | `/broadcasting/auth` | 60/min | Usuário autenticado (fallback: IP) | `AppServiceProvider` |

**Arquivos:**
- `app/Providers/FortifyServiceProvider.php`: `RateLimiter::for()` dos quatro limitadores do Fortify e mapeamento `LIMITADORES_DE_ROTA` (nome da rota → limitador).
- `app/Providers/AppServiceProvider.php`: limitadores `locale` e `broadcasting`.
- `bootstrap/app.php`: `withBroadcasting(..., ['middleware' => ['web', 'throttle:broadcasting']])`.

**Como são anexados às rotas:** o `FortifyServiceProvider::boot()` registra um callback em `$this->app->booted()` que percorre as rotas pelo nome e acrescenta `throttle:<limitador>` a `register.store`, `password.email`, `password.update` e `password.confirm.store`. Como o vínculo é feito por nome dentro do `booted()`, ele sobrevive a `php artisan route:cache`. A rota `locale.update` declara `throttle:locale` diretamente em `routes/web.php`.

### Chave por e-mail

Nos limitadores `forgot-password` e `reset-password`, a chave por e-mail usa o valor informado no campo `email`, em minúsculas e transliterado (`Str::transliterate(Str::lower(...))`). A chave é o texto digitado, não a existência da conta. Por isso o 429 não revela se o e-mail está cadastrado.

### O que não mudou

- **Login** mantém o limite próprio de 5 tentativas por minuto, por e-mail e IP (`login`). **Two-factor** mantém 5 por minuto, por sessão de login (`two-factor`).
- **Rotas de reserva** não declaram nenhum limitador. Teste: `LimitesDeTaxaReservaTest::test_rotas_de_reserva_nao_declaram_nenhum_limitador`.

### Resposta neutra da recuperação de senha

**Arquivo:** `app/Http/Responses/NeutralPasswordResetLinkResponse.php`

A classe implementa os dois contratos do Fortify (`FailedPasswordResetLinkRequestResponse` e `SuccessfulPasswordResetLinkRequestResponse`), registrados como singleton no `FortifyServiceProvider::register()`. Assim, qualquer status do broker de senhas (link enviado, usuário inexistente ou throttled pelo broker) recebe a mesma resposta:

- Requisição JSON: `{"message": "If an account exists with this email, we will send a link to reset your password."}`
- Demais requisições: `back()->with('status', <mesma mensagem>)`

A mensagem é a chave `__('If an account exists with this email, we will send a link to reset your password.')`, presente nos três arquivos de idioma (ver [erros e logs](../arquitetura/erros-e-logs.md), seção de mensagens traduzíveis).

### Limitações conhecidas

1. **Cadastro revela e-mail existente (decisão de 06/11/2026).** Quando o e-mail já tem conta, o cadastro avisa isso no campo e-mail, por decisão do responsável e por usabilidade. A mensagem orienta a redefinição de senha ("Já existe uma conta com este e-mail. Se não lembra a senha, use “Esqueceu sua senha” para redefini-la."), e abaixo dela aparece o link "Esqueceu sua senha?" para a rota de redefinição. Uma resposta neutra foi descartada porque mudaria o login automático que o Fortify faz depois do cadastro. Os limitadores de taxa do cadastro continuam valendo e reduzem a enumeração, mas não a eliminam (T-29b no backlog).
2. **Recuperação de senha: tempo de resposta não é neutro.** Quando a conta existe, o envio do link leva mais tempo que o caminho sem conta. A resposta HTTP é igual, mas o tempo pode diferir. Vale para o "esqueci a senha" e para a redefinição (pendente, T-29c).
3. **Login: tempo igualado (T-29, parte a).** Com conta inexistente, o login executa uma verificação de hash descartável, para que o custo de tempo fique parecido com o de uma conta existente. Status, mensagem e redirecionamento já eram iguais.
4. **Redefinição de senha: mensagem única.** Para e-mail sem conta, a redefinição responde a mesma mensagem do token inválido (`passwords.user` igual a `passwords.token`, em `lang/pt/passwords.php`). Os idiomas `en` e `es` ainda não têm esse arquivo e caem no `pt` (I18N-F1b no backlog).

**429 em requisições Inertia.** Fora de `local` e `testing`, o handler de `bootstrap/app.php` converte o 429 em `Errors/ErrorPage` (título e descrição de `TOO_MANY_REQUESTS`, nos três idiomas), como já fazia com 403, 404, 419, 500 e 503. Sem isso, um `useForm` receberia o HTML do Symfony e mostraria o modal de erro cru do Inertia. Coberto por `LimitesDeTaxaAuthTest::test_esqueci_a_senha_em_producao_mostra_a_pagina_de_erro_429_numa_visita_inertia`, que troca o ambiente para `production` dentro do teste.

---

## Gerenciamento de papéis e agendas (modal de permissões)

O modal "Gerenciar Permissões" (`PermissionModal.tsx`, em Institucional > Usuários) salva por `PUT institucional.usuarios.updatepermissions`, que chama `UserService::updatePermissions()`. A autorização é `UserPolicy::updatePermissions()`, que nega contas anonimizadas (ver [UserPolicy](#userpolicy--contas-anonimizadas)).

A regra depende de quantos papéis o usuário tem no momento do salvamento.

### Usuário com um papel só

| Papel enviado | Agendas | Notificações |
|---------------|---------|--------------|
| `'gestor'` | Vincula as agendas da lista e desvincula as que tinham este usuário e saíram da lista. Uma agenda tem um único gestor (`agendas.user_id`) | `UserAssignedAsManagerNotification` se virou gestor ou ganhou agenda nova |
| Outro papel (`'comum'`, `'institucional'`) | Desvincula todas as agendas do usuário | `UserRemovedAsManagerNotification` se era gestor (papel ou agenda) |

Sem transição real (ex.: `'comum'` salvo como `'comum'`, ou gestor salvo com as mesmas agendas), nenhuma notificação de gestor é enviada.

### Usuário com mais de um papel

Este é o caso de quem acumula `'comum'` + `'gestor'`. O modal mostra os papéis atuais como etiquetas só de leitura, com o aviso de que os papéis não podem ser alterados ali. Não há seletor de papel.

- **Papéis não mudam.** O `role_name` da request é validado (precisa existir), mas ignorado. Nenhum papel é adicionado ou removido.
- **Agendas só são tratadas se `'gestor'` estiver entre os papéis.** Se estiver, as agendas que estavam vinculadas e deixaram de constar na lista são desvinculadas, e as novas são vinculadas. Não há desvinculação em massa do conjunto inteiro, só das removidas da lista.
- **Sem `'gestor'` entre os papéis** (ex.: `'comum'` + `'institucional'`), as agendas não são tocadas.
- **Notificações.** Só `UserAssignedAsManagerNotification`, e só se o usuário ganhou agenda nova sendo gestor. Não há `UserRemovedAsManagerNotification` neste caso, porque o papel `'gestor'` continua.
- **Permissões diretas** são sincronizadas quando a request traz `direct_permissions`. O modal só a envia para quem pode gerenciar permissões diretas.

### Ordem das operações

Papéis, agendas e permissões diretas são gravados numa única `DB::transaction`. As notificações de gestor são enviadas depois do commit, e uma falha de envio só gera log (`Log::warning`), sem desfazer a gravação. Todas as notificações de gestor implementam `ShouldQueue` (ver [notificações](../arquitetura/notificacoes.md)).

### Interface do modal

| Situação | Seletor de papel | Papéis atuais | Seção de agendas |
|----------|------------------|---------------|------------------|
| Um papel | Sim (Institucional, Gestor, Comum) | Não exibidos | Aparece se o papel selecionado for `'gestor'` |
| Mais de um papel | Não | Etiquetas só de leitura + aviso | Aparece se `'gestor'` estiver entre os papéis |

### Decisão pendente B44

Ainda não está decidido se o acúmulo `'comum'` + `'gestor'` é estado válido ou se deve ser normalizado, e se o modal passará a aceitar seleção múltipla de papéis. Até essa decisão, o código preserva o estado atual, e o comportamento descrito nesta seção é provisório. O acompanhamento está no [backlog](../backlog.md) (item B44, relacionado à S14).

---

## UserPolicy — Contas Anonimizadas

Conta anonimizada (`User::estaAnonimizado()`, e-mail `anonimizado-*@invalid`) não pode mais ser alterada nem recebe papel. Três métodos de `UserPolicy` negam a ação com a mensagem `__('This account is anonymized and can no longer be changed.')` (`Response::deny()`):

- `update()`: editar dados, redefinir senha e reenviar verificação (todas passam por `authorize('update', $usuario)`);
- `updatePermissions()`: trocar papel e permissões direto, e abrir o contexto de permissões;
- `delete()`: excluir de novo. A anonimização já é idempotente no serviço, então a negativa só afasta a ação da UI.

Contas ativas seguem as mesmas regras de antes. Testes: `InstitucionalUsuarioAnonimizadosTest`.

---

## Mapeamento de Routes → Policies

| Rota | Método HTTP | Controller | Policy | Requer Permissão | Nota |
|------|-----------|-----------|--------|-----------------|------|
| `/reservas` | GET | ReservaController::index | viewAny | `reservas.listar` | Listagem do solicitante |
| `/reservas/{id}` | GET | ReservaController::show | view | — | Redireciona para index + modal |
| `/reservas/{id}/edit` | GET | ReservaController::edit | update | — | Página de edição |
| `/reservas/{id}` | PUT/PATCH | ReservaController::update | update | — | Despatch job de atualização |
| `/reservas/{id}` | DELETE | ReservaController::destroy | delete | — | Despatch job de cancelamento |
| `/gestor/reservas` | GET | GestorReservaController::index | — | `reservas.avaliar` + middleware | Listagem do gestor |
| `/gestor/reservas/{id}` | GET | GestorReservaController::show | viewForGestor | `reservas.avaliar` | Página de avaliação |
| `/gestor/reservas/{id}` | PUT/PATCH | GestorReservaController::update | viewForGestor | `reservas.avaliar` | Despatch job de avaliação |

---

## Histórico de Mudanças

**2026-08-23:** Revogada a permissão `'reservas.atualizar'` do role `'institucional'` (admin). Antes, admin podia editar qualquer reserva indevidamente, contrariando a separação de papéis da arquitetura: admin é gestão institucional geral (usuários, espaços, instituições etc.), a gestão de reservas (editar/avaliar) é exclusiva do gestor de agenda. Agora admin edita apenas sua própria reserva, se estiver `em_analise` e nenhum horário foi avaliado — mesma regra de um usuário comum. Admin mantém `'reservas.visualizar'` (monitoramento). A permissão `'reservas.deletar'` foi revogada no mesmo dia (ver abaixo). Ver migration `2026_08_23_184530_revoke_reservas_atualizar_from_institucional.php`.

---

## Checklist de Implementação

Ao adicionar novo método a `ReservaPolicy`:

- [ ] Verificar se requer permissão Spatie (`$user->hasPermissionTo()`)
- [ ] Verificar se requer propriedade (`$user->id === $model->user_id`)
- [ ] Verificar se requer intersecção de agendas (se gestor)
- [ ] Documentar condições de situacao (em_analise, inativa, etc.)
- [ ] Documentar invariantes no topo do método
- [ ] Adicionar teste de regressão em `ReservaAuthorizationTest`
- [ ] Atualizar este documento

---

## Histórico de Mudanças

### 2026-08-23

- **Revogação de `reservas.deletar` do role `institucional`** (migration `2026_08_23_155138_revoke_reservas_deletar_from_institucional.php`)
  - Admin não pode mais cancelar (soft-delete) reservas de terceiros
  - Cancelamento agora é direito exclusivo do proprietário
  - Afeta `ReservaPolicy::delete()` e verificação de `IDOR Prevention`
  - Teste: `ReservaCancelamentoAdminTest`

