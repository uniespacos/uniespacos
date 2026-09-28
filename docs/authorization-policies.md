# Autorização e Políticas de Acesso

Este documento descreve o sistema de autorização de reservas: papéis, permissões Spatie, fluxos de acesso para cada recurso, e prevenção de IDOR (Insecure Direct Object Reference).

## Sumário

- [Papéis (Roles)](#papéis-roles)
- [Permissões (Permissions)](#permissões-permissions)
- [ReservaPolicy — Métodos e Fluxos](#reservapolicy--métodos-e-fluxos)
- [IDOR Prevention](#idor-prevention)
- [Invariantes de Segurança](#invariantes-de-segurança)

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

---

### 3. Usuário Institucional

**Quem é:** Usuário com permissão genérica `'reservas.visualizar'`. Corresponde ao papel Spatie `'institucional'` (recebe a maioria das permissões reservas.*, exceto `'reservas.deletar'`, durante a seed).

**Permissões implícitas:**
- Visualizar qualquer reserva no sistema
- Atualizar qualquer reserva (permissão `'reservas.atualizar'`)
- Cancelar apenas a própria reserva (proprietário, não permissão de admin)
- Avaliar reservas como gestor (se tiver `'reservas.avaliar'`)

**Permissões requeridas:**
- `'reservas.visualizar'` — permissão para visualizar qualquer reserva (monitoramento macro)
- `'reservas.listar'` — para acessar listagens
- `'reservas.atualizar'` (opcional) — se precisa editar reservas de terceiros
- `'reservas.avaliar'` (opcional) — se é também gestor de agendas

**Escopo:** Acesso irrestrito ao domínio de reservas, exceto cancelamento de reservas alheias.

**Exemplo:** Coordenador administrativo pode visualizar qualquer reserva, aprovar todas, editar qualquer uma — mas não pode cancelar reservas de terceiros (cancelamento é exclusivo do proprietário ou decisão do staff operacional específico).

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
| `'reservas.atualizar'` | Editar qualquer reserva (bypass de propriedade e situacao) | `ReservaPolicy::update()` |
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
- Papel `'institucional'` (tem todas as permissões)
- Papel `'gestor'` (tem `'reservas.listar'` ou listagem separada via `ReservaService::getGestorListing()`)

**Nota:** Não filtra resultados — a filtragem ocorre em `ReservaService`. Apenas autoriza o acesso ao endpoint.

**Rota associada:**
- `GET /reservas` (ReservaController::index)
- `GET /gestor/reservas` (GestorReservaController::index)

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
- Despatch job `CancelReservaJob` em background (define `situacao = 'inativa'`)

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

Cada papel tem escopo bem definido e não se sobrepõe:

| Ação | Solicitante | Gestor | Institucional | Admin |
|------|------------|--------|---------------|-------|
| Ver própria | ✅ | — | — | ✅ |
| Ver alheia (via `reservas.visualizar`) | ❌ | ❌ | ✅ | ✅ |
| Editar própria (se `em_analise`) | ✅ | — | — | ✅ |
| Editar alheia (via `reservas.atualizar`) | ❌ | ❌ | ❌ | ❌ |
| Cancelar própria | ✅ | — | — | ✅ |
| Cancelar alheia (via `reservas.deletar`) | ❌ | ❌ | ❌ | ❌ |
| Avaliar (via `reservas.avaliar` + agendas) | ❌ | ✅ | — | ✅ (se admin + agendas) |

---

### 2. Permissão = Responsabilidade

Conceder permissão é explícito e centralizado:

- **`'reservas.listar'`** — Acesso à listagem (não filtra o quê vê, mas não há filtragem em policy)
- **`'reservas.visualizar'`** — Acesso irrestrito a qualquer reserva (implicação: staff confiável)
- **`'reservas.atualizar'`** — Edição irrestrita (implicação: staff confiável)
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

**2026-08-23:** Revogada a permissão `'reservas.atualizar'` do role `'institucional'` (admin). Antes, admin podia editar qualquer reserva indevidamente, contrariando a separação de papéis da arquitetura: admin é gestão institucional geral (usuários, espaços, instituições etc.), a gestão de reservas (editar/avaliar) é exclusiva do gestor de agenda. Agora admin edita apenas sua própria reserva, se estiver `em_analise` e nenhum horário foi avaliado — mesma regra de um usuário comum. Admin mantém `'reservas.visualizar'` (monitoramento/métricas) e `'reservas.deletar'` (cancelamento de reserva alheia, fora do escopo desta revisão). Ver migration `2026_08_23_184530_revoke_reservas_atualizar_from_institucional.php`.

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

