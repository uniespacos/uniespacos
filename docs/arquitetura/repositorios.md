# Repository Pattern e Especificidade de Queries

Este documento descreve o padrão Repository + Interface do projeto: como encapsular queries de dados, evitar N+1 queries, e quando especializar cada método versus manter um contrato genérico.

## Sumário

- [Arquitetura do Padrão](#arquitetura-do-padrão)
- [Por Que Usar Repository?](#por-que-usar-repository)
- [ReservaRepositoryInterface](#reservarepositoryinterface)
- [AgendaRepositoryInterface](#agendarepositoryinterface)
- [Trade-off: Especialização vs. Generalização](#trade-off-especialização-vs-generalização)
- [Evitando N+1 Queries](#evitando-n1-queries)
- [Testing com Repositories](#testing-com-repositories)
- [Checklist para Novos Métodos](#checklist-para-novos-métodos)

---

## Arquitetura do Padrão

### Estrutura de Camadas

```
Controller/Service
       ↓
  RepositoryInterface (contrato de dados)
       ↓
  RepositoryEloquent (implementação concreta)
       ↓
  Eloquent Model (acesso direto ao banco)
```

### Binding em AppServiceProvider

Cada repositório é **registrado como um binding** em `app/Providers/AppServiceProvider.php`:

```php
$this->app->bind(ReservaRepositoryInterface::class, ReservaRepositoryEloquent::class);
$this->app->bind(AgendaRepositoryInterface::class, AgendaRepositoryEloquent::class);
// ... outros repositórios
```

**Vantagem:** Controllers e Services injetam a **interface**, não a implementação concreta.

```php
public function __construct(
    protected ReservaRepositoryInterface $repoReserva,  // Interface
    protected AgendaRepositoryInterface $repoAgenda,    // Interface
) {}
```

Isso permite:
- **Trocar implementação** sem alterar consumers (ex: trocar para cache, banco NoSQL)
- **Mockar em testes** injetando uma implementação fake
- **Decoupling** — controller não depende de Eloquent, depende de contrato

---

## Por Que Usar Repository?

### 1. Encapsular Queries Complexas

Queries com múltiplos `with()`, `whereHas()`, filtros e ordenações ficam **ilegíveis** se espalhadas nos controllers.

**Ruim:**
```php
// ReservaController
public function index(Request $request): Response
{
    $reservas = Reserva::where('user_id', $user->id)
        ->with([
            'horarios' => function ($q) use ($weekStart, $weekEnd) {
                $q->whereBetween('data', [$weekStart, $weekEnd])
                    ->orderBy('data')->orderBy('horario_inicio')
                    ->with(['agenda.espaco.andar.modulo']);
            },
            'user:id,name',
        ])
        ->when($filters['search'] ?? null, fn ($q, $s) => $q->where('titulo', 'like', "%{$s}%"))
        ->paginate(10);
    // ...
}
```

**Bom:**
```php
// ReservaService
$reservas = $this->repoReserva->getPaginatedForUser(
    $user->id,
    $weekStart,
    $weekEnd,
    $filters
);
```

### 2. Prevenir N+1 Queries

Sem especificar `with()`, Eloquent carrega dados sob demanda — uma query por item.

```php
// N+1 ANTIPADRÃO: para cada horário, executa uma query de espaco/andar/modulo
$reservas = Reserva::where('user_id', $user->id)->get();
foreach ($reservas as $reserva) {
    foreach ($reserva->horarios as $horario) {
        echo $horario->agenda->espaco->nome;  // Query aqui!
    }
}
```

Repository garante que dados críticos **já estão carregados**:

```php
// getPaginatedForUser() carrega 'horarios.agenda.espaco.andar.modulo'
// Uma query para Reserva + Join para Horarios + eagerLoad para Agenda/Espaco
$reservas = $this->repoReserva->getPaginatedForUser($userId, $weekStart, $weekEnd);
foreach ($reservas as $reserva) {
    foreach ($reserva->horarios as $horario) {
        echo $horario->agenda->espaco->nome;  // Dados em memória, sem query!
    }
}
```

### 3. Facilitar Testes

Mock da interface é trivial:

```php
$mockRepo = mock(ReservaRepositoryInterface::class);
$mockRepo->shouldReceive('getPaginatedForUser')
    ->with(1, '2026-09-01', '2026-09-07')
    ->andReturn(new LengthAwarePaginator(...));

$service = new ReservaService($mockRepo, ...);
$result = $service->getListingForUser($user, '2026-w36', []);
```

Sem repository, seria preciso mockar Model + QueryBuilder + múltiplos métodos.

---

## ReservaRepositoryInterface

`ReservaRepositoryInterface` define **sete métodos especializados**, cada um otimizado para um caso de uso específico.

### `getList(array $columns = ['*'], ?array $filters = null): Collection`

**Propósito:** Retornar **todas** as reservas (sem paginação) com filtros opcionais.

**Contexto de uso:** Relatórios, exports, processamento em batch.

**Implementação:**
```php
public function getList(array $columns = ['*'], ?array $filters = null): Collection
{
    $query = $this->reserva->newQuery();
    if ($filters) {
        $query->where($filters);
    }
    return $query->get($columns);
}
```

**Relacionamentos carregados:** Nenhum (retorna apenas colunas).

**Por quê:**
- Sem relacionamentos, a query é leve
- Se o consumer precisa de relacionamentos, carrega via `load()` em seu contexto
- Evita overhead se apenas colunas são necessárias

---

### `getPaginatedForUser(int $userId, string $weekStart, string $weekEnd, array $filters = [], int $perPage = 10): LengthAwarePaginator`

**Propósito:** Listar reservas do **próprio usuário** para a página de reservas, com filtros e paginação.

**Contexto de uso:** `ReservaService::getListingForUser()`, exibido em `ReservasPage`.

**Implementação (resumida):**
```php
public function getPaginatedForUser(
    int $userId,
    string $weekStart,
    string $weekEnd,
    array $filters = [],
    int $perPage = 10
): LengthAwarePaginator {
    return $this->reserva->newQuery()
        ->where('user_id', $userId)
        ->arquivo($filters['arquivo'] ?? null)
        ->when($filters['search'] ?? null, fn ($q, $s) => 
            $q->where('titulo', 'like', '%'.$s.'%')
        )
        ->when($filters['situacao'] ?? null, fn ($q, $s) => 
            $q->where('situacao', $s)
        )
        ->with([
            'horarios' => function ($query) use ($weekStart, $weekEnd) {
                $query->whereBetween('data', [$weekStart, $weekEnd])
                    ->orderBy('data')->orderBy('horario_inicio')
                    ->with(['agenda.espaco.andar.modulo']);
            },
            'user:id,name',
        ])
        ->ordenar($filters['ordenar'] ?? null)
        ->paginate($perPage);
}
```

**Relacionamentos carregados:**
- `horarios.*` → `agenda.espaco.andar.modulo` — para exibir "Local" (Espaço > Andar > Módulo)
- `user` — nome do solicitante

**Filtros aplicados:**
- `user_id` — apenas do usuário autenticado
- `arquivo` — ativo/arquivado (soft-delete lógico)
- `search` — busca por título
- `situacao` — deferida/indeferida/etc (resultado de avaliação)

**Ordenação:** Personalizada via enum `OrdenacaoReservaEnum::fromFiltro()`

**Paginação:** Padrão 10 por página (configurável).

**Por quês dos relacionamentos:**
- `horarios.agenda.espaco.andar.modulo` evita **3 queries por horário** (agenda, espaco, andar, modulo)
- `user` evita query para o nome do solicitante na row
- Sem `with()`, render da tabela dispara (1 + N + N*M) queries

---

### `findWithWeekSlots(int $reservaId, string $weekStart, string $weekEnd): ?Reserva`

**Propósito:** Retornar uma reserva específica com seus horários da semana para **modal de detalhes**.

**Contexto de uso:** Modal de detalhes do usuário (ver horários com info de gestor e avaliação).

**Implementação:**
```php
public function findWithWeekSlots(
    int $reservaId,
    string $weekStart,
    string $weekEnd
): ?Reserva {
    return $this->reserva->with([
        'user',
        'horarios' => function ($query) use ($weekStart, $weekEnd) {
            $query->whereBetween('data', [$weekStart, $weekEnd])
                ->orderBy('data')->orderBy('horario_inicio')
                ->with([
                    'agenda.espaco.andar.modulo.unidade',
                    'agenda.user',  // Gestor do turno
                    'avaliador',    // Quem avaliou este horário
                ]);
        },
    ])->find($reservaId);
}
```

**Relacionamentos carregados:**
- `user` — solicitante
- `horarios.agenda.espaco.andar.modulo.unidade` — localização completa
- `horarios.agenda.user` — gestor do turno (exibido no modal)
- `horarios.avaliador` — quem avaliou (se houver)

**Filtros aplicados:**
- `horarios.data BETWEEN` — apenas semana solicitada

**Por quês:**
- `agenda.user` identifica o gestor responsável
- `avaliador` mostra quem aprovou/recusou
- `modulo.unidade` completa a cadeia de localização (Instituição > Unidade > Módulo > Andar > Espaço)
- Sem estes, cada acesso ao relacionamento dispara query

---

### `getPaginatedForGestor(array $agendaIds, array $filters = [], int $perPage = 10): LengthAwarePaginator`

**Propósito:** Listar reservas **visíveis ao gestor** (aquelas que envolvem suas agendas) com paginação.

**Contexto de uso:** `ReservaService::getGestorListing()`, exibido em `ReservasGestorPage`.

**Implementação (resumida):**
```php
public function getPaginatedForGestor(
    array $agendaIds,
    array $filters = [],
    int $perPage = 10
): LengthAwarePaginator {
    return $this->reserva->newQuery()
        ->select(['id', 'titulo', 'descricao', 'situacao', 'user_id', 'data_inicial', 'data_final'])
        ->whereHas('horarios', fn ($q) => $q->whereIn('agenda_id', $agendaIds))
        ->when($filters['search'] ?? null, fn ($q, $s) => 
            $q->where(fn ($q) => $q->where('titulo', 'like', "%{$s}%")
                                  ->orWhere('descricao', 'like', "%{$s}%"))
        )
        ->arquivo($filters['arquivo'] ?? null)
        ->when($filters['situacao'] ?? null, fn ($q, $s) => 
            $q->where('situacao', $s)
        )
        ->with([
            'user:id,name',
            'horarios' => function ($query) use ($agendaIds) {
                $query->whereIn('agenda_id', $agendaIds)
                    ->limit(1)  // Uma amostra de horário
                    ->with([
                        'agenda:id,espaco_id,turno',
                        'agenda.espaco:id,nome,andar_id',
                        'agenda.espaco.andar:id,nome,modulo_id',
                        'agenda.espaco.andar.modulo:id,nome',
                    ]);
            },
        ])
        ->ordenar($filters['ordenar'] ?? null)
        ->paginate($perPage);
}
```

**Relacionamentos carregados:**
- `user` — solicitante
- `horarios.*` — **uma amostra** (limit 1) com espaço/andar/modulo para exibir "Local" na grid

**Filtros aplicados:**
- `whereHas('horarios', ... whereIn(agenda_id))` — **escopo da autorização**: garante que apenas reservas visíveis ao gestor retornam
- `search` — título + descrição
- `arquivo` — ativo/arquivado
- `situacao` — deferida/indeferida/etc

**Seleção otimizada:** `select(['id', 'titulo', 'descricao', 'situacao', 'user_id', 'data_inicial', 'data_final'])` — apenas colunas exibidas na grid.

**Por quês:**
- `whereHas('horarios', ... whereIn('agenda_id', $agendaIds))` evita mostrar reservas fora do escopo (segurança + performance)
- `limit(1)` em horarios economiza memória (uma amostra é suficiente para "Local")
- Selects enxutos em `agenda.espaco.andar` — sem keys estrangeiras, a cadeia quebra silenciosamente

---

### `findForGestorModal(int $reservaId, array $agendaIds, string $weekStart, string $weekEnd): ?Reserva`

**Propósito:** Retornar uma reserva específica **com filtro de autorização** e horários da semana para **modal de avaliação** do gestor.

**Contexto de uso:** Modal de detalhes/avaliação em `ReservasGestorPage`.

**Implementação:**
```php
public function findForGestorModal(
    int $reservaId,
    array $agendaIds,
    string $weekStart,
    string $weekEnd
): ?Reserva {
    return $this->reserva
        ->whereHas('horarios', fn ($q) => $q->whereIn('agenda_id', $agendaIds))
        ->with([
            'user',
            'horarios' => function ($query) use ($agendaIds, $weekStart, $weekEnd) {
                $query->whereIn('agenda_id', $agendaIds)
                    ->whereBetween('data', [$weekStart, $weekEnd])
                    ->orderBy('data')->orderBy('horario_inicio')
                    ->with([
                        'agenda' => function ($q) {
                            $q->select('id', 'espaco_id', 'turno', 'user_id')
                                ->with('espaco.andar.modulo');
                        },
                        'avaliador',
                    ]);
            },
        ])->find($reservaId);
}
```

**Relacionamentos carregados:**
- `user` — solicitante
- `horarios.agenda.espaco.andar.modulo` — localização
- `horarios.avaliador` — quem avaliou

**Filtros aplicados:**
- `whereHas('horarios', whereIn('agenda_id'))` — escopo: só retorna se gestor gerencia alguma agenda da reserva (Issue #119)
- `horarios.whereIn('agenda_id')` — filtra apenas horários das agendas do gestor
- `horarios.whereBetween('data')` — apenas semana solicitada

**Por quê `whereHas()` na Reserva?**

> Issue #119: o `whereHas` escopa a própria Reserva às agendas do gestor. Sem ele, filtrar apenas o relacionamento devolvia título/descrição/user de reservas fora do escopo de gestão.

Exemplo do bug:
```php
// ERRADO: filtra horarios, mas retorna Reserva inteira
$reserva = Reserva::with([
    'horarios' => fn ($q) => $q->whereIn('agenda_id', $agendaIds)
])->find($id);

// Gestor A gerencia [Agenda_1]
// Reserva de Gestor B usa [Agenda_2]
// O with() retorna $reserva com horarios VAZIO
// MAS o titulo/descricao/user da reserva fica visível (data leak)

// CORRETO: garante que a Reserva inteira é visível ao gestor
$reserva = Reserva->whereHas('horarios', fn ($q) => $q->whereIn('agenda_id', $agendaIds))
    ->with([...])
    ->find($id);  // Retorna null se gestor não gerencia nenhuma agenda da reserva
```

---

### `get(int|string $id): ?Reserva`

**Propósito:** Retornar uma reserva específica **sem relacionamentos** (para updates/deletes diretos).

**Contexto de uso:** `ReservaPolicy`, operações internas que não precisam de dados aninhados.

**Implementação:**
```php
public function get(int|string $id): ?Reserva
{
    return $this->reserva->find($id);
}
```

**Relacionamentos carregados:** Nenhum.

**Por quê:** Economiza memória. Quando o consumer precisa de relacionamentos, carrega explicitamente.

---

### `update(array $data, int|string $id): Reserva` e `destroy(int|string $id): bool`

**Propósito:** Atualizar e deletar (soft-delete) uma reserva.

**Implementação:**
```php
public function update(array $data, int|string $id): Reserva
{
    $reserva = $this->reserva->findOrFail($id);
    $reserva->update($data);
    return $reserva;
}

public function destroy(int|string $id): bool
{
    return (bool) $this->reserva->findOrFail($id)->delete();
}
```

**Contexto:** Alterações de dados após validação em Service/Request.

---

### `store(array $data): Reserva`

**Propósito:** Criar uma nova reserva.

**Implementação:**
```php
public function store(array $data): Reserva
{
    return $this->reserva->create($data);
}
```

**Contexto:** Criação via job assíncrono em `ProcessarCriacaoReserva`.

---

## AgendaRepositoryInterface

`AgendaRepositoryInterface` é mais minimalista, com **dois métodos especializados**.

### `getList(array $columns = ['*'], ?array $filters = null): Collection`

Retorna todas as agendas com filtros opcionais (sem paginação).

---

### `getWithUserByIds(array $ids): Collection`

**Propósito:** Retornar agendas específicas com o gestor (`user`) eager-loaded.

**Contexto de uso:** `ReservaService::cancel()`, notificar gestores de cancelamento.

**Implementação:**
```php
public function getWithUserByIds(array $ids): Collection
{
    return $this->agenda->whereIn('id', $ids)->with('user')->get();
}
```

**Por quê especializar?**

```php
// ERRADO: N+1 quando notifica gestores
$gestores = $agendas->pluck('user');  // Query por agenda!

// CORRETO: usuários já carregados
$gestores = $this->repoAgenda->getWithUserByIds($ids)
    ->pluck('user')  // Dados em memória
    ->unique('id');
```

**Padrão de uso:**
```php
$agendaIds = $reserva->horarios->pluck('agenda_id')->unique()->values()->all();
$gestores = $this->repoAgenda->getWithUserByIds($agendaIds)
    ->pluck('user')
    ->filter()
    ->unique('id');

foreach ($gestores as $gestor) {
    try {
        $gestor->notify(new ReservationCanceledNotification($reserva, $user));
    } catch (\Exception $e) {
        Log::warning('Falha ao notificar', ['gestor_id' => $gestor->id]);
    }
}
```

---

## Trade-off: Especialização vs. Generalização

### Abordagem Atual: Especialização

Cada método é **otimizado para seu caso de uso específico**.

**Benefícios:**
- ✅ Cada query carrega **exatamente** o necessário
- ✅ Previne N+1 em casos reais
- ✅ Legível: `getPaginatedForUser()` deixa claro o contexto
- ✅ Rápido de debugar (query é específica, fácil de inspecionar com Telescope)

**Custos:**
- ❌ Mais métodos para manter
- ❌ Código repetido entre métodos similares (ex: horarios + agenda.espaco.andar.modulo aparece em 3+ métodos)

### Alternativa Não Implementada: Generalização

Um único método `getWithRelations(array $relations, array $filters)` que aceita lista de relacionamentos.

**Teoria:**
```php
$reservas = $this->repoReserva->getWithRelations(
    relations: ['horarios.agenda.espaco.andar.modulo', 'user'],
    filters: ['user_id' => $userId],
    paginate: 10
);
```

**Problemas:**
- ❌ Responsabilidade do consumer de saber que relacionamentos carregar
- ❌ Frágil: esquecer um relacionamento dispara N+1 silenciosamente
- ❌ String-based (sem type safety): `'horarios.agenda.espaco.andar.modulo'` é mágico
- ❌ Difícil de documentar
- ❌ Encoraja lazy-loading acidental

**Conclusão:** Especialização é melhor para este projeto. O custo de manutenção é compensado pela segurança e performance.

---

## Evitando N+1 Queries

### Identificar N+1

Uma N+1 query ocorre quando:
1. Query raiz retorna N registros
2. Acesso a relacionamento dispara 1 query adicional por registro
3. Total: 1 + N queries

**Sintoma no browser:** Page load lento, Telescope mostra explosão de queries similares.

### Exemplos de N+1

#### ❌ Antipadrão 1: Lazy-loading em loop

```php
$reservas = Reserva::where('user_id', $userId)->get();  // 1 query

foreach ($reservas as $reserva) {
    foreach ($reserva->horarios as $horario) {  // +N queries (uma por reserva)
        echo $horario->agenda->espaco->nome;    // +N*M queries
    }
}
// Total: 1 + N + N*M queries ❌
```

**Solução:** Usar repository com `with()`:
```php
$reservas = $this->repoReserva->getPaginatedForUser($userId, $weekStart, $weekEnd);
// Já carrega horarios.agenda.espaco.andar.modulo
// Total: ~2 queries ✅
```

#### ❌ Antipadrão 2: Acessar relacionamento fora do contexto

```php
// ReservaService
$reserva = $this->repoReserva->get($reservaId);  // Sem relacionamentos

// ReservaPolicy
if ($reserva->horarios) {  // Query aqui!
    foreach ($reserva->horarios as $h) {
        // ...
    }
}
```

**Solução:** Policy não deve carregar dados; deixar para o Service.

#### ❌ Antipadrão 3: Query dentro de Policy

```php
// ERRADO em ReservaPolicy::update()
public function update(User $user, Reserva $reserva): bool
{
    $hasProcessedSlots = $reserva->horarios()  // Query!
        ->whereIn('situacao', ['deferida', 'indeferida'])
        ->exists();
    
    return ! $hasProcessedSlots;
}
```

**Solução:** Carregar em Service antes de enviar para Policy.

### Checklist: Prevenir N+1

Ao escrever novo método em Repository:

- [ ] **Identificar dados necessários**: Quais relacionamentos o consumer precisa?
- [ ] **Carregar com `with()`**: `->with(['relation1', 'relation2.nested'])`
- [ ] **Filtrar no relacionamento**: Se só alguns registros são precisos, filtrar na callback do `with()`:
  ```php
  'horarios' => fn ($q) => $q->whereBetween('data', [$start, $end])
  ```
- [ ] **Usar select() em joins**: Carregar apenas colunas necessárias:
  ```php
  'agenda:id,espaco_id,turno,user_id'
  ```
- [ ] **Inspecionar com Telescope**: Rodar em desenvolvimento, abrir `http://localhost:8000/telescope`, clicar em uma requisição, contar queries.

---

## Testing com Repositories

### Mock da Interface em Unit Tests

Repository é **interface**, logo é mockável sem tocar banco.

**Exemplo:**
```php
// tests/Feature/ReservaServiceTest.php

use App\Repositories\ReservaRepositoryInterface;
use App\Services\ReservaService;

it('returns listing with filters', function () {
    $mockRepo = mock(ReservaRepositoryInterface::class);
    
    $mockRepo->shouldReceive('getPaginatedForUser')
        ->with(1, '2026-09-01', '2026-09-07', ['search' => 'test'])
        ->andReturn(
            new LengthAwarePaginator(
                [new Reserva(['id' => 1, 'titulo' => 'Test'])],
                1,  // total
                10, // per_page
                1   // current_page
            )
        );
    
    $service = new ReservaService($mockRepo, ...);
    $result = $service->getListingForUser($user, '2026-w36', ['search' => 'test']);
    
    expect($result['reservas'])->toHaveCount(1);
});
```

**Vantagens:**
- ✅ Testa Service sem banco (rápido)
- ✅ Isola lógica de Service da query de Repository
- ✅ Falha rápido se contrato muda

### Integration Tests com Banco

Para testar Repository real (não mockado), usar `DatabaseTransactions`.

```php
// tests/Feature/ReservaRepositoryTest.php
use Illuminate\Foundation\Testing\DatabaseTransactions;

class ReservaRepositoryTest extends TestCase
{
    use DatabaseTransactions;  // Rollback automático

    it('getPaginatedForUser carrega horarios.agenda', function () {
        $user = User::factory()->create();
        $reserva = Reserva::factory()->for($user)->create();
        $agenda = Agenda::factory()->create();
        $horario = Horario::factory()
            ->for($reserva)
            ->for($agenda)
            ->state(['data' => '2026-09-01'])
            ->create();

        $repo = app(ReservaRepositoryInterface::class);
        $result = $repo->getPaginatedForUser(
            $user->id,
            '2026-09-01',
            '2026-09-07'
        );

        expect($result)->toHaveCount(1);
        expect($result->first()->horarios)->toHaveCount(1);
        expect($result->first()->horarios->first()->agenda_id)
            ->toBe($agenda->id);
    });
}
```

**Nota:** Não use `RefreshDatabase` — ele apaga o banco de desenvolvimento. Use sempre `DatabaseTransactions`.

---

## Checklist para Novos Métodos

Ao adicionar novo método a um Repository:

- [ ] **Nomear com propósito:** `getXxx()` vs. `findXxx()` vs. `getPaginatedXxx()`
- [ ] **Documentar no interface** com `@param` e `@return`
- [ ] **Listar relacionamentos** carregados em comentário PHPDoc
- [ ] **Listar filtros** aplicados
- [ ] **Teste**: Chamar método em teste para validar query (quer mock, quer integration)
- [ ] **Inspecionar com Telescope**: Contar queries, garantir sem N+1
- [ ] **Reusar em lugar de criar novo?** Se similar a método existente, considerar unificar
- [ ] **Documentar em `docs/repositories-pattern.md`**: Seção do seu repository + contexto de uso

---

## Mapeamento: Método → Controller/Service → Relacionamentos

| Método | Usado em | Relacionamentos | Notas |
|--------|----------|-----------------|-------|
| `getList()` | Relatórios, exports | Nenhum | Retorna colunas apenas |
| `get()` | Policy, direto | Nenhum | Minimal, para acesso simples |
| `store()` | Service.create() | N/A | Criação |
| `update()` | Service, admin | N/A | Atualização |
| `destroy()` | Service, admin | N/A | Soft-delete |
| `getPaginatedForUser()` | ReservaService::getListingForUser() | horarios.agenda.espaco.andar.modulo, user | Grid do usuário |
| `findWithWeekSlots()` | ReservaService::getListingForUser() (modal) | horarios.agenda.espaco.andar.modulo.unidade, horarios.agenda.user, horarios.avaliador | Modal de detalhes |
| `getPaginatedForGestor()` | ReservaService::getGestorListing() | horarios.agenda.espaco.andar.modulo, user | Grid do gestor |
| `findForGestorModal()` | ReservaService::getGestorListing() (modal) | horarios.agenda.espaco.andar.modulo, horarios.avaliador | Modal de avaliação (com scopo) |
| `getWithUserByIds()` (Agenda) | ReservaService::cancel() | user | Notificar gestores |

