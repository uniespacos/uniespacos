# Arquivamento de Reservas — Soft-Delete e Eixos Semânticos

Este documento explica como o UniEspaços implementa o cancelamento de reservas (soft-delete/arquivamento), a separação entre **avaliação** e **arquivamento**, e como os filtros operam sobre esses dois eixos independentes.

## A Separação de Eixos (Issue #108)

Antes da issue #108, o campo `situacao` agregava dois conceitos distintos:

```
Antigo (problema)
┌─────────────────────────────┐
│ situacao (um campo, dois eixos)
├─────────────────────────────┤
│ em_analise      ← avaliação │
│ deferida        ← avaliação │
│ indeferida      ← avaliação │
│ parcialmente... ← avaliação │
│ inativa         ← arquivo   ← CONFLITO
└─────────────────────────────┘

Novo (solução - issue #108)
┌─────────────────────────────┐
│ EIXO 1: Avaliação           │
├─────────────────────────────┤
│ em_analise                  │
│ deferida                    │
│ indeferida                  │
│ parcialmente_deferida       │
└─────────────────────────────┘

┌─────────────────────────────┐
│ EIXO 2: Arquivamento        │
├─────────────────────────────┤
│ inativa (cancelado/arquivado)
└─────────────────────────────┘
```

### Por Quê a Separação Era Necessária

Quando um gestor consultava o filtro **"Mostrar reservas arquivadas"**, ele queria reservas **canceladas** — mas depois poderia escolher **qual estado de avaliação** vê dentro delas (aprovadas que foram depois canceladas, em análise que foram canceladas, etc.).

Antes da #108, isso era impossível. O sistema tinha:

1. `scopeArquivo()` em um lugar retornando ativas por padrão
2. `getPaginatedForUser()` com `->where('situacao', '!=', 'inativa')` fixo

Resultado: quando você clicava em "Arquivadas", a query virava:
```sql
WHERE user_id = ? 
  AND situacao != 'inativa'  ← ativa por padrão
  AND situacao = 'inativa'   ← arquivo = arquivadas
```

Uma **contradição impossível** que devolvia lista vazia.

### A Solução

Separar a lógica em dois eixos independentes:

- **Eixo A (Avaliação):** `situacao IN ('em_analise', 'deferida', 'indeferida', 'parcialmente_deferida')`
- **Eixo B (Arquivo):** `arquivo` — resultado de `inativa` ser tratado como estado de descarte, não de decisão

**Nota:** O código ainda usa um único campo `situacao` na tabela, mas semanticamente os 4 primeiros valores são avaliação e `inativa` é arquivo. Isso está separado logicamente via `ModoArquivoEnum` e `SituacaoReservaEnum::valoresDeAvaliacao()`.

---

## Estados na Tabela

### Reserva

| Estado | Eixo | Significado |
|--------|------|-------------|
| `em_analise` | Avaliação | Gestor(es) ainda não finalizou(aram) a decisão |
| `deferida` | Avaliação | Todos os horários foram aprovados |
| `indeferida` | Avaliação | Todos os horários foram rejeitados |
| `parcialmente_deferida` | Avaliação | Alguns horários aprovados, outros rejeitados |
| `inativa` | Arquivo | Reserva foi cancelada pelo solicitante (soft-delete) |

### Horário

| Estado | Eixo | Significado |
|--------|------|-------------|
| `em_analise` | Avaliação | Gestor não avaliou ainda |
| `deferida` | Avaliação | Gestor aprovou (horário está reservado) |
| `indeferida` | Avaliação | Gestor rejeitou (conflito ou outro motivo) |
| `inativa` | Arquivo | Reserva-mãe foi cancelada |

**Invariante:** `inativa` em horários é aplicado em cascata quando a reserva-mãe é cancelada — não é uma decisão de avaliação.

---

## O Fluxo de Cancelamento

Quando um usuário clica em "Cancelar Reserva", o método `ReservaService::cancel()` executa:

### 1. Validação de Idempotência

```php
if ($reserva->situacao === SituacaoReservaEnum::INATIVA->value) {
    return;
}
```

Se a reserva **já está cancelada**, o método retorna sem fazer nada. Isso evita:
- Disparar notificações duplicadas aos gestores
- Múltiplas transações desnecessárias
- Incongruência nos logs

**Antes da #108:** Essa rota era inalcançável — reservas `inativa` eram invisíveis na UI. Com o novo filtro `arquivo`, é possível encontrar e clicar em "Cancelar" novamente.

### 2. Identificação de Gestores

```php
$agendaIds = $reserva->horarios->pluck('agenda_id')->unique()->values()->all();
```

Extrai todos os turnos de gestão (`agenda_id`) envolvidos nesta reserva. Cada agenda tem um gestor, e todos precisam ser notificados sobre o cancelamento.

### 3. Marcação como Inativa (Transação)

```php
DB::transaction(function () use ($reserva) {
    $reserva->horarios()->update(['situacao' => 'inativa']);
    $reserva->update(['situacao' => 'inativa']);
});
```

Dois passos:
1. Todos os horários da reserva → `inativa`
2. A reserva-mãe → `inativa`

**Importante:** Se a reserva já tinha `situacao = 'deferida'`, ela **continua com esse valor** até a transação ser executada. Nessa transação, tanto os horários quanto a reserva são marcados como `inativa`. A semântica é: **"esta reserva foi cancelada, mas seus horários foram aprovados/rejeitados antes disso"** — a cascata não sobrescreve o histórico de avaliação.

### 4. Notificação aos Gestores

```php
$gestores = $this->repoAgenda->getWithUserByIds($agendaIds)
    ->pluck('user')
    ->filter()
    ->unique('id');

foreach ($gestores as $gestor) {
    try {
        $gestor->notify(new ReservationCanceledNotification($reserva, $user));
    } catch (\Exception $e) {
        Log::warning('Falha ao notificar gestor sobre cancelamento de reserva', [
            'gestor_id' => $gestor->id,
            'reserva_id' => $reserva->id,
            'exception' => $e,
        ]);
    }
}
```

Cada gestor recebe uma notificação `ReservationCanceledNotification` com:
- Título da reserva
- Nome de quem cancelou

**Regra do projeto:** Toda notificação vai em `try-catch` para evitar que uma falha do provedor de e-mail derrube a lógica central (issue #108 do projeto).

---

## Os Modos de Filtro (ModoArquivoEnum)

O enum `ModoArquivoEnum` define como as listas são filtradas:

### ATIVAS (padrão)

```php
Reserva::arquivo(ModoArquivoEnum::ATIVAS)->get();
```

**Query:** `WHERE situacao != 'inativa'`

Retorna todas as reservas não canceladas, independentemente de seu estado de avaliação (em análise, deferida, indeferida, etc.).

**Uso:** Listagens de usuário comum e gestor — por padrão mostram apenas o que está "ativo" no sistema.

### ARQUIVADAS

```php
Reserva::arquivo(ModoArquivoEnum::ARQUIVADAS)->get();
```

**Query:** `WHERE situacao = 'inativa'`

Retorna apenas reservas canceladas. Você pode então filtrar **por situacao** (dentro das canceladas, mostrar quais eram aprovadas vs. rejeitadas).

**Uso:** Histórico/auditoria — gestores e admins podem revisar reservas que foram canceladas e ver em que estado de avaliação elas estavam.

### TODAS

```php
Reserva::arquivo(ModoArquivoEnum::TODAS)->get();
```

**Query:** Sem filtro

Retorna todas as reservas, ativas ou arquivadas. Normalmente usado por scripts de auditoria ou relatórios administrativos.

---

## Normalização de Filtros

No método `ReservaService::normalizarFiltros()`, ocorrem duas transformações importantes:

### 1. Tradução do Parâmetro Legado

**Antes da #108:**
```
URL: ?situacao=inativa
Resultado: Reservas arquivadas
```

**Depois da #108:**
```
URL: ?arquivo=arquivadas
Resultado: Reservas arquivadas
```

**Backward compat:**
```php
if ($situacao === SituacaoReservaEnum::INATIVA->value && ! isset($filters['arquivo'])) {
    $filters['arquivo'] = ModoArquivoEnum::ARQUIVADAS->value;
}
```

Se alguém acessa com a query string legada `?situacao=inativa` (ex: bookmark antigo, link compartilhado), e **não houver** `arquivo` explícito, o sistema traduz automaticamente para `?arquivo=arquivadas`.

Isso mantém links antigos funcionando sem quebrar a lógica dos dois eixos.

### 2. Validação de Valores

```php
$filters['situacao'] = is_string($situacao)
    && in_array($situacao, SituacaoReservaEnum::valoresDeAvaliacao(), true)
        ? $situacao
        : null;
```

O filtro `situacao` **só aceita valores de avaliação**:
- `em_analise`
- `deferida`
- `indeferida`
- `parcialmente_deferida`

`inativa` é **rejeitado** aqui porque não é um filtro de avaliação — é o eixo de arquivo.

Se alguém enviar `?situacao=xyz` (valor desconhecido), o filtro vira `null` (ignorado), e a listagem retorna todas (sem erro silencioso).

---

## Cenários de Uso

### Usuário Cancela Uma Reserva Aprovada

```
Antes do cancelamento:
  Reserva: situacao = 'deferida', arquivo = implícito ATIVA
  Horários: situacao = 'deferida'

Depois do cancelamento (ReservaService::cancel()):
  Reserva: situacao = 'inativa'
  Horários: situacao = 'inativa'

Semanticamente:
  "Esta reserva estava aprovada, mas foi cancelada."
  (Historia preservada: estava deferida quando parou de ser ativa)
```

### Gestor Vê Minhas Reservas

```
HTTP GET /reservas?arquivo=ativas&ordenar=situacao

ReservaService::getListingForUser($user, ..., ['arquivo' => 'ativas', ...])
  → normaliza filtros
  → ReservaRepository::getPaginatedForUser()
  → query: WHERE user_id = ? AND situacao != 'inativa'
  → Resultado: todas as reservas não canceladas
```

### Admin Busca Histórico Completo

```
HTTP GET /admin/reservas?arquivo=todas&search=reuniao

ReservaService::getGestorListing($admin, ..., ['arquivo' => 'todas', ...])
  → normaliza filtros
  → ReservaRepository::getPaginatedForGestor()
  → query: WHERE ... (sem filtro de arquivo)
  → Resultado: todas as reservas, ativas e arquivadas
```

### Usuário Tenta Cancelar Novamente

```
User clicks "Cancel" on reserva_id=5
  → ReservaService::cancel($reserva)
  → Check: $reserva->situacao === 'inativa' ? return; ← SIM
  → Nenhuma ação, sem notificações duplicadas
```

---

## Implicações para Edição: resolveDataAncora()

Quando um usuário abre a página de edição de uma reserva, o calendário precisa posicionar-se na primeira data da reserva:

```php
public function resolveDataAncora(Reserva $reserva): string
{
    $firstSlot = $reserva->horarios()->orderBy('data', 'asc')->first();
    
    return Carbon::parse($firstSlot ? $firstSlot->data : $reserva->data_inicial)->format('Y-m-d');
}
```

### Por Que Não Apenas data_inicial?

Considere este cenário:

```
Reserva criada: 2026-09-01 a 2026-09-30
Horários solicitados:
  - 2026-09-05 09:00-11:00
  - 2026-09-12 09:00-11:00
  - 2026-09-19 09:00-11:00

Gestor avalia:
  - 2026-09-05 → INDEFERIDA (conflito)
  - 2026-09-12 → INDEFERIDA (conflito)
  - 2026-09-19 → INDEFERIDA (conflito)

UpdateReservaJob (na edição de um horário) atualiza data_inicial com a menor data 
do horário sendo editado aquela semana → data_inicial pode virar 2026-09-01 (no passado!)

Se abrirmos o calendário com data_inicial = 2026-09-01, nenhum horário aparecerá.
```

**Solução:** `resolveDataAncora()` busca o primeiro horário **cronologicamente** em vez de usar `data_inicial`. Isso garante que o calendário abre sempre em uma semana que **contém um horário da reserva**.

Fallback para `data_inicial` só quando a reserva **não tem horários** (caso extremo).

---

## Implementação nos Repositórios

### ReservaRepositoryEloquent::getPaginatedForUser()

```php
return $this->reserva->newQuery()
    ->where('user_id', $userId)
    ->arquivo($filters['arquivo'] ?? null)  ← Aplica o eixo de arquivo
    ->when($filters['search'] ?? null, fn ($q, $s) => $q->where('titulo', 'like', '%'.$s.'%'))
    ->when($filters['situacao'] ?? null, fn ($q, $s) => $q->where('situacao', $s))  ← Eixo de avaliação
    // ...
    ->paginate($perPage);
```

**Comentário no código (issue #108):**
> Era `->where('situacao', '!=', 'inativa')` fixo aqui, o que anulava qualquer filtro por arquivadas logo abaixo.

Agora, ambos os eixos são **independentes**:
1. `arquivo()` controla a visibilidade de ativas vs. arquivadas
2. `situacao` (quando filtrado) controla qual estado de avaliação mostrar

---

## Resumo Executivo

| Aspecto | Antes (#108) | Depois (#108) |
|---------|------------|--------------|
| Campo | Um `situacao` com dois significados | Um `situacao`; semântica separada por enum |
| Filtro por arquivo | Impossível, contradição | `ModoArquivoEnum`: ATIVAS, ARQUIVADAS, TODAS |
| "Cancelado" | `inativa` (confunde com avaliação) | `inativa` (eixo de arquivo) |
| Recancel | Disparava notificações duplicadas | Idempotente: retorna sem efeito |
| Compatibilidade | N/A | `?situacao=inativa` → `?arquivo=arquivadas` |

A implementação preserva o banco de dados (sem migração destrutiva) enquanto organiza a semântica em dois eixos independentes, **eliminando a contradição de filtros** que existia antes.
