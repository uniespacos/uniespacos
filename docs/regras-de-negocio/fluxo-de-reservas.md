# Fluxo de reservas
> Última atualização: 2026-11-21 | Fluxo central de reservas: estados, criação, avaliação, cascata de revalidação, cancelamento e notificações

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
12. [Componentes Frontend](#frontend-tree)
13. [Arquitetura Backend](#arquitetura)
14. [Pendências](#gaps)
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

Ver seção [10. Eixos de Filtro](#eixos-de-filtro) e [`arquivamento.md`](./arquivamento.md).

### 3.2 Diagrama de Transição de Estados

```mermaid
stateDiagram-v2
    [*] --> em_analise : Solicitante submete reserva<br/>(ProcessarCriacaoReserva Job)
    em_analise --> deferida : Todos os horários deferidos<br/>(AvaliarReservaJob)
    em_analise --> indeferida : Todos os horários indeferidos<br/>(AvaliarReservaJob)
    em_analise --> parcialmente_deferida : Mix de deferidos + outros<br/>(AvaliarReservaJob)
    em_analise --> inativa : Solicitante cancela<br/>(ReservaService.cancel)
    deferida --> inativa : Solicitante cancela<br/>(ReservaService.cancel)
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

Se o solicitante for o único gestor de todas as agendas da reserva, a reserva e seus horários nascem `deferida`; se ele gerencia apenas algumas, a reserva nasce `parcialmente_deferida`. Regra completa e casos de borda em [`auto-aprovacao.md`](./auto-aprovacao.md).

---

## 4. Fluxo Completo de Criação de Reserva {#fluxo-criação}

### 4.1 Frontend — Seleção de Slots e modal de solicitação

```mermaid
graph TD
    A["EspacosPage<br/>(filtro Quando?: data e turno)"] -->|"card: N horários livres"| B["VisualizarEspacoPage<br/>(?semana=data)"]
    B --> C["EspacoAgenda<br/>(Organism)"]
    C --> D["AgendaCalendario<br/>(Organism)<br/>Grid semanal"]
    D -->|"clique, Shift+clique (desktop)<br/>ou marcar o turno do dia"| E["Estado: slotsSelecao[]"]
    E -->|">0 slots selecionados"| F["AgendaDialogReserva<br/>→ ReservaStepperModal"]
    F -->|"passo 1: Detalhes"| G["Revisar"]
    G -->|"passo 2: Revisão"| H["Enviar solicitação<br/>POST /reservas"]
    H --> I["Tela de sucesso<br/>no próprio modal"]
```

#### 4.1.1 Passos do modal de solicitação

O modal tem dois passos (`useReservaStepper`): **Detalhes** e **Revisão**. Na edição, o passo 1 também traz o escopo da alteração e o CTA do passo 2 vira "Salvar alterações".

| Passo | O que a pessoa faz | Regra |
|---|---|---|
| 1. Detalhes | Título, detalhes para o gestor, público estimado, categoria e a recorrência | Obrigatórios: ao menos um slot, datas válidas e título. Público estimado, se preenchido, precisa ser válido. Detalhes e categoria são opcionais. A recorrência tem padrão `unica`. "Revisar" só avança sem erro neste passo |
| 2. Revisão | Confere o resumo e os horários a gravar, resolve conflitos e aceita o termo | Envio bloqueado enquanto houver conflito por slot. Termo obrigatório |

```mermaid
flowchart TD
    A["Passo 1: Detalhes"] -->|"Revisar"| B{"Erro no passo 1?"}
    B -->|"sim"| A
    B -->|"não"| C["Passo 2: Revisão"]
    C --> D{"Algum slot em conflito?"}
    D -->|"sim"| E["Remover horários em conflito<br/>ou voltar aos detalhes"]
    E --> C
    D -->|"não"| F{"Termo aceito?"}
    F -->|"não"| C
    F -->|"sim"| G["Enviar solicitação"]
    G --> H["Tela de sucesso:<br/>Ver minhas reservas ou<br/>Fazer outra solicitação"]
```

- **Resumo:** no passo 2, horários contíguos do mesmo dia viram um período só ("Qui, 20/11 · 13:10–15:40"). O total de horários a gravar considera a recorrência escolhida.
- **Recorrência:** o switch "Repetir esta reserva?" grava `recorrencia`. Desligado = `unica`. Ligado = `15dias`, `1mes` ou `personalizado` (esta última com data final editável). A expansão não mudou: ver [recorrência](./recorrencia.md#visão-geral).
- **Conflitos:** cada slot em conflito é marcado. O conflito vem de horários já deferidos (dados já carregados na tela) e também da checagem em tempo real. O botão "Remover horários em conflito" tira esses slots da seleção. A checagem em tempo real só roda no passo 2.
- **Sucesso:** na criação, o `store` devolve `back()` e o modal troca para "Solicitação enviada!" (`sucessoCriacao`). Na edição, o modal fecha com toast. Os textos estão em `pt-BR`, `en` e `es`.

### 4.2 Backend — Processamento Assíncrono

O job de criação é uma casca: deserializa os dados, chama `CriacaoDeReservaService::criar()`, trata a falha e, só depois do commit, dispara os efeitos externos. A regra de negócio (reserva, expansão, trava, conflito e auto-aprovação) fica no service, testável sem fila.

```mermaid
sequenceDiagram
    participant Browser
    participant ReservaController
    participant ReservaService
    participant Queue as "Queue Worker"
    participant Job as "ProcessarCriacaoReserva (casca)"
    participant Service as "CriacaoDeReservaService"
    participant DB as "PostgreSQL"
    participant ValidateJob as "ValidateReservationConflictsJob"
    participant Notification

    Browser->>ReservaController: POST /reservas (dados validados)
    ReservaController->>ReservaService: create(data, user)
    ReservaService->>Queue: ProcessarCriacaoReserva::dispatch(data, user)
    ReservaController-->>Browser: back() (sem redirect, a tela de sucesso aparece no modal)

    Queue->>Job: handle()
    Job->>Service: criar(dados, solicitante)
    Service->>DB: BEGIN
    Service->>DB: INSERT reservas (situacao='em_analise')
    Service->>DB: expande horários e resolve a situação de cada agenda
    Service->>DB: TravaDeHorarios::adquirir (SELECT ... FOR UPDATE por agenda e período)
    Service->>DB: conflitosDeferidos(linhas): se houver, ConflitoDeHorarioException (nada é gravado)
    Service->>DB: INSERT horarios, atualiza data_inicial, data_final e situacao (auto-aprovação)
    Service->>DB: COMMIT
    Service-->>Job: [reserva, gestores]

    Job->>Notification: NewReservationNotification → gestores (se não auto-aprovada)
    Job->>Queue: ValidateReservationConflictsJob::dispatch(reserva)
    Job->>Notification: ReservationCreatedNotification → solicitante (mail suprimido em auto-aprovação)
    Job->>Job: publicar 'created' (ReservaAlterada + ReservaEvent, por último)

    Queue->>ValidateJob: handle()
    ValidateJob->>DB: UPDATE reservas SET validation_status='processing'
    ValidateJob->>DB: conflitos deferidos por agenda e data (ConflictDetectionService)
    ValidateJob->>DB: UPDATE reservas SET conflict_cache=JSON, validation_status='completed'
    ValidateJob->>ValidateJob: publicar 'validated' (só ReservaEvent, falha não grava 'failed')
```

Os services de domínio são `CriacaoDeReservaService` (criação), `EdicaoDeReservaService` (edição) e `AvaliacaoDeReservaService` (avaliação do gestor). Os três jobs ficam como casca: o retry e o tratamento de falha estão na seção [4.5](#retry-e-falhas-dos-jobs).

### 4.2.1 Defesa Contra Race Condition: Trava e Revalidação sob Lock

Há uma janela de tempo entre a validação síncrona de conflitos (na requisição HTTP, que apenas bloqueia slots já aprovados) e a inserção real dos novos horários (que ocorre quando o job roda). Duas requisições concorrentes poderiam ambas passar na validação e ambas inserirem horários sobrepostos.

A defesa tem duas etapas, usadas pela criação e pela edição:

1. **Trava pessimista (`TravaDeHorarios::adquirir`):** adquire `lockForUpdate` sobre os horários das agendas afetadas, dentro do período da reserva (menor e maior data das linhas). Os `agenda_id` são deduplicados e ordenados antes do lock, para evitar deadlock entre transações concorrentes. A trava exige transação aberta: fora dela o lock seria liberado na hora, e o método lança `LogicException`.

2. **Revalidação sob lock (`conflitosDeferidos`):** com a trava adquirida, as linhas novas são checadas contra os horários já deferidos. Se alguma colidir, o service lança `ConflitoDeHorarioException` antes de qualquer `INSERT`, e a transação faz rollback (inclusive o `INSERT` da própria reserva). O critério é o mesmo de todas as validações de conflito: ver [seção 11](#validação-conflitos).

A edição usa a mesma trava e a mesma regra, excluindo a própria reserva da checagem (`ignorarReservaId`), para não acusar conflito com horários antigos que ela mesma está substituindo:
- **Escopo `recurring`:** a trava cobre as agendas afetadas dentro do período da série; a revalidação roda sobre as linhas expandidas, antes da gravação.
- **Escopo `single`:** só entram os slots da semana de `edited_week_date`. A identidade de cada horário é `agenda_id|data|horario_inicio` (a mesma do índice único da tabela), não o `id`. Os horários que saíram do payload são apagados, os novos são criados e os coincidentes são mantidos, preservando situação, justificativa e avaliador. Ao final, `data_inicial` e `data_final` são recalculadas pelo menor e pelo maior horário restante.
- **Escopos e propagação:** a diferença entre os dois escopos, a propagação do escopo `recurring` às demais semanas e o trade-off de editar só uma semana estão em [`recorrencia.md`, seção 5](./recorrencia.md#5-edição-de-reserva-escopos).

### 4.2.2 Dados da solicitação e aceite do termo

O modal grava três dados novos na própria reserva. Migration `2026_11_19_120000`: colunas nullable, sem default e sem índice.

| Campo na reserva | Origem no request | Como é gravado | Visibilidade |
|---|---|---|---|
| `publico_estimado` (int) | `publico_estimado` (1 a 5000) | Valor informado, ou `null` | Gestor (`ReservaInfoCard`) e solicitante (`ReservasDetalhes`), só quando preenchido |
| `categoria` (varchar 100) | `categoria` | Texto livre, ou `null` | Igual ao público. Neutralizada por `base:anonimizar` |
| `termo_aceito_em` (timestamp) | `termo_responsabilidade` (`accepted`) | `ReservaService` converte o aceite em instante (`now()` no request) e remove o campo do payload. O job grava o instante | Oculto na serialização (`$hidden`). Nenhuma tela mostra |

- Na edição, se o termo vier de novo, o instante é regravado.
- Jobs enfileirados antes do deploy não trazem as chaves novas: `ProcessarCriacaoReserva` grava `null`, e `UpdateReservaJob` só grava as chaves presentes, para não apagar dado existente.

### 4.3 Pipeline de Validação de Conflitos

O field `validation_status` acompanha o progresso do `ValidateReservationConflictsJob`:

| Status | Significado | Transição automática |
|--------|-------------|-----|
| `pending` | Job não iniciado ainda | → `processing` quando job inicia |
| `processing` | Job rodando, detectando conflitos | → `completed` ou `failed` |
| `completed` | Validação terminada com sucesso; `conflict_cache` está atualizado | Permanece até próxima revalidação |
| `failed` | Erro de domínio ou tentativas esgotadas (3, com backoff de 30 s e 60 s); cache pode estar desatualizado | Gravado em `failed()`, que também publica `validated` para a tela sair de "processando". Sem reparo automático: reservas presas em `processing` ficam para o backlog (S80) |

**Nota:** Durante `pending` ou `processing`, a `AvaliarReservaPage` (gestor) exibe um spinner e bloqueia avaliação, pois não há conflitos verificados ainda.

### 4.4 Efeitos Depois do Commit {#efeitos-pos-commit}

Os efeitos externos de uma alteração de reserva só rodam depois que a transação foi commitada. Os jobs e o service de avaliação só chamam esses efeitos depois do retorno do service, nunca dentro de `DB::transaction`.

```mermaid
flowchart TD
    C["Commit da transação<br/>(service de domínio)"] --> N["notify() por destinatário<br/>(try-catch: falha vira warning)"]
    N --> V["ValidateReservationConflictsJob::dispatch<br/>(falha vira warning)"]
    V --> P["ReservaBroadcaster::publicar()"]
    P --> A["ReservaAlterada: invalida cache de relatórios<br/>(só created, updated, evaluated e canceled)"]
    A --> E["ReservaEvent: tempo real<br/>(falha vira warning)"]
```

| Ordem | Efeito | Se falhar |
|-------|--------|-----------|
| 1 | Validação de conflitos (`ValidateReservationConflictsJob`, na criação, edição e cascata de avaliação) | Falha ao despachar vira warning. Falha do próprio job grava `validation_status = 'failed'` (após retries) |
| 2 | Notificações (`notify()` em try-catch, uma por destinatário) | `Log::warning`; o fluxo segue |
| 3 | Publicação (`ReservaBroadcaster::publicar()`): primeiro `ReservaAlterada` (cache de relatórios, só para `created`, `updated`, `evaluated` e `canceled`) e depois `ReservaEvent` (tempo real) | A falha de `ReservaAlterada` e a de `ReservaEvent` viram `Log::warning`; não alteram a situação, o `validation_status` nem as notificações |

A publicação é sempre o último passo. A exceção de status é `validated`: depois de gravar `completed`, falha de broadcast não regrava `failed`. O cancelamento segue a mesma regra, com a revalidação de reservas em conflito antes da publicação (ver [seção 8](#cancelamento)).

Nenhum efeito pós-commit relança exceção para o job. Isso vale para o despacho de `ReservaAlterada`, para `ReservaEvent` e para a publicação chamada por `AvaliacaoDeReservaService::aposCommit` e `UpdateReservaJob`, que separa em try distintos o despacho da revalidação e o broadcast. Com o retry da S33, um job que relançasse essa falha rodaria de novo e duplicaria a avaliação e as notificações já gravadas.

Cada ponto de uso resolve o efeito pós-commit no próprio fluxo. O `config/queue.php` mantém `after_commit => false` nas quatro conexões, por decisão: uma ligação global mudaria o momento de todos os jobs do sistema, e o efeito já é tratado onde ele nasce.

### 4.5 Retry e Falhas dos Jobs {#retry-e-falhas-dos-jobs}

Os jobs separam dois tipos de falha. A regra completa, com exemplos, está em [`arquitetura/erros-e-logs.md`](../arquitetura/erros-e-logs.md#domínio-e-transitório).

| Job | `tries` | Erro de domínio (`DominioException`) | Erro transitório (banco, timeout, rede) |
|-----|---------|--------------------------------------|------------------------------------------|
| `ProcessarCriacaoReserva` | 1 | `fail()` sem retry; `failed()` avisa o solicitante | Relançado; como `tries = 1`, falha de vez. Não é idempotente (I8): uma nova tentativa poderia gravar a reserva duas vezes |
| `UpdateReservaJob` | 3, backoff 30 s e 60 s | `fail()` sem retry | Relançado e reagendado; esgotadas as tentativas, `failed()` notifica o solicitante |
| `AvaliarReservaJob` | 3 | `fail()` sem retry (ex.: reserva arquivada, escopo inválido, horário fora da autorização do gestor) | Relançado e reagendado; `failed()` só registra em log (ver backlog S81) |
| `ValidateReservationConflictsJob` | 3, backoff 30 s e 60 s | `fail()` sem retry; `failed()` também grava `validation_status = failed` e publica `validated` (o cálculo de conflitos não lança exceção de domínio hoje) | Relançado e reagendado; `failed()` grava `validation_status = failed` e publica `validated` |

```mermaid
flowchart TD
    J["Job.handle() chama o service"] --> R{"Que tipo de erro?"}
    R -->|"DominioException<br/>(regra de negócio)"| F["fail($e): sem retry<br/>log de aviso"]
    R -->|"Outro Throwable<br/>(infraestrutura)"| T["Relança: o worker<br/>reagenda até tries"]
    T --> E{"Tentativas<br/>esgotadas?"}
    E -->|"não"| J
    E -->|"sim"| FL["failed(): notifica ou grava<br/>o estado final da reserva"]
    F --> FL
```

Efeitos pós-commit (notificação, despacho e publicação) não entram nesse fluxo: a falha deles vira aviso e não marca o job como falho, para não repetir um trabalho que já foi commitado.

### Disponibilidade na lista de espaços

O filtro "Quando?" da lista de espaços mostra só os espaços com ao menos um horário livre na data e no turno escolhidos. É uma opção da página do usuário comum: a listagem administrativa não usa o filtro. O filtro roda em SQL, no `EspacoRepositoryEloquent::getPaginatedForPublic`, antes da paginação.

```mermaid
flowchart TD
    A["Slot da grade do turno<br/>(config reservas.horarios_por_turno)"] --> B{"Agenda tem gestor?"}
    B -->|"não"| X["Não conta"]
    B -->|"sim"| C{"Há horário deferido<br/>na agenda, na data e com o<br/>mesmo horario_inicio?"}
    C -->|"sim"| X
    C -->|"não"| D{"A data é hoje e<br/>o slot já começou?"}
    D -->|"sim"| X
    D -->|"não"| E["Slot livre"]
```

| Regra | Detalhe |
|---|---|
| Ocupação | Só `deferida` ocupa. `em_analise` não ocupa (ver [validação](./validacao.md#horários-em-análise-107)) |
| "Hoje" | Calculado no fuso `config('reservas.fuso_horario')`, America/Bahia. Slots já iniciados não contam |
| Turno | Opcional. Sem data, o turno é ignorado |
| Resultado | Espaços com ao menos um slot livre. Cada espaço da página recebe `horarios_livres` (número), em uma consulta agrupada |
| Na tela | Selo "N horários livres" no card, com link para `/espacos/{id}?semana=<data>` |

A grade fica em `config/reservas.php`, espelho do `HORARIOS_PADRAO` de `resources/js/constants/turnos.ts`. Os dois mudam juntos: o calendário e o filtro precisam mostrar os mesmos slots. O `app.timezone` é UTC, por isso a regra usa o fuso próprio.

---

## 5. Fluxo de Avaliação pelo Gestor {#fluxo-avaliação}

### 5.1 Frontend — Tela de Avaliação

```mermaid
graph TD
    A["ReservasGestorPage<br/>(Listagem com filtros)"] -->|"Ver detalhes"| B["AvaliarReservaPage<br/>(Página de Avaliação)"]
    B --> C["Card de Informações<br/>da Reserva (título, solicitante, período)"]
    B --> D["AgendaNavegacaoGestor<br/>(Molecule)<br/>Navegação semana a semana"]
    B --> E["CalendarReservationDetails<br/>(Molecule)<br/>Calendário de slots com status visual"]
    E -->|"avaliarSlot()"| F["useReservationSlots Hook<br/>Estado: slotsSelecao[]"]
    F -->|Sincroniza| G["EvaluationForm<br/>(Organism)"]
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
    participant AvaliarJob as "AvaliarReservaJob (casca)"
    participant AvaliacaoSvc as "AvaliacaoDeReservaService"
    participant ConflictService as "ConflictDetectionService"
    participant DB
    participant ValidateJob as "ValidateReservationConflictsJob"
    participant Notification

    Browser->>GestorCtrl: PATCH /gestor/reservas/{id} (horarios_avaliados, evaluation_scope, motivo)
    GestorCtrl->>GestorCtrl: authorize('evaluateForGestor', reserva)<br/>Verifica se gestor gerencia alguma agenda da reserva
    GestorCtrl->>ReservaService: evaluate(reserva, data, gestor)
    ReservaService->>Queue: AvaliarReservaJob::dispatch(reserva, data, gestor)
    GestorCtrl-->>Browser: redirect → gestor.reservas.index (flash "processando")

    Queue->>AvaliarJob: handle()
    AvaliarJob->>AvaliacaoSvc: avaliar(reserva, dados, gestor, locale)
    AvaliacaoSvc->>AvaliacaoSvc: reserva arquivada? escopo válido? horários dentro das agendas do gestor?
    AvaliacaoSvc->>ConflictService: findConflictsFor(reserva.id)
    ConflictService->>DB: conflitos com horários deferidos (regra única, seção 11)
    DB-->>ConflictService: mapa horario_id → conflito

    alt evaluation_scope === 'single'
        AvaliacaoSvc->>DB: UPDATE em lote por grupo de decisão, na semana visível<br/>Se conflitante → força 'indeferida'
    else evaluation_scope === 'recurring'
        AvaliacaoSvc->>DB: UPDATE conflitantes → 'indeferida' + justificativa
        AvaliacaoSvc->>DB: UPDATE em lote os horários recorrentes não conflitantes<br/>Propaga status para toda a série
    end

    AvaliacaoSvc->>DB: atualizarSituacaoGeral()<br/>Recalcula situacao da Reserva pelo agregado dos Horarios
    AvaliacaoSvc->>DB: COMMIT

    Note over AvaliacaoSvc: depois do commit
    alt Algum horário foi aprovado (deferida)?
        AvaliacaoSvc->>Queue: revalidarConflitos(): ValidateReservationConflictsJob::dispatch(reserva_afetada)<br/>para cada reserva que compartilha (data, agenda_id)
    end

    AvaliacaoSvc->>Notification: ReservationEvaluatedNotification → Solicitante (try-catch)
    AvaliacaoSvc->>AvaliacaoSvc: publicar 'evaluated' (ReservaAlterada + ReservaEvent, por último)
```

---

## 6. Regra de Status Agregado da Reserva {#status-agregado}

A situação final da `Reserva` é calculada em `AvaliacaoDeReservaService::atualizarSituacaoGeral()`, dentro da transação da avaliação. Uma reserva sem horários fica `indeferida`:

```mermaid
flowchart TD
    A["Conta horários por situação"] --> B{"Todos 'deferida'?"}
    B -->|Sim| C["situacao = 'deferida'"]
    B -->|Não| D{"Todos 'indeferida'?"}
    D -->|Sim| E["situacao = 'indeferida'"]
    D -->|Não| F{"Algum 'em_analise'?"}
    F -->|Sim| G["situacao = 'em_analise'"]
    F -->|Não| H["situacao = 'parcialmente_deferida'<br/>(mix de deferida + indeferida)"]
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

1. **Identificação de aprovações:** `AvaliacaoDeReservaService` detecta quais horários foram aprovados (status `deferida`) nesta avaliação. A revalidação roda depois do commit, em `revalidarConflitos()`.

2. **Busca de afetadas** (`ReservaRepositoryEloquent::reservasParaRevalidarAposAprovacao`): procura outras reservas que:
   - Estão em `situacao` `em_analise` ou `parcialmente_deferida` (ainda com horários pendentes)
   - Têm `validation_status = 'completed'` (já validadas)
   - Compartilham pelo menos um slot (`data`, `agenda_id`) com os horários recém-aprovados

3. **Revalidação:** Para cada reserva afetada, dispara `ValidateReservationConflictsJob` para:
   - Re-detectar conflitos contra os novos horários aprovados
   - Atualizar `conflict_cache` com conflitos atualizados

### 7.2 Diagrama

```mermaid
graph TD
    A["AvaliacaoDeReservaService aprova Horários<br/>da Reserva A (após o commit)"] -->|Identifica aprovações| B["Lista de slots aprovados:<br/>data, agenda_id"]
    B -->|Busca afetadas| C["Query: Reservas em_analise ou parcialmente_deferida,<br/>validation_status=completed,<br/>que compartilham slots"]
    C -->|Para cada reserva| D["ValidateReservationConflictsJob<br/>dispatchado"]
    D -->|Atualiza| E["conflict_cache da reserva"]
    
    style A fill:#e1f5ff
    style E fill:#c8e6c9
```

### 7.3 Exemplo Prático

- **Reserva A:** Solicitante pede segundo-feira 14h na Agenda X. Fica em análise.
- **Reserva B:** Outro solicitante pede segunda-feira 14h na mesma Agenda X. Fica em análise, sem conflitos iniciais (pois A ainda não foi aprovada).
- **Gestor aprova A:** `ValidateReservationConflictsJob` roda e marca os horários de A como `deferida`.
- **Cascata:** o service de avaliação detecta que B compartilha a mesma Agenda+Data+Hora e despacha um novo `ValidateReservationConflictsJob` para B, depois do commit.
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
    ReservaService->>ReservaService: revalida reservas em conflito (despacha ValidateReservationConflictsJob)
    ReservaService->>ReservaService: publicar 'canceled' (ReservaAlterada + ReservaEvent, por último)
    ReservaController-->>Browser: redirect back (flash "cancelada")
```

> **Nota:** O cancelamento é **síncrono** (não usa job/queue), diferente da criação e avaliação. Os efeitos depois do commit (avisos, revalidação e publicação) seguem a ordem da [seção 4.4](#efeitos-pos-commit).

---

## 9. Sistema de Notificações {#notificações}

Todas as notificações relacionadas a reserva estendem `BaseNotification` que implementa `ShouldQueue`:

### 9.1 Canais de Entrega

| Canal | Tecnologia | Timing | Quando suprimido |
|-------|-----------|--------|-----------------|
| `database` | Laravel notifications table | Sempre ativo | Nunca |
| `broadcast` | Laravel Reverb (WebSocket) | Entrega em tempo real | Nunca |
| `mail` | SMTP / Mailtrap | Assíncrono (fila) | Em auto-aprovação (veja 9.3) |

O canal `broadcast` permite que o frontend (`resources/js/presentation/organisms/NotificationDropdown.tsx`) receba notificações em tempo real via WebSocket.

### 9.2 Notificações de Reserva

| Notificação | Destinatário | Disparada por | Quando |
|-------------|---|---|---|
| `NewReservationNotification` | Gestores das agendas | `ProcessarCriacaoReserva` | Quando nova reserva é criada (se não auto-aprovada) |
| `ReservationCreatedNotification` | Solicitante | `ProcessarCriacaoReserva` | Após criação (sempre, mas mail suprimido em auto-aprovação) |
| `ReservationEvaluatedNotification` | Solicitante | `AvaliarReservaJob` | Após gestor avaliar e finalizar a reserva |
| `ReservationCanceledNotification` | Gestores afetados | `ReservaService.cancel()` | Quando solicitante cancela a reserva |
| `ReservationUpdatedNotification` | Solicitante | `UpdateReservaJob` | Após edição da reserva (atualização de horários) |
| `ReservationFailedNotification` | Solicitante | `ProcessarCriacaoReserva.failed()` | Quando a criação falha. O job tem `tries = 1`, então a falha é definitiva na primeira tentativa |
| `ReservationUpdateFailedNotification` | Solicitante | `UpdateReservaJob.failed()` | Quando atualização falha após 3 retries |

### 9.3 Supressão de E-mail em Auto-Aprovação

Na auto-aprovação, `BaseNotification::via()` omite o canal `mail` para o solicitante quando ele é o único gestor de todas as agendas da reserva (restam `database` e `broadcast`). Detalhes em [`auto-aprovacao.md`](./auto-aprovacao.md).

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

As listagens de reservas filtram por dois eixos independentes:

- **Avaliação** (`situacao`): `em_analise`, `deferida`, `indeferida`, `parcialmente_deferida`. O filtro aceita somente esses valores.
- **Arquivo** (`arquivo`): `ativas` (padrão), `arquivadas` (`situacao = 'inativa'`) ou `todas`. Enum `ModoArquivoEnum` (`app/Enums/Reserva/ModoArquivoEnum.php`), aplicado pelo scope `Reserva::scopeArquivo` (`app/Models/Reserva.php`).

Detalhes, normalização de `?situacao=inativa` e cenários de uso: [`arquivamento.md`](./arquivamento.md).

---

## 11. Validação de Conflitos: Regra HorarioDisponivel {#validação-conflitos}

### 11.1 O que é a Regra?

`HorarioDisponivel` (`app/Rules/HorarioDisponivel.php`) é uma regra de FormRequest executada no **backend**, aplicada a `horarios_solicitados.*.agenda_id` em `StoreReservaRequest` e `UpdateReservaRequest`. A regra completa está em [`validacao.md`](./validacao.md).

### 11.2 Condição de Bloqueio

A regra é única no backend: `HorarioRepository::conflitosDeferidos()` resolve todas as linhas em uma consulta. Usam essa mesma regra `HorarioDisponivel` (validação do formulário), `ConflictDetectionService` (leitura para o gestor), `CriacaoDeReservaService` e `EdicaoDeReservaService` (sob trava). Um horário solicitado é **indisponível** se já existe um `Horario` com:
- Mesma `agenda_id` e mesma `data`
- **Sobreposição de intervalo**: o horário existente começa antes do fim do solicitado (`horario_inicio < horario_fim`) e termina depois do início do solicitado (`horario_fim > horario_inicio`)
- `situacao = 'deferida'` (apenas aprovados bloqueiam)
- Na edição, horários da própria reserva são ignorados (`$ignorarReservaId`, passado por `UpdateReservaRequest`)
- Na edição `single`, só são verificados os slots da semana editada (`edited_week_date`)

Quando bloqueia, a mensagem cita a data do primeiro conflito e a faixa solicitada (em pt-BR, `O horário :start–:end de :date já está reservado.`). Detalhes e a regra de período em [`validacao.md`](./validacao.md).

Intervalos adjacentes (um termina exatamente quando o outro começa) não conflitam. Quando um slot colide com mais de um horário, o conflito reportado é o primeiro por data e hora de início, então a mensagem é a mesma em qualquer validação.

O critério em SQL abaixo é ilustrativo; a implementação está em `HorarioRepositoryEloquent::conflitosDeferidos`.

```sql
SELECT EXISTS (
    SELECT 1 FROM horarios
    WHERE data = ?
      AND agenda_id = ?
      AND situacao = 'deferida'      -- APENAS aprovados bloqueiam
      AND horario_inicio < ?         -- horario_fim solicitado
      AND horario_fim > ?            -- horario_inicio solicitado
      AND reserva_id != ?            -- somente na edição
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
    A["Solicitante seleciona slots<br/>no formulário"] -->|StoreReservaRequest / UpdateReservaRequest| B["HorarioDisponivel::validate()"]
    B -->|Sobrepõe horário deferida| C["Erro de validação: data e faixa do conflito"]
    B -->|Sem sobreposição deferida<br/>(em_analise não bloqueia)| D["Continua"]
    D -->|Cria reserva| E["ProcessarCriacaoReserva"]
    E -->|Job assíncrono| F["ValidateReservationConflictsJob"]
    F -->|ConflictDetectionService: apenas deferida| G["conflict_cache atualizado"]
    G -->|Gestor vê no AvaliarReservaPage| H["Mostra conflitos (informativo)"]
    
    style C fill:#ffcdd2
    style H fill:#c8e6c9
```

Na avaliação pelo gestor, `AvaliacaoDeReservaService` marca como `indeferida` os horários do próprio gestor que conflitam com horários já deferidos.

---

## 12. Componentes Frontend {#frontend-tree}

Os componentes seguem Atomic Design em `resources/js/presentation/` (primitivos em `resources/js/components/ui/`). As convenções estão na skill [`frontend-conventions`](../../.claude/skills/frontend-conventions/SKILL.md).

| Componente | Papel no fluxo de solicitação |
|---|---|
| `useReservaStepper` (hook) | Passos, validação do passo 1, conflitos e remoção dos slots em conflito |
| `AgendaDialogReserva` (organism) | Abre o modal com os slots selecionados |
| `ReservaStepperModal` (organism) | Passos Detalhes e Revisão, tela de sucesso e CTAs |
| `StepRevisaoConfirmacao` (molecule) | Resumo, horários a gravar, conflitos e termo |
| `ReservaRecorrenciaField` (molecule) | Switch "Repetir esta reserva?" e opções de período |
| `CalendarShiftSection` (molecule) | Marcar o turno do dia e Shift+clique |
| `EspacoFiltroBusca` (organism) | Filtro "Quando?" (opt-in da página do usuário) |
| `EspacoCard` (organism) | Selo "N horários livres" e link "Consultar horários" |
| `ReservaInfoCard` (organism) | Público estimado e categoria na avaliação do gestor |

---

## 13. Arquitetura Backend {#arquitetura}

O fluxo segue Controller → Service → Repository. Os jobs são cascas sobre os services de domínio, que concentram a regra e são testáveis sem fila:

| Service | Responsabilidade | Chamado por |
|---------|------------------|-------------|
| `CriacaoDeReservaService` | Cria reserva e horários, sob trava, com revalidação de conflito | `ProcessarCriacaoReserva` |
| `EdicaoDeReservaService` | Edita a reserva nos escopos `single` e `recurring`, sob trava | `UpdateReservaJob` |
| `AvaliacaoDeReservaService` | Aplica a avaliação do gestor, atualiza a situação geral e faz os efeitos pós-commit | `AvaliarReservaJob` |
| `TravaDeHorarios` | `lockForUpdate` por agenda e período; exige transação aberta | Os três services acima |
| `SlotDeHorario` (`App\Support`) | Normaliza a linha de horário (`HH:MM:SS`, data) antes de comparar | Services e `HorarioDisponivel` |

As interfaces de repositório são ligadas às implementações Eloquent no `AppServiceProvider`. Detalhes em [`repositorios.md`](../arquitetura/repositorios.md).

---

## 14. Pendências {#gaps}

Pendências e próximos passos: [`../backlog.md`](../backlog.md).

---

## 15. Referências de Código {#referências}

| Arquivo | Responsabilidade |
|---------|-----------------|
| [`ReservaController.php`](../../app/Http/Controllers/ReservaController.php) | CRUD HTTP do solicitante |
| [`GestorReservaController.php`](../../app/Http/Controllers/Gestor/GestorReservaController.php) | HTTP de avaliação do gestor |
| [`ReservaService.php`](../../app/Services/ReservaService.php) | Orquestração e despacho de jobs |
| [`ProcessarCriacaoReserva.php`](../../app/Jobs/ProcessarCriacaoReserva.php) | Job de criação assíncrona (casca sobre `CriacaoDeReservaService`) |
| [`UpdateReservaJob.php`](../../app/Jobs/UpdateReservaJob.php) | Job de atualização assíncrona (casca sobre `EdicaoDeReservaService`) |
| [`AvaliarReservaJob.php`](../../app/Jobs/AvaliarReservaJob.php) | Job de avaliação do gestor (casca sobre `AvaliacaoDeReservaService`) |
| [`CriacaoDeReservaService.php`](../../app/Services/CriacaoDeReservaService.php) | Regra da criação: expansão, trava, conflito e auto-aprovação |
| [`EdicaoDeReservaService.php`](../../app/Services/EdicaoDeReservaService.php) | Regra da edição nos escopos `single` e `recurring` |
| [`AvaliacaoDeReservaService.php`](../../app/Services/AvaliacaoDeReservaService.php) | Regra da avaliação e efeitos depois do commit |
| [`TravaDeHorarios.php`](../../app/Services/TravaDeHorarios.php) | Trava pessimista por agenda e período |
| [`EspacoRepositoryEloquent.php`](../../app/Repositories/EspacoRepositoryEloquent.php) | Filtro de disponibilidade e `horarios_livres` da lista pública |
| [`config/reservas.php`](../../config/reservas.php) | Fuso de negócio e grade de horários por turno (espelho do front) |
| [`ValidateReservationConflictsJob.php`](../../app/Jobs/ValidateReservationConflictsJob.php) | Job de validação de conflitos |
| [`ConflictDetectionService.php`](../../app/Services/ConflictDetectionService.php) | SQL de detecção de conflitos |
| [`ReservaPolicy.php`](../../app/Policies/ReservaPolicy.php) | Autorização de ações na reserva |
| [`BaseNotification.php`](../../app/Notifications/BaseNotification.php) | Base para todas as notificações |
| [`HorarioDisponivel.php`](../../app/Rules/HorarioDisponivel.php) | Regra de sobreposição de horários na validação |
| [`EspacoAgenda.tsx`](../../resources/js/presentation/organisms/EspacoAgenda.tsx) | Organismo principal de seleção de slots |
| [`AgendaDialogReserva.tsx`](../../resources/js/presentation/organisms/AgendaDialogReserva.tsx) | Modal de confirmação de reserva |
| [`AvaliarReservaPage.tsx`](../../resources/js/presentation/pages/Reservas/Gestor/AvaliarReservaPage.tsx) | Página de avaliação do gestor |
| [`EvaluationForm.tsx`](../../resources/js/presentation/organisms/EvaluationForm.tsx) | Formulário de avaliação |
