# UniEspaços — Core Workflow Report
> Última atualização: 2026-08-22 | Diagrama completo do fluxo de reservas, campos, validação e notificações

## Índice

1. [Visão Geral do Sistema](#visão-geral)
2. [Modelo de Dados Central](#modelo-de-dados)
3. [Estados da Reserva e Eixo de Arquivamento](#estados)
4. [Fluxo Completo de Criação](#fluxo-criação)
5. [Fluxo de Avaliação pelo Gestor](#fluxo-avaliação)
6. [Regra de Status Agregado](#status-agregado)
7. [Cascata de Revalidação](#cascata)
8. [Fluxo de Cancelamento](#cancelamento)
9. [Sistema de Notificações](#notificações)
10. [Eixos de Filtro](#eixos-de-filtro)
11. [Validação de Conflitos](#validação-conflitos)
12. [Árvore Frontend](#frontend-tree)
13. [Arquitetura Backend](#arquitetura)
14. [Gaps Conhecidos](#gaps)
15. [Referências de Código](#referências)

---

## 1. Visão Geral do Sistema {#visão-geral}

UniEspaços é uma aplicação web de reserva de espaços acadêmicos com arquitetura full-stack desacoplada:

| Camada | Tecnologia |
|--------|-----------|
| Backend | Laravel 12.x (PHP 8.4) |
| Frontend | React 19 + Inertia.js 2 + Tailwind CSS v4 + TypeScript 5.8 (SPA) |
| Database | PostgreSQL 16 |
| Real-time | Laravel Reverb (WebSockets via Broadcast) |
| Queue | Laravel Queue (background jobs) |
| Auth / RBAC | Spatie Laravel Permission |

O **fluxo central** da aplicação tem dois atores principais:
- **Solicitante** — qualquer usuário autenticado que solicita a reserva de um espaço.
- **Gestor** — usuário com permissão `secao.gestao-reservas` que avalia as solicitações de reserva.

---

## 2. Modelo de Dados Central {#modelo-de-dados}

```mermaid
erDiagram
    User {
        int id
        string name
        string email
    }

    Espaco {
        int id
        string nome
        int andar_id
    }

    Agenda {
        int id
        string turno
        int espaco_id
        int user_id "gestor responsável"
    }

    Reserva {
        int id
        string titulo
        string descricao
        string situacao "em_analise | deferida | indeferida | parcialmente_deferida | inativa"
        date data_inicial
        date data_final
        string recorrencia
        int user_id "solicitante"
        string validation_status "pending | processing | completed | failed"
        json conflict_cache
        timestamp cache_validated_at
    }

    Horario {
        int id
        date data
        time horario_inicio
        time horario_fim
        string situacao "em_analise | deferida | indeferida | inativa"
        string justificativa
        int agenda_id
        int reserva_id
        int user_id "avaliador"
    }

    User ||--o{ Agenda : "gerencia"
    Espaco ||--o{ Agenda : "tem agendas por turno"
    Agenda ||--o{ Horario : "contém slots"
    Reserva ||--o{ Horario : "inclui"
    User ||--o{ Reserva : "solicita"
```

**Relação chave:** Uma `Reserva` agrupa vários `Horario`s. Cada `Horario` pertence a uma `Agenda` (que é vinculada a um `Espaco` e tem um `User` gestor). O status final da `Reserva` é **derivado** do conjunto de status dos seus `Horario`s.

### Campos de Validação e Cache

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `validation_status` | ENUM (pending\|processing\|completed\|failed) | Estado da validação assíncrona de conflitos. Começa em `pending`, passa por `processing` enquanto o job roda, termina em `completed` (sucesso) ou `failed`. |
| `conflict_cache` | JSON | Mapa de conflitos detectados pelo `ValidateReservationConflictsJob`. Armazena pares `horario_id → dados do conflito`. Atualizado pela cascata de revalidação. |
| `cache_validated_at` | TIMESTAMP | Timestamp da última validação bem-sucedida. Usado para detectar quando o cache ficou obsoleto (ex.: após update da reserva). |

---

## 3. Estados da Reserva e Eixo de Arquivamento {#estados}

### 3.1 Separação: Situação vs Arquivo

**Situação** é o resultado da **avaliação** (quem aprova/rejeita a reserva):
- `em_analise`: aguardando avaliação do gestor
- `deferida`: aprovada
- `indeferida`: rejeitada
- `parcialmente_deferida`: mix de aprovados e rejeitados

**Arquivo** é um estado de **exclusão lógica** (arquivar = remover da visão padrão):
- `inativa`: reserva arquivada (cancelada ou excluída)

**Por quê separar?** Historicamente, `inativa` era tratada no mesmo field que os outros status, causando filtros contraditórios (ex.: "mostrar inativas E em_analise"). Agora:
- Use `situacao` para filtrar por **resultado de avaliação** (4 valores)
- Use `arquivo` (via `ModoArquivoEnum`) para filtrar por **visibilidade** (ATIVAS / ARQUIVADAS / TODAS)

Ver seção [4.5 Eixos de Filtro](#eixos-de-filtro).

### 3.2 Diagrama de Transição de Estados

```mermaid
stateDiagram-v2
    [*] --> em_analise : Solicitante submete reserva\n(ProcessarCriacaoReserva Job)
    em_analise --> deferida : Todos os horários deferidos\n(AvaliarReservaJob)
    em_analise --> indeferida : Todos os horários indeferidos\n(AvaliarReservaJob)
    em_analise --> parcialmente_deferida : Mix de deferidos + outros\n(AvaliarReservaJob)
    em_analise --> inativa : Solicitante cancela\n(ReservaService.cancel)
    deferida --> inativa : Solicitante cancela\n(ReservaService.cancel)
    parcialmente_deferida --> deferida : Reavaliação → todos deferidos
    parcialmente_deferida --> indeferida : Reavaliação → todos indeferidos
    parcialmente_deferida --> inativa : Solicitante cancela
    indeferida --> deferida : Reavaliação (Gestor)

    note right of em_analise
        Auto-aprovada se solicitante
        é o único gestor de TODAS
        as agendas solicitadas
    end note
```

### 3.3 Regra de Auto-Aprovação

Se o solicitante for o **único gestor de TODAS as agendas** na reserva:
- Todos os horários nascem com `situacao = deferida`
- A reserva nasce com `situacao = deferida`
- Notificações gestores **não** são enviadas (pois solicitante = gestor)
- **Supressão de email:** O canal `mail` é omitido (apenas `database` e `broadcast`)

Ver seção [Notificações](#sistema-de-notificações) para detalhe de supressão.

Se solicitante é gestor de **ALGUMAS** (mas não todas) agendas:
- Horários das agendas que gerencia nascem com `situacao = deferida`
- Horários de agendas de outros gestores nascem com `situacao = em_analise`
- Reserva nasce com `situacao = parcialmente_deferida`

---

## 4. Fluxo Completo de Criação de Reserva {#fluxo-criação}

### 4.1 Frontend — Seleção de Slots

```mermaid
graph TD
    A["EspacosPage\n(Listagem de Espaços)"] --> B["VisualizarEspacoPage\n(Detalhe do Espaço)"]
    B --> C["EspacoAgenda\n(Organism)"]
    C --> D["AgendaCalendario\n(Organism)\nExibe grid semanal"]
    D --> E["calendar-slot-cell\n(Molecule)\nSlot clicável por turno/dia"]
    E -->|"alternarSelecaoSlot()"| F["Estado: slotsSelecao[]"]
    F --> G["AgendaNavegacao\n(Molecule)\nNavegação entre semanas"]
    F -->|">0 slots selecionados"| H["AgendaDialogReserva\n(Organism)\nModal de confirmação"]
    H --> I["Formulário: título, descrição,\nrecorrência, datas"]
    I -->|"onSubmit() → useForm.post()"| J["POST /reservas\n(ReservaController.store)"]
```

### 4.2 Backend — Processamento Assíncrono

```mermaid
sequenceDiagram
    participant Browser
    participant ReservaController
    participant ReservaService
    participant Queue as "Queue Worker"
    participant ProcessarCriacaoReserva as "ProcessarCriacaoReserva Job"
    participant DB as "PostgreSQL"
    participant ValidateJob as "ValidateReservationConflictsJob"
    participant Notification

    Browser->>ReservaController: POST /reservas (dados validados)
    ReservaController->>ReservaService: create(data, user)
    ReservaService->>Queue: ProcessarCriacaoReserva::dispatch(data, user)
    ReservaController-->>Browser: redirect → espacos.index (flash "processando")

    Queue->>ProcessarCriacaoReserva: handle()
    ProcessarCriacaoReserva->>DB: BEGIN TRANSACTION
    ProcessarCriacaoReserva->>DB: INSERT INTO reservas (situacao='em_analise', validation_status='pending')
    ProcessarCriacaoReserva->>DB: SELECT horarios ... WHERE agenda_id IN (...) AND data BETWEEN ... FOR UPDATE (lock pessimista, agenda_id ordenado)
    ProcessarCriacaoReserva->>DB: Revalida conflito sob lock (mesma janela de agenda_id/data, situacao='deferida', overlap) — se detectar, ROLLBACK + throw
    loop Para cada horario_solicitado com recorrência semanal
        ProcessarCriacaoReserva->>DB: INSERT INTO horarios (situacao='em_analise' ou 'deferida' se auto-aprovação)
    end
    ProcessarCriacaoReserva->>DB: Auto-aprovação? Atualiza situacao='deferida' (se único gestor de TODAS)
    ProcessarCriacaoReserva->>DB: COMMIT

    ProcessarCriacaoReserva->>Notification: NewReservationNotification → Gestores (se não auto-aprovada)
    ProcessarCriacaoReserva->>Queue: ValidateReservationConflictsJob::dispatch(reserva)
    ProcessarCriacaoReserva->>Notification: ReservationCreatedNotification → Solicitante (suprime mail em auto-aprovação)

    Queue->>ValidateJob: handle()
    ValidateJob->>DB: UPDATE reservas SET validation_status='processing'
    ValidateJob->>DB: SQL JOIN horarios para detectar conflitos (mesma agenda, data, sobreposição de horário)
    ValidateJob->>DB: UPDATE reservas SET conflict_cache=JSON, validation_status='completed', cache_validated_at=NOW()
```

### 4.2.1 Defesa Contra Race Condition: Lock Pessimista e Revalidação

Há uma janela de tempo entre a validação síncrona de conflitos (na requisição HTTP, que apenas bloqueia slots já aprovados) e a inserção real dos novos horários (que ocorre quando o `ProcessarCriacaoReserva` job roda). Duas requisições concorrentes poderiam ambas passar na validação e ambas inserirem horários sobrepostos.

Para cobrir essa brecha, o job implementa uma defesa em duas etapas:

1. **Lock Pessimista (`lockForUpdate`):** Logo após criar a `Reserva`, antes de montar as linhas de horário, o job adquire um lock exclusivo sobre todos os horários existentes cuja `agenda_id` esteja entre as agendas afetadas pela nova reserva E cuja `data` esteja dentro do intervalo `data_inicial` até `data_final` da reserva. Os `agenda_id` são ordenados de forma determinística (`->sort()`) antes do lock para evitar deadlock entre transações concorrentes que poderiam acumular locks em ordens distintas.

2. **Revalidação de Conflito Sob Lock:** Depois que a expansão monta as linhas de horário a inserir, o job revalida cada linha nova contra horários já existentes e aprovados. Especificamente, para cada linha, verifica se existe um horário com mesma `agenda_id`, mesma `data`, `situacao = 'deferida'`, e cujo intervalo de horário se sobrepõe (`horario_inicio < novo.horario_fim AND horario_fim > novo.horario_inicio`). Se encontrar, lança uma `Exception` com mensagem descritiva, causando rollback automático da transação (desfeito inclusive o `Reserva::create` daquela tentativa). A exceção propaga para o `catch (Exception $e)` que envolve o `handle()`, é logada com `Log::error()`, e `$this->fail($e)` ativa o método `failed()` do job, que dispara `ReservationFailedNotification` ao solicitante.

A mesma estratégia de lock e revalidação foi aplicada em `UpdateReservaJob.php` em ambos os escopos (`edit_scope === 'recurring'` e `edit_scope === 'single'`):
- **Escopo `recurring`:** Lock adquirido sobre os horários das agendas afetadas dentro do intervalo `data_inicial`–`data_final`, posicionado antes da leitura de avaliações já feitas (`$avaliacoes`). A revalidação ocorre após a expansão montar as linhas, antes da inserção final. A verificação exclui horários da própria reserva sendo editada (`where('reserva_id', '!=', $this->reserva->id)`) para evitar falso conflito com horários antigos que já foram deletados.
- **Escopo `single`:** Lock adquirido sobre os horários das agendas afetadas na semana sendo editada (entre `startOfWeek()` e `endOfWeek()`). A revalidação ocorre para cada novo horário a inserir, imediatamente antes do `create()`. Da mesma forma, exclui horários da própria reserva da verificação de conflito.

### 4.3 Pipeline de Validação de Conflitos

O field `validation_status` acompanha o progresso do `ValidateReservationConflictsJob`:

| Status | Significado | Transição automática |
|--------|-------------|-----|
| `pending` | Job não iniciado ainda | → `processing` quando job inicia |
| `processing` | Job rodando, detectando conflitos | → `completed` ou `failed` |
| `completed` | Validação terminada com sucesso; `conflict_cache` está atualizado | Permanece até próxima revalidação |
| `failed` | Job falhou após retries; cache pode estar desatualizado | Manual (não há retry automático) |

**Nota:** Durante `pending` ou `processing`, a `AvaliarReservaPage` (gestor) exibe um spinner e bloqueia avaliação, pois não há conflitos verificados ainda.

---

## 5. Fluxo de Avaliação pelo Gestor {#fluxo-avaliação}

### 5.1 Frontend — Tela de Avaliação

```mermaid
graph TD
    A["ReservasGestorPage\n(Listagem com filtros)"] -->|"Ver detalhes"| B["AvaliarReservaPage\n(Página de Avaliação)"]
    B --> C["Card de Informações\nda Reserva (título, solicitante, período)"]
    B --> D["AgendaNavegacaoGestor\n(Molecule)\nNavegação semana a semana"]
    B --> E["CalendarReservationDetails\n(Molecule)\nCalendário de slots com status visual"]
    E -->|"avaliarSlot()"| F["useReservationSlots Hook\nEstado: slotsSelecao[]"]
    F -->|Sincroniza| G["EvaluationForm\n(Organism)"]
    G --> H["Escopo: 'single' ou 'recurring'"]
    G --> I["Decisão global: Deferir / Indeferir"]
    G --> J["Campo Motivo (condicional se indeferir)"]
    G --> K["Campo Observação (opcional)"]
    G -->|"onSubmit → useAvaliarReservaUseCase"| L["PATCH /gestor/reservas/{id}"]
```

> **Nota importante:** O `AvaliarReservaPage` detecta `validation_status === 'processing'` ou `'pending'` e exibe um loading spinner em vez do formulário, evitando avaliação antes da validação de conflitos terminar.

### 5.2 Backend — Processamento da Avaliação

```mermaid
sequenceDiagram
    participant Browser
    participant GestorCtrl as "GestorReservaController"
    participant ReservaService
    participant Queue as "Queue Worker"
    participant AvaliarJob as "AvaliarReservaJob"
    participant ConflictService as "ConflictDetectionService"
    participant DB
    participant ValidateJob as "ValidateReservationConflictsJob"
    participant Notification

    Browser->>GestorCtrl: PATCH /gestor/reservas/{id} (horarios_avaliados, evaluation_scope, motivo)
    GestorCtrl->>GestorCtrl: authorize('viewForGestor', reserva)\nVerifica se gestor gerencia alguma agenda da reserva
    GestorCtrl->>ReservaService: evaluate(reserva, data, gestor)
    ReservaService->>Queue: AvaliarReservaJob::dispatch(reserva, data, gestor)
    GestorCtrl-->>Browser: redirect → gestor.reservas.index (flash "processando")

    Queue->>AvaliarJob: handle(conflictService)
    AvaliarJob->>ConflictService: findConflictsFor(reserva.id)
    ConflictService->>DB: SQL JOIN para detectar horarios com conflito (situacao='deferida' + sobreposição)
    DB-->>ConflictService: mapa horario_id → conflito

    alt evaluation_scope === 'single'
        loop Para cada horario na semana visível
            AvaliarJob->>DB: UPDATE horarios (situacao, justificativa, user_id)\nSe conflitante → força 'indeferida'
        end
    else evaluation_scope === 'recurring'
        AvaliarJob->>DB: UPDATE horarios conflitantes → 'indeferida' + justificativa
        loop Para cada padrão único (agenda_id + horario_inicio + dia_da_semana)
            AvaliarJob->>DB: UPDATE todos os horarios recorrentes não conflitantes\nPropaga status para toda a série
        end
    end

    AvaliarJob->>AvaliarJob: updateReservaOverallStatus()\nRecalcula situacao da Reserva pelo agregado dos Horarios
    
    alt Algum horário foi aprovado (deferida)?
        AvaliarJob->>AvaliarJob: triggerConflictRevalidation()
        loop Para cada reserva em_analise que compartilha (data, agenda_id)
            AvaliarJob->>Queue: ValidateReservationConflictsJob::dispatch(reserva_afetada)
        end
    end
    
    AvaliarJob->>Notification: ReservationEvaluatedNotification → Solicitante (database + broadcast + mail)
```

---

## 6. Regra de Status Agregado da Reserva {#status-agregado}

A situação final da `Reserva` é calculada em `AvaliarReservaJob::updateReservaOverallStatus()`:

```mermaid
flowchart TD
    A["Conta horários por situação"] --> B{"Todos 'deferida'?"}
    B -->|Sim| C["situacao = 'deferida'"]
    B -->|Não| D{"Todos 'indeferida'?"}
    D -->|Sim| E["situacao = 'indeferida'"]
    D -->|Não| F{"Algum 'em_analise'?"}
    F -->|Sim| G["situacao = 'em_analise'"]
    F -->|Não| H["situacao = 'parcialmente_deferida'\n(mix de deferida + indeferida)"]
```

### 6.1 Exibição para o Gestor

Na lista de reservas do gestor (`ReservasGestorPage`), o status é exibido com clareza sobre o que o gestor já fez. A situação é **recalculada dinamicamente no frontend** a partir dos horários individuais:

| Status | Exibição | Significado | Cálculo |
|--------|----------|-------------|---------|
| `deferida` | 🟢 Deferida | Gestor aprovou todos os horários | Todos os horários têm `situacao = 'deferida'` |
| `indeferida` | 🔴 Indeferida | Gestor recusou todos os horários | Todos os horários têm `situacao = 'indeferida'` |
| `em_analise` | 🟡 Em análise | Gestor ainda não avaliou algum horário ou nenhum foi avaliado | Algum horário tem `situacao = 'em_analise'` (prioridade máxima) |
| `parcialmente_deferida` | 🟠 Parcialmente Deferida | Gestor aprovou alguns horários e recusou outros | Há mix de `'deferida'` + `'indeferida'` (sem `'em_analise'`) |
| `inativa` | ⚫ Inativa | Reserva foi cancelada (arquivada) | Reserva cancelada pelo solicitante |

**Detalhe técnico:** O recálculo acontece em `calculateGestorStatus()` no frontend (`reserva-helpers.ts`). O repositório backend retorna **todos os horários** de cada reserva (sem limite), permitindo que o frontend analise cada um individualmente e derive a situação correta.

**Exemplo:** Uma reserva com 3 horários:
- Horário 1 (segunda 14h): ✅ deferida
- Horário 2 (quarta 14h): ❌ indeferida  
- Horário 3 (sexta 14h): ✅ deferida

→ Status exibido na listagem: **🟠 Parcialmente Deferida** (pois tem mix de aprovados + recusados)

---

## 7. Cascata de Revalidação de Conflitos {#cascata}

Quando o gestor aprova horários (`deferida`), o sistema automaticamente revalida outras reservas que disputam os mesmos slots. Isso evita que o cache de conflitos de outras reservas fique obsoleto.

### 7.1 Mecanismo

1. **Identificação de aprovações:** AvaliarReservaJob detecta quais horários foram aprovados (status `deferida`) nesta avaliação.

2. **Busca de afetadas:** Procura outras reservas que:
   - Estão em `situacao = 'em_analise'` (pendentes de avaliação)
   - Têm `validation_status = 'completed'` (já validadas)
   - Compartilham pelo menos um slot (`data`, `agenda_id`) com os horários recém-aprovados

3. **Revalidação:** Para cada reserva afetada, dispara `ValidateReservationConflictsJob` para:
   - Re-detectar conflitos contra os novos horários aprovados
   - Atualizar `conflict_cache` com conflitos atualizados
   - Atualizar `cache_validated_at`

### 7.2 Diagrama

```mermaid
graph TD
    A["AvaliarReservaJob aprova Horários\nda Reserva A"] -->|Identifica aprovações| B["Lista de slots aprovados:\ndata, agenda_id, horario_inicio/fim"]
    B -->|Busca afetadas| C["Query: Reservas em_analise,\nvalidation_status=completed,\nque compartilham slots"]
    C -->|Para cada reserva| D["ValidateReservationConflictsJob\ndispatchado"]
    D -->|Atualiza| E["conflict_cache da reserva\ne cache_validated_at"]
    
    style A fill:#e1f5ff
    style E fill:#c8e6c9
```

### 7.3 Exemplo Prático

- **Reserva A:** Solicitante pede segundo-feira 14h na Agenda X. Fica em análise.
- **Reserva B:** Outro solicitante pede segunda-feira 14h na mesma Agenda X. Fica em análise, sem conflitos iniciais (pois A ainda não foi aprovada).
- **Gestor aprova A:** `ValidateReservationConflictsJob` roda e marca os horários de A como `deferida`.
- **Cascata:** AvaliarReservaJob detecta que B compartilha a mesma Agenda+Data+Hora, dispara novo `ValidateReservationConflictsJob` para B.
- **B re-validado:** O novo job detecta conflito de B com A agora, atualiza `conflict_cache` de B.

> **Objetivo:** Garantir que o gestor sempre veja o estado atual de conflitos ao avaliar uma reserva, mesmo que outra tenha sido aprovada após a submissão.

---

## 8. Fluxo de Cancelamento {#cancelamento}

```mermaid
sequenceDiagram
    participant Browser
    participant ReservaController
    participant ReservaService
    participant DB
    participant Notification

    Browser->>ReservaController: DELETE /reservas/{id} (com confirmação de senha)
    ReservaController->>ReservaController: authorize('delete', reserva)
    ReservaController->>ReservaController: Verifica senha do usuário
    ReservaController->>ReservaService: cancel(reserva, user)
    ReservaService->>DB: BEGIN TRANSACTION
    ReservaService->>DB: UPDATE horarios SET situacao='inativa'
    ReservaService->>DB: UPDATE reservas SET situacao='inativa'
    ReservaService->>DB: COMMIT
    ReservaService->>Notification: ReservationCanceledNotification → Gestores afetados
    ReservaController-->>Browser: redirect back (flash "cancelada")
```

> **Nota:** O cancelamento é **síncrono** (não usa job/queue), diferente da criação e avaliação.

---

## 9. Sistema de Notificações {#notificações}

Todas as notificações relacionadas a reserva estendem `BaseNotification` que implementa `ShouldQueue`:

### 9.1 Canais de Entrega

| Canal | Tecnologia | Timing | Quando suprimido |
|-------|-----------|--------|-----------------|
| `database` | Laravel notifications table | Sempre ativo | Nunca |
| `broadcast` | Laravel Reverb (WebSocket) | Entrega em tempo real | Nunca |
| `mail` | SMTP / Mailtrap | Assíncrono (fila) | Em auto-aprovação (veja 9.3) |

O canal `broadcast` permite que o frontend (`notification-dropdown.tsx`) receba notificações em tempo real via WebSocket.

### 9.2 Notificações de Reserva

| Notificação | Destinatário | Disparada por | Quando |
|-------------|---|---|---|
| `NewReservationNotification` | Gestores das agendas | `ProcessarCriacaoReserva` | Quando nova reserva é criada (se não auto-aprovada) |
| `ReservationCreatedNotification` | Solicitante | `ProcessarCriacaoReserva` | Após criação (sempre, mas mail suprimido em auto-aprovação) |
| `ReservationEvaluatedNotification` | Solicitante | `AvaliarReservaJob` | Após gestor avaliar e finalizar a reserva |
| `ReservationCanceledNotification` | Gestores afetados | `ReservaService.cancel()` | Quando solicitante cancela a reserva |
| `ReservationUpdatedNotification` | Solicitante | `UpdateReservaJob` | Após edição da reserva (atualização de horários) |
| `ReservationFailedNotification` | Solicitante | `ProcessarCriacaoReserva.failed()` | Quando criação falha após 3 retries |
| `ReservationUpdateFailedNotification` | Solicitante | `UpdateReservaJob.failed()` | Quando atualização falha após 3 retries |

### 9.3 Supressão de E-mail em Auto-Aprovação

Quando o solicitante é o **único gestor de TODAS as agendas** da reserva (auto-aprovação):

- **Para `NewReservationNotification`:** Não é enviada (o solicitante é o gestor, não precisa de "nova reserva")
- **Para `ReservationCreatedNotification`:** É enviada, mas o canal `mail` é omitido (mantém `database` e `broadcast`)

**Implementação:** `BaseNotification.via()` detecta:
```php
$isApplicant = $reserva->user_id === $notifiable->id;
$managerIds = Agenda::...$reserva->horarios...; // IDs únicos de gestores
$isSoleManager = $managerIds->count() === 1 && $managerIds->first() === $notifiable->id;

if ($isApplicant && $isSoleManager) {
    return ['database', 'broadcast']; // Sem mail
}
return ['database', 'broadcast', 'mail'];
```

### 9.4 Diagrama de Fluxo

```mermaid
graph TD
    subgraph "Canais"
        DB["database"]
        BC["broadcast"]
        ML["mail"]
    end

    N1["NewReservationNotification<br/>(nova reserva)"] -->|Gestor| DB & BC & ML
    N2["ReservationCreatedNotification<br/>(criada)"] -->|Solicitante| DB & BC
    N2 -->|se NÃO auto-aprovação| ML
    
    N3["ReservationEvaluatedNotification<br/>(avaliada)"] -->|Solicitante| DB & BC & ML
    N4["ReservationCanceledNotification<br/>(cancelada)"] -->|Gestores| DB & BC & ML
    N5["ReservationUpdatedNotification<br/>(atualizada)"] -->|Solicitante| DB & BC & ML
    N6["ReservationFailedNotification<br/>(falha criação)"] -->|Solicitante| DB & BC & ML
    N7["ReservationUpdateFailedNotification<br/>(falha atualização)"] -->|Solicitante| DB & BC & ML
    
    style N2 fill:#fff3e0
```

---

## 10. Eixos de Filtro: Situação vs Arquivo {#eixos-de-filtro}

### 10.1 ModoArquivoEnum

As listagens de reservas suportam dois eixos de filtro **independentes**:

| Eixo | Enum | Valores | Padrão | Descrição |
|------|------|---------|--------|-----------|
| **Avaliação** | `SituacaoReservaEnum` | em_analise, deferida, indeferida, parcialmente_deferida | Sem filtro | Resultado da avaliação pelo gestor |
| **Visibilidade** | `ModoArquivoEnum` | ATIVAS, ARQUIVADAS, TODAS | ATIVAS | Estado de arquivamento (ativa / inativa) |

### 10.2 Escopo dos Valores

**ATIVAS** (`arquivo=ativas`):
- `situacao != 'inativa'` (qualquer coisa exceto arquivada)
- Padrão: mostra reservas normais do user

**ARQUIVADAS** (`arquivo=arquivadas`):
- `situacao = 'inativa'` (canceladas / excluídas)
- Gestor pode ver histórico de reservas inativas

**TODAS** (`arquivo=todas`):
- Sem filtro de `situacao`
- Recupera tanto ativas quanto arquivadas

### 10.3 Por que Separar?

Historicamente (issue #108), um único field `situacao` tentava fazer dois trabalhos:
1. Representar o **resultado** da avaliação
2. Controlar a **visibilidade** (ativa/arquivada)

Isso criava filtros contraditórios: "mostrar `inativa` E filtrar por `em_analise`" gerava a condição:
```sql
WHERE situacao = 'em_analise' AND situacao = 'inativa'  -- sempre vazio!
```

Agora:
- `situacao` serve **apenas** para avaliar (4 valores)
- `arquivo` serve **apenas** para visibilidade (3 modos)
- Sem conflitos

### 10.4 Aplicação nas Listagens

**ReservasPage** (solicitante):
```
GET /reservas?situacao=em_analise&arquivo=ativas
→ Minhas reservas em análise, não arquivadas
```

**ReservasGestorPage** (gestor):
```
GET /gestor/reservas?situacao=deferida&arquivo=todas
→ Reservas que aprovei, incluindo canceladas (para auditoria)
```

---

## 11. Validação de Conflitos: Regra HorarioDisponivel {#validação-conflitos}

### 11.1 O que é a Regra?

`HorarioDisponivel` é uma validação customizada (Laravel Rule) que roda no **frontend** (StoreReservaRequest) para bloquear seleção de slots já comprometidos.

### 11.2 Condição de Bloqueio

Um slot é considerado **indisponível** se já existe um `Horario` com:
- Mesma `agenda_id`
- Mesma `data`
- Mesmos `horario_inicio` e `horario_fim`
- **E** `situacao = 'deferida'` (aprovado)

```sql
SELECT EXISTS (
    SELECT 1 FROM horarios
    WHERE data = ?
      AND horario_inicio = ?
      AND agenda_id = ?
      AND situacao = 'deferida'  -- APENAS aprovados bloqueiam
)
```

### 11.3 Por que não Bloqueia `em_analise`?

Propositalmente, horários em análise (`em_analise`) **não bloqueiam** novos pedidos porque:

1. **Flexibilidade UX:** O solicitante pode pedir o mesmo slot que outro está solicitando; deixa para o gestor resolver o conflito.
2. **Evita deadlock:** Se A bloqueia B enquanto está em análise, e depois é rejeitado, B perde a oportunidade.
3. **Decisão do gestor:** O gestor tem `ConflictDetectionService` para ver todos os conflitos e decidir.

### 11.4 Fluxo de Validação Completo

```mermaid
graph TD
    A["Solicitante seleciona slots<br/>no formulário"] -->|StoreReservaRequest| B["HorarioDisponivel::validate()"]
    B -->|Bloqueia se deferida| C["Erro: Slot indisponível"]
    B -->|Permite se em_analise| D["Continua"]
    D -->|Cria reserva| E["ProcessarCriacaoReserva"]
    E -->|Job assíncrono| F["ValidateReservationConflictsJob"]
    F -->|Detecta TODOS os conflitos<br/>em_analise + deferida| G["conflict_cache atualizado"]
    G -->|Gestor vê no AvaliarReservaPage| H["Mostra conflitos visuais"]
    
    style C fill:#ffcdd2
    style H fill:#c8e6c9
```

---

## 12. Topologia de Componentes Frontend (Atomic Design) {#frontend-tree}

O frontend do UniEspaços foi integralmente reestruturado segundo o padrão **Atomic Design** dentro de `resources/js/presentation/`, garantindo separação estrita de responsabilidades, alta reutilização, responsividade nativa (Mobile-First) e conformidade com o design system (Tailwind CSS v4 + tokens semânticos Catppuccin). Os primitivos de interface acessíveis residem isolados em `resources/js/components/ui/`.

### 12.1 Estrutura em Camadas do Atomic Design

```mermaid
graph TD
    subgraph "Primitivos UI (resources/js/components/ui/)"
        P1["button.tsx, card.tsx, dialog.tsx"]
        P2["drawer.tsx (Vaul), popover.tsx, select.tsx"]
        P3["table.tsx, input.tsx, sheet.tsx, etc."]
    end

    subgraph "Átomos (resources/js/presentation/atoms/)"
        A1["SituacaoBadge.tsx, SituacaoIcon.tsx"]
        A2["UserAvatar.tsx, PaginacaoLink.tsx"]
        A3["Heading.tsx, Icon.tsx, TextLink.tsx"]
    end

    subgraph "Moléculas (resources/js/presentation/molecules/)"
        M1["ResponsiveModal.tsx (Dialog/Drawer Híbrido)"]
        M2["DataTable.tsx, DatePicker.tsx, FormField.tsx"]
        M3["ComboboxFiltro.tsx, UserSearchComboBox.tsx"]
        M4["ReservaCard.tsx, FiltroChips.tsx, ConfirmDeleteDialog.tsx"]
    end

    subgraph "Organismos (resources/js/presentation/organisms/)"
        O1["EspacoAgenda.tsx, AgendaCalendario.tsx"]
        O2["EspacoCard.tsx, MobileBottomBar.tsx"]
        O3["EvaluationForm.tsx, ReservasList.tsx, ReservasDetalhes.tsx"]
        O4["TabelaEspacos.tsx, ModaisSetor.tsx, NotificationDropdown.tsx"]
    end

    subgraph "Templates (resources/js/presentation/templates/)"
        T1["AppLayout.tsx, AppSidebarLayout.tsx"]
        T2["AuthLayout.tsx, Layout.tsx (Settings)"]
    end

    subgraph "Páginas (resources/js/presentation/pages/)"
        PG1["Espacos/EspacosPage, VisualizarEspacoPage"]
        PG2["Reservas/ReservasPage, ReservasGestorPage, AvaliarReservaPage"]
        PG3["Administrativo/*, Dashboard/*, auth/*"]
    end

    P1 & P2 & P3 --> A1 & A2 & A3
    A1 & A2 & A3 --> M1 & M2 & M3 & M4
    M1 & M2 & M3 & M4 --> O1 & O2 & O3 & O4
    O1 & O2 & O3 & O4 --> PG1 & PG2 & PG3
    T1 & T2 --> PG1 & PG2 & PG3
```

### 12.2 Fluxo de Componentes no Ciclo de Vida de Reservas

```mermaid
graph TD
    subgraph "Páginas (Inertia Pages)"
        VP["VisualizarEspacoPage.tsx<br/>(Detalhes do Espaço)"]
        RP["ReservasPage.tsx<br/>(Minhas Reservas)"]
        RGP["ReservasGestorPage.tsx<br/>(Gestão de Reservas)"]
        AVP["AvaliarReservaPage.tsx<br/>(Avaliação pelo Gestor)"]
    end

    subgraph "Templates"
        AL["AppLayout.tsx / AppSidebarLayout.tsx"]
    end

    subgraph "Organisms"
        EA["EspacoAgenda.tsx<br/>(Agenda + Seleção de Slots)"]
        AC["AgendaCalendario.tsx<br/>(Grid Semanal por Turno)"]
        ADR["AgendaDialogReserva.tsx<br/>(Modal/Drawer Confirmação)"]
        RL["ReservasList.tsx<br/>(Listagem Desktop & Mobile)"]
        RD["ReservasDetalhes.tsx<br/>(Visualizador de Detalhes)"]
        EF["EvaluationForm.tsx<br/>(Formulário de Deferimento/Recusa)"]
        MBB["MobileBottomBar.tsx<br/>(Navegação Rápida Mobile)"]
    end

    subgraph "Molecules"
        RM["ResponsiveModal.tsx<br/>(Adaptativo Dialog/Drawer)"]
        DT["DataTable.tsx<br/>(Tabela com Paginação & Ordenação)"]
        RCM["ReservaCard.tsx<br/>(Card Canônico de Reserva)"]
        RF["ReservasFilters.tsx<br/>(Filtros por Situação & Período)"]
        FC["FiltroChips.tsx<br/>(Chips Ativos Removíveis)"]
        DP["DatePicker.tsx<br/>(Seletor de Data pt-BR)"]
        CSC["CalendarSlotCell.tsx<br/>(Célula de Horário)"]
        CSS["CalendarShiftSection.tsx<br/>(Turnos Mat/Vesp/Not)"]
    end

    subgraph "Atoms"
        SB["SituacaoBadge.tsx<br/>(Badge Semântico Catppuccin)"]
        UA["UserAvatar.tsx<br/>(Avatar com Fallback)"]
        PL["PaginacaoLink.tsx<br/>(Botão de Navegação)"]
    end

    AL --> VP & RP & RGP & AVP
    AL --> MBB
    VP --> EA
    EA --> AC & ADR
    AC --> CSS --> CSC
    ADR --> RM
    RP --> RF & FC & RL
    RL --> DT & RCM & RD
    RGP --> RF & FC & RL
    AVP --> EF & AC
    RCM --> SB & UA
    DT --> PL
```

### 12.3 Catálogo de Componentes-Chave Modernizados

| Componente | Tipo / Caminho | Responsabilidade e Ergonomia |
|---|---|---|
| `<ResponsiveModal>` | **Molécula**<br>`presentation/molecules/ResponsiveModal.tsx` | Diálogo modal unificado e adaptativo. Renderiza um **Drawer / Bottom Sheet** via Vaul em telas móveis (`< 768px`) com suporte a drag-to-dismiss e ajuste suave ao teclado virtual, e um **Dialog** centralizado via Radix UI em desktops (`>= 768px`). Garante foco, acessibilidade WAI-ARIA e bloqueio de scroll. |
| `<MobileBottomBar>` | **Organismo**<br>`presentation/organisms/MobileBottomBar.tsx` | Barra de navegação inferior estilo *floating dock* para dispositivos móveis. Fornece acesso direto e com ergonomia de polegar às seções principais (*Catálogo*, *Reservas*, *Gestão* e *Perfil*), com badges reativos de notificações e pendências. |
| `<DataTable>` | **Molécula**<br>`presentation/molecules/DataTable.tsx` | Abstração padronizada de tabelas de dados. Fornece cabeçalhos com ordenação interativa, estados vazios (`EmptyState`) ilustrados, skeleton de carregamento, paginação integrada via `<PaginacaoListas>` e seleção de linhas. |
| `<ComboboxFiltro>` / `<UserSearchComboBox>` | **Molécula**<br>`presentation/molecules/ComboboxFiltro.tsx`<br>`presentation/molecules/UserSearchComboBox.tsx` | Seletores de busca assíncrona/debounced com navegação completa por teclado, realce de termos coincidentes e renderização otimizada para listas extensas de usuários, setores e espaços. |
| `<EspacoCard>` | **Organismo**<br>`presentation/organisms/EspacoCard.tsx` | Card visual de apresentação de espaços no catálogo. Apresenta foto/fallback, tags de capacidade, andar, módulo e unidade, botão de favoritar com mutação otimista e acionamento de modal de detalhes em drawer/dialog. |
| `<ReservaCard>` | **Molécula**<br>`presentation/molecules/ReservaCard.tsx` | Componente de card canônico para exibição de reservas, utilizado tanto na listagem de reservas (em viewport mobile via `ReservasList.tsx`) quanto no bloco de reservas recentes do dashboard (em qualquer largura, em grid responsivo). Exibe data, horário, espaço, solicitante, badge de situação semântico (`<SituacaoBadge>`). As ações secundárias (`onAvaliar`, `onEditar`, `onCancelar`) são opcionais; quando não fornecidas, apenas o botão "Ver Detalhes" é renderizado. |
| `<DatePicker>` | **Molécula**<br>`presentation/molecules/DatePicker.tsx` | Seletor de datas acessível integrado com `react-day-picker` v8, totalmente adaptado para React 19 e `date-fns` v4, com localização `pt-BR`, suporte a presets rápidos e bloqueio de dias indisponíveis. |
| `<FiltroChips>` | **Molécula**<br>`presentation/molecules/FiltroChips.tsx` | Barra de chips semânticos que refletem os filtros atualmente aplicados na listagem (situação, data, setor), permitindo remoção individual com um clique ou limpeza geral. |
| `<AgendaCalendario>` / `<EspacoAgenda>` | **Organismo**<br>`presentation/organisms/AgendaCalendario.tsx`<br>`presentation/organisms/EspacoAgenda.tsx` | Grid semanal responsivo dividido por turnos acadêmicos (Matutino, Vespertino, Noturno). Suporta seleção múltipla de slots, smart shift de horários anteriores e destaque visual em tempo real de conflitos. |
| `<EvaluationForm>` | **Organismo**<br>`presentation/organisms/EvaluationForm.tsx` | Interface de avaliação de reservas para o gestor. Permite deferimento/indeferimento pontual por slot ou em lote, com campo obrigatório para justificativa de recusa. |
| `<DeleteItem>` / `<ConfirmDeleteDialog>` | **Molécula**<br>`presentation/molecules/DeleteItem.tsx`<br>`presentation/molecules/ConfirmDeleteDialog.tsx` | Diálogo de confirmação de exclusão e cancelamento de reservas, com suporte à confirmação via senha do usuário para operações de alta criticidade e soft-delete. |

### 12.4 Resumo das Camadas no Atomic Design

| Camada | Diretório | Critérios e Conteúdo | Restrições |
|---|---|---|---|
| **Primitivos UI** | `resources/js/components/ui/` | Componentes base Shadcn / Radix UI / Vaul (`button.tsx`, `dialog.tsx`, `drawer.tsx`, `card.tsx`, `table.tsx`, `input.tsx`). | Sem regras de negócio da UESB nem chamadas Inertia. |
| **Átomos** | `resources/js/presentation/atoms/` | Elementos de UI indivisíveis (`SituacaoBadge.tsx`, `UserAvatar.tsx`, `PaginacaoLink.tsx`, `Heading.tsx`, `Icon.tsx`). | Sem estado complexo de formulário ou mutações HTTP. |
| **Moléculas** | `resources/js/presentation/molecules/` | Combinações funcionais com objetivo específico (`ResponsiveModal.tsx`, `DataTable.tsx`, `DatePicker.tsx`, `FormField.tsx`, `ComboboxFiltro.tsx`). | Foco em uma única responsabilidade funcional. |
| **Organismos** | `resources/js/presentation/organisms/` | Blocos autônomos de UI (`EspacoCard.tsx`, `AgendaCalendario.tsx`, `EvaluationForm.tsx`, `MobileBottomBar.tsx`, `SetorForm.tsx`). | Reutilizáveis dentro de páginas; não representam a página inteira. |
| **Templates** | `resources/js/presentation/templates/` | Esqueletos estruturais de layout (`AppLayout.tsx`, `AppSidebarLayout.tsx`, `AuthLayout.tsx`, `Settings/Layout.tsx`). | Não acoplados a dados específicos de uma entidade. |
| **Páginas** | `resources/js/presentation/pages/` | Telas completas renderizadas pelo Inertia (`Espacos/*`, `Reservas/*`, `Administrativo/*`, `Dashboard/*`, `auth/*`). | Montam a composição de templates, organismos e moléculas. |

---

## 13. Camada de Arquitetura Backend {#arquitetura}

```mermaid
graph TD
    subgraph "HTTP Layer"
        RC["ReservaController\n(CRUD do Solicitante)"]
        GRC["GestorReservaController\n(avaliação)"]
        RP2["ReservaPolicy\n(autorização)"]
    end

    subgraph "Service Layer"
        RS["ReservaService\n(orquestra lógica)"]
        CDS["ConflictDetectionService\n(SQL de conflito)"]
    end

    subgraph "Jobs (Queue)"
        PCR["ProcessarCriacaoReserva"]
        URJ["UpdateReservaJob"]
        ARJ["AvaliarReservaJob"]
        VCJ["ValidateReservationConflictsJob"]
    end

    subgraph "Repository Layer"
        RRI["ReservaRepositoryInterface"]
        RRE["ReservaRepositoryEloquent"]
        ARI["AgendaRepositoryInterface"]
        ARE["AgendaRepositoryEloquent"]
    end

    subgraph "Models"
        MR["Reserva"]
        MH["Horario"]
        MA["Agenda"]
        ME["Espaco"]
        MU["User"]
    end

    RC --> RS
    GRC --> RS
    RC --> RP2
    GRC --> RP2

    RS --> PCR
    RS --> URJ
    RS --> ARJ
    RS --> CDS
    RS --> RRI

    ARJ --> CDS
    VCJ --> CDS

    PCR --> MR & MH & MA
    URJ --> MR & MH
    ARJ --> MH & MR

    RRI --> RRE
    ARI --> ARE
    RRE --> MR
    ARE --> MA
```

---

## 14. Gaps Identificados e Próximos Passos {#gaps}

Com base na análise do código, os seguintes pontos foram identificados como oportunidades de melhoria:

### 14.1 🔴 Crítico

| # | Gap | Descrição | Impacto |
|---|-----|-----------|---------|
| 1 | **Atualização automática da tela do Gestor** | A `AvaliarReservaPage` exibe loading para `validation_status = processing`, mas **não há polling nem evento Reverb** para recarregar automaticamente quando o `ValidateReservationConflictsJob` termina. O gestor precisa recarregar a página manualmente. | UX ruim em reservas grandes |
| 2 | **Update de reserva não regenera conflitos** | O `UpdateReservaJob` atualiza os horários mas **não dispara `ValidateReservationConflictsJob`** depois. O `conflict_cache` fica desatualizado após edição. | Dados de conflito inconsistentes |
| 3 | **Escopo de avaliação `recurring` ignora gestor** | No `AvaliarReservaJob` com `scope=recurring`, a propagação busca horários por `agenda_id` do gestor, mas **não restringe ao conjunto de agendas que o gestor gerencia** globalmente — apenas às da reserva. Se um espaço tiver múltiplos gestores, o primeiro a avaliar pode propagar para agendas de outro gestor. | Conflito de responsabilidade |

### 14.2 🟡 Melhorias Importantes

| # | Gap | Descrição |
|---|-----|-----------|
| 4 | **Notificação por e-mail sem template HTML** | O `BaseNotification.toMail()` usa `MailMessage` básico com texto puro. Não há template de e-mail customizado. |
| 5 | **Sem paginação no ReservasGestorPage** | A listagem de reservas do gestor usa paginação igual ao solicitante, mas a query não filtra por período — traz todas as reservas das agendas do gestor. Pode ser lento em produção. |
| 6 | **Política de update muito restritiva** | `ReservaPolicy.update()` bloqueia edição se qualquer horário tiver sido avaliado individualmente. Se apenas 1 de 50 horários foi avaliado, o solicitante perde a capacidade de editar os outros. |
| 7 | **Falta feedback em tempo real para o Solicitante** | Ao criar uma reserva, o solicitante vê apenas um flash "sendo processado". Não há indicador visual do progresso do job nem da validação de conflitos. |

### 14.3 🟢 Evoluções Futuras

| # | Sugestão | Descrição |
|---|----------|-----------|
| 8 | **Dashboard com métricas** | O `HomeController` e `HomeService` existem mas não têm dados consolidados de ocupação por espaço/turno. |
| 9 | **Aprovação parcial granular** | Atualmente o gestor pode deferir/indeferir por slot individual, mas o status `parcialmente_deferida` não tem fluxo claro de "o que fazer a seguir". |
| 10 | **Histórico de avaliações** | Não há log de quem avaliou o quê e quando além do `user_id` no `Horario`. Falta audit trail completo. |
| 11 | **Notificações em tempo real completas** | O Reverb está configurado e o `notification-dropdown.tsx` existe, mas os eventos de broadcast só notificam novas notificações — não recarregam dados das páginas automaticamente. |

---

## 14.4 Leitura Recomendada para Próximas Tarefas

- **Autorização e Políticas:** Ver `app/Policies/ReservaPolicy.php` para regras de acesso e `authorization-policies.md` para fluxo completo
- **Enums e Constantes:** Ver `app/Enums/SituacaoReserva/` para SituacaoReservaEnum e ModoArquivoEnum
- **Validações Detalhadas:** Ver `validation-rules.md` para rules customizadas (HorarioDisponivel, etc.)
- **Models e Relações:** Ver `models-business-rules.md` para detalhe de campos e relacionamentos

---

## 15. Referências de Código {#referências}

| Arquivo | Responsabilidade |
|---------|-----------------|
| [`ReservaController.php`](../app/Http/Controllers/ReservaController.php) | CRUD HTTP do solicitante |
| [`GestorReservaController.php`](../app/Http/Controllers/Gestor/GestorReservaController.php) | HTTP de avaliação do gestor |
| [`ReservaService.php`](../app/Services/ReservaService.php) | Orquestração e despacho de jobs |
| [`ProcessarCriacaoReserva.php`](../app/Jobs/ProcessarCriacaoReserva.php) | Job de criação assíncrona |
| [`UpdateReservaJob.php`](../app/Jobs/UpdateReservaJob.php) | Job de atualização assíncrona |
| [`AvaliarReservaJob.php`](../app/Jobs/AvaliarReservaJob.php) | Job de avaliação do gestor |
| [`ValidateReservationConflictsJob.php`](../app/Jobs/ValidateReservationConflictsJob.php) | Job de validação de conflitos |
| [`ConflictDetectionService.php`](../app/Services/ConflictDetectionService.php) | SQL de detecção de conflitos |
| [`ReservaPolicy.php`](../app/Policies/ReservaPolicy.php) | Autorização de ações na reserva |
| [`BaseNotification.php`](../app/Notifications/BaseNotification.php) | Base para todas as notificações |
| [`EspacoAgenda.tsx`](../resources/js/presentation/organisms/EspacoAgenda.tsx) | Organismo principal de seleção de slots |
| [`AgendaDialogReserva.tsx`](../resources/js/presentation/organisms/AgendaDialogReserva.tsx) | Modal de confirmação de reserva |
| [`AvaliarReservaPage.tsx`](../resources/js/presentation/pages/Reservas/Gestor/AvaliarReservaPage.tsx) | Página de avaliação do gestor |
| [`EvaluationForm.tsx`](../resources/js/presentation/organisms/EvaluationForm.tsx) | Formulário de avaliação |
