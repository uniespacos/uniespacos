# Models — Regras de Negócio

Este documento descreve os cinco models principais, seus comportamentos, scopes, métodos públicos e regras de negócio encapsuladas no código.

## Sumário

- [Reserva](#reserva)
- [Horario](#horario)
- [Agenda](#agenda)
- [Espaco](#espaco)
- [User](#user)

---

## Reserva

**Responsabilidade:** Representa uma solicitação de reserva de um ou mais espaços (através de horários agregados), com título, descrição, observações e uma situação que reflete o estado geral da avaliação.

### Atributos Principais

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `titulo` | string | Nome da reserva |
| `descricao` | string \| null | Descrição/justificativa |
| `situacao` | string | Estado agregado: `em_analise`, `deferida`, `indeferida`, `parcialmente_deferida`, `inativa` |
| `data_inicial` | date | Data de início (usada como fallback quando sem horários) |
| `data_final` | date | Data de término |
| `recorrencia` | string \| null | Padrão de recorrência (ver [`docs/recorrencia-semantica.md`](./recorrencia-semantica.md) para detalhes completos) |
| `observacao` | string \| null | Notas do gestor após avaliação |
| `user_id` | int | FK para solicitante |
| `validation_status` | string | `pending`, `completed`, etc. (estado do job de validação de conflitos) |
| `conflict_cache` | array (JSON) | Cache dos conflitos detectados |
| `cache_validated_at` | datetime \| null | Timestamp da última validação de conflitos |

### Atributos Dinâmicos (Computados em Runtime)

- **`can_update`** — Boolean, definido por `ReservaService` via policy check. Indica se o usuário autenticado pode editar a reserva.
- **`existing_justification`** — String ou null, extraído de `ReservaService::getForGestorReview()` com a primeira justificativa não nula entre seus horários.
- **`situacao_formatada`** — Rótulo legível (ex: "Em Análise") via `getSituacaoFormatadaAttribute()`.
- **`resumo_horarios`** — Array de objetos com texto descritivo dos horários (resumido para ≤10 ou agrupado por agenda).

### Scopes

#### `scopeArquivo($query, $modo)`

Aplica o eixo de arquivamento (issue #108) a uma listagem. Usa `ModoArquivoEnum`:

```php
// ModoArquivoEnum::ATIVAS (padrão) — exclui inativas
Reserva::arquivo(ModoArquivoEnum::ATIVAS)->get();

// ModoArquivoEnum::ARQUIVADAS — só inativas
Reserva::arquivo(ModoArquivoEnum::ARQUIVADAS)->get();

// ModoArquivoEnum::TODAS — sem filtro
Reserva::arquivo(ModoArquivoEnum::TODAS)->get();
```

**Motivo do design:** `inativa` é estado de arquivamento, não resultado de avaliação. Separar este eixo da situação evita contradições de filtro (ex: `situacao != 'inativa' AND situacao = 'inativa'`).

#### `scopeOrdenar($query, $criterio)`

Aplica critério de ordenação. Usa `OrdenacaoReservaEnum`:

```php
// DATA_SOLICITACAO (padrão) — latest(), mais recente primeiro
Reserva::ordenar(OrdenacaoReservaEnum::DATA_SOLICITACAO)->get();

// SITUACAO — prioridade fixa (pendente > parcial > indeferida > deferida > inativa) + latest()
Reserva::ordenar(OrdenacaoReservaEnum::SITUACAO)->get();
```

**Prioridade de situação:** Reflete o que precisa de atenção primeiro. Dentro do mesmo grupo, a mais recente sai primeiro.

### Métodos Públicos

#### `getSituacaoFormatadaAttribute(): string`

Retorna o rótulo legível da situação atual. Exemplo: `'em_analise'` → `'Em Análise'`.

#### `getResumoHorariosAttribute(): array`

Retorna um sumário dos horários da reserva:
- Se ≤ 10 horários: lista detalhada (data, hora, turno).
- Se > 10 horários: agrupa por agenda e faixa horária, mostrando período e dias da semana.

Cada item é um objeto com `is_summary` (bool) e `texto` (string).

### Relacionamentos

| Relação | Tipo | Descrição |
|---------|------|-----------|
| `horarios()` | HasMany | Todos os intervalos de tempo da reserva |
| `user()` | BelongsTo | Solicitante da reserva |

**Carregamento sugerido:** Use `with('horarios', 'user')` ao serializar para JSON para evitar N+1.

### Validações Customizadas

Veja `HorarioDisponivel` (app/Rules) — valida se a faixa horária já está reservada (`horarios.situacao = 'deferida'`).

### Regras de Negócio — Cascata de Situação

A `situacao` de uma `Reserva` é **agregada dos seus horários** (calculada em `AvaliarReservaJob::updateReservaOverallStatus()`):

```
Se totalHorarios === 0:
  situacao = 'indeferida'
Se TODOS os horários são 'deferida':
  situacao = 'deferida'
Se TODOS os horários são 'indeferida':
  situacao = 'indeferida'
Se algum horário está 'em_analise':
  situacao = 'em_analise'
Caso contrário (mix de deferida/indeferida):
  situacao = 'parcialmente_deferida'
```

**Invariante:** Uma reserva em estado `inativa` (arquivada) nunca é recalculada — a cascata é pulada.

### Invariantes Importantes

1. **Em análise não bloqueia validação:** Horários em `em_analise` podem coexistir com horários `deferida` na mesma reserva. Novos horários podem ser submetidos; a validação de conflito roda normalmente.

2. **Inativa é arquivamento, não avaliação:** `inativa` não é resultado de uma decisão do gestor — é um marcador de "descarte/cancelamento". Nunca aparece como opção de aprovação/rejeição nos formulários de avaliação.

3. **Auto-aprovação via unicidade de gestor:** Quando uma reserva é **criada** e existe apenas **um** gestor para **todos** os espaços solicitados, a reserva é automaticamente deferida via `AutoAprovacaoService::calcularSituacaoReserva()`. Essa decisão é tomada **apenas no momento de criação**; edições subsequentes da reserva (escopo `recurring`) não recalculam a situação agregada. Ver [`docs/auto-approval-rule.md`](./auto-approval-rule.md) para detalhes completos.

---

## Horario

**Responsabilidade:** Representa um intervalo de tempo específico em uma agenda de espaço, vinculado a uma reserva e com seu próprio estado de avaliação.

### Atributos Principais

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `agenda_id` | int | FK para a agenda (turno × espaço × gestor) |
| `reserva_id` | int | FK para a reserva-mãe |
| `horario_inicio` | time | Hora de início (ex: 08:00) |
| `horario_fim` | time | Hora de término (ex: 10:00) |
| `data` | date | Data do intervalo |
| `situacao` | string | Estado individual: `solicitado`, `em_analise`, `deferida`, `indeferida`, `inativa` |
| `justificativa` | string \| null | Motivo de indeferimento ou contexto de conflito |
| `user_id` | int | FK para o avaliador (gestor que avaliou este horário) |

### Atributos Dinâmicos (Computados em Runtime)

- **`is_conflicted`** — Boolean, definido por `ReservaService` quando há conflito com outra reserva.
- **`conflict_details`** — String com descrição do conflito (ex: "Conflito com a reserva 'Reunião XYZ' de João").

### Scopes

Nenhum scope definido no model. Filtros são aplicados ao carregar via relacionamentos (ex: `->where('situacao', 'deferida')`).

### Relacionamentos

| Relação | Tipo | Descrição |
|---------|------|-----------|
| `reserva()` | BelongsTo | A reserva-mãe deste horário |
| `agenda()` | BelongsTo | A agenda (turno + espaço + gestor) onde está alocado |
| `avaliador()` | BelongsTo | O usuário (gestor) que avaliou este horário (via `user_id` como foreign key) |

### Situações Possíveis

- **`solicitado`** — Inicial, horário foi incluído na requisição.
- **`em_analise`** — Gestor iniciou análise mas não finalizou.
- **`deferida`** — Gestor aprovou; espaço está reservado.
- **`indeferida`** — Gestor rejeitou (por conflito ou motivo customizado).
- **`inativa`** — Cancelado (quando a reserva-mãe é arquivada).

### Regras de Negócio

1. **Conflito com horários deferidos:** Ao avaliar, se um horário tiver conflito com outro já `deferida` na mesma agenda/data/horário, é automaticamente marcado como `indeferida` (via `AvaliarReservaJob`).

2. **Replicação de status em escopo "all":** Se o escopo de avaliação é "all" (avaliar toda a recorrência), o status e justificativa são replicados para todos os horários do mesmo dia da semana e faixa horária, excetos os conflitantes.

3. **Avaliador é idempotente:** O mesmo gestor pode reavaliar um horário; `user_id` é sempre atualizado para o avaliador mais recente.

---

## Agenda

**Responsabilidade:** Representa um turno de gestão de um espaço, atribuído a um gestor responsável. É a "ponte" entre um espaço e seus horários.

### Atributos Principais

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `turno` | string (enum) | `manha`, `tarde`, `noite` (via `AgendaEnum`) |
| `espaco_id` | int | FK para o espaço |
| `user_id` | int | FK para o gestor responsável |

### Scopes

Nenhum scope definido.

### Relacionamentos

| Relação | Tipo | Descrição |
|---------|------|-----------|
| `espaco()` | BelongsTo | O espaço gerenciado neste turno |
| `horarios()` | HasMany | Todos os horários alocados nesta agenda |
| `user()` | BelongsTo | O gestor responsável (relação muitos-para-um: um user pode gerir várias agendas) |

### Regras de Negócio

1. **Um gestor, múltiplas agendas:** Um usuário pode ser gestor de múltiplas agendas (múltiplos espaços e/ou turnos).

2. **Turno determina horário:** O atributo `turno` é uma convenção semântica — não há validação automática que force os horários a respeitar a faixa do turno. É responsabilidade da lógica de negócio respeitar esta convenção.

---

## Espaco

**Responsabilidade:** Representa um espaço físico que pode ser reservado (sala, auditório, etc.), com capacidade, descrição, imagens e relacionamento hierárquico com andar/módulo/unidade.

### Atributos Principais

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `nome` | string | Nome do espaço |
| `capacidade_pessoas` | int | Número máximo de pessoas |
| `descricao` | string \| null | Descrição/amenidades |
| `imagens` | array (JSON) | URLs ou caminhos das imagens |
| `main_image_index` | int | Índice da imagem principal em `imagens` |
| `andar_id` | int | FK para o andar |
| `user_id` | int | FK para o proprietário/criador |

### Atributos Dinâmicos (Computados em Runtime)

- **`is_favorited_by_user`** — Boolean, indica se o usuário autenticado favoritou este espaço. Calculado via **cache em memória estático** (`$favoritosPorUsuario`), não em query — uma query por usuário por request, reutilizada por todos os espaços.

### Métodos Públicos

#### `static forgetFavoritosCache(?int $userId = null): void`

Limpa o cache de favoritos após uma ação de favoritar/desfavoritar.

```php
// Limpa cache de um usuário específico
Espaco::forgetFavoritosCache($user->id);

// Limpa cache global
Espaco::forgetFavoritosCache();
```

#### `getIsFavoritedByUserAttribute(): bool`

Retorna se o usuário autenticado favoritou este espaço. Usa cache estático para evitar N+1 queries.

### Relacionamentos

| Relação | Tipo | Descrição |
|---------|------|-----------|
| `agendas()` | HasMany | Todos os turnos de gestão deste espaço |
| `andar()` | BelongsTo | O andar onde está localizado |
| `user()` | BelongsTo | Proprietário/criador |
| `favoritadoPor()` | BelongsToMany | Usuários que favoritaram este espaço (tabela pivot `espaco_user`) |

### Regras de Negócio

1. **Cache de favoritos otimizado:** A tabela de favoritos (`espaco_user`) é consultada **uma vez por usuário por request**, e o resultado é memorizável em um array estático. Isso evita N+1 queries ao serializar uma lista de espaços para JSON.

2. **Imagem principal:** `main_image_index` é um índice no array `imagens` — não é validado automaticamente; é responsabilidade da aplicação manter a integridade.

---

## User

**Responsabilidade:** Usuário autenticado do sistema com suporte a roles e permissões (via Spatie), múltiplos "papéis" (solicitante, gestor, instituição, admin), capacidade de favoritizar espaços e receber notificações.

### Atributos Principais

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `name` | string | Nome do usuário |
| `email` | string | E-mail único (com verificação) |
| `password` | string (hashed) | Senha |
| `telefone` | string \| null | Contato telefônico |
| `profile_pic` | string \| null | Caminho relativo da foto de perfil (público) |
| `setor_id` | int \| null | FK para o setor (opcional) |
| `email_verified_at` | datetime \| null | Timestamp de verificação de e-mail |

### Atributos Dinâmicos (Computados em Runtime)

- **`profile_pic`** — Convertido via `Attribute` (accessor) de caminho relativo (ex: `"avatars/xxx.jpg"`) para URL completa via `Storage::disk('public')->url()`.

### Traits e Funcionalidades

| Trait | Fornecedor | Funcionalidade |
|-------|-----------|-----------------|
| `HasRoles` | Spatie Permission | Atribuição de roles e permissões |
| `MustVerifyEmailTrait` | Laravel | Verificação de e-mail obrigatória |
| `Notifiable` | Laravel | Suporte a notificações (queue, broadcast, etc.) |

### Métodos Públicos

#### `receivesBroadcastNotificationsOn(): string`

Retorna o nome do canal privado Reverb para notificações broadcast deste usuário:

```php
$channel = $user->receivesBroadcastNotificationsOn();
// Retorna: "App.Models.User.{$user->id}"
```

### Relacionamentos

| Relação | Tipo | Descrição |
|---------|------|-----------|
| `setor()` | BelongsTo | Setor ao qual pertence (opcional) |
| `agendas()` | HasMany | Agendas (turnos × espaços) gerenciadas por este usuário |
| `reservas()` | HasMany | Reservas solicitadas por este usuário |
| `favoritos()` | BelongsToMany | Espaços favoritados (tabela pivot `espaco_user`) |
| `horariosAvaliados()` | HasMany | Horários avaliados por este usuário (via `Horario.user_id`) |

### Regras de Negócio

1. **Roles e permissões via Spatie:** O sistema usa Spatie Permission para:
   - Atribuir roles (ex: `solicitante`, `gestor`, `institucional`, `admin`)
   - Checar permissões granulares (ex: `reservas.listar`, `reservas.avaliar`, `reservas.visualizar`)
   
   Exemplo de autorização em `ReservaPolicy::view()`:
   ```php
   return $user->hasPermissionTo('reservas.visualizar') || $user->id === $reserva->user_id;
   ```

2. **Um usuário pode ser gestor de múltiplas agendas:** Via relacionamento `agendas()`, um usuário pode gerir múltiplos espaços/turnos.

3. **Verificação de e-mail obrigatória:** O trait `MustVerifyEmailTrait` força que o usuário verifique seu e-mail antes de acessar certas funcionalidades.

4. **Notificações broadcast:** Via `receivesBroadcastNotificationsOn()` e `Notifiable`, o sistema pode enviar notificações em tempo real (ex: quando uma reserva é avaliada).

---

## Fluxo Integrado: Da Solicitação à Avaliação

Este diagrama ilustra como os models interagem:

```
1. User (solicitante) cria Reserva
   ↓
2. Reserva contém N Horarios
   ↓
3. Cada Horario vinculado a uma Agenda (turno × Espaco × Gestor)
   ↓
4. Gestor (User com permissão 'reservas.avaliar')
   evalua cada Horario
   ↓
5. AvaliarReservaJob recalcula
   Reserva.situacao agregada de Horario.situacao
   ↓
6. User recebe notificação ReservationEvaluatedNotification
   com situacao_formatada da Reserva
```

---

## Exemplo de Uso Prático

### Listar minhas reservas ativas, ordenadas por situação

```php
use App\Enums\SituacaoReserva\ModoArquivoEnum;
use App\Enums\SituacaoReserva\OrdenacaoReservaEnum;

$reservas = Reserva::arquivo(ModoArquivoEnum::ATIVAS)
    ->ordenar(OrdenacaoReservaEnum::SITUACAO)
    ->where('user_id', $user->id)
    ->with('horarios', 'user')
    ->paginate();
```

### Verificar se posso editar uma reserva

```php
// Atributo dinâmico definido por ReservaService
if ($reserva->can_update) {
    // Renderizar botão de edição
}

// Ou manualmente via Policy
if ($user->can('update', $reserva)) {
    // Usuario tem permissão
}
```

### Recuperar a situação formatada de uma reserva

```php
echo $reserva->situacao_formatada;
// Saída: "Em Análise", "Deferida", etc.
```

### Favoritar um espaço e limpar cache

```php
$user->favoritos()->attach($espaco->id);
Espaco::forgetFavoritosCache($user->id);

// Próximas serializações de Espaco usarão novo cache
```

### Acessar o gestor de um horário

```php
$horario = Horario::find($id);
$gestor = $horario->avaliador; // User que avaliou este horário
$agenda = $horario->agenda; // Agenda (turno × espaço)
$espaco = $agenda->espaco; // Espaco
```

### Buscar reservas em análise que compartilham slots com uma recém-aprovada

```php
// Disparado automaticamente após aprovar um horário (AvaliarReservaJob::triggerConflictRevalidation)
$reservasParaRevalidar = Reserva::where('situacao', 'em_analise')
    ->where('validation_status', 'completed')
    ->whereHas('horarios', function ($query) use ($slotsOcupados) {
        // ... lógica de busca de conflitos
    })
    ->get();
```

---

## Enums Relacionados

### `SituacaoReservaEnum`

```php
enum SituacaoReservaEnum: string {
    case EM_ANALISE = 'em_analise';
    case INDEFERIDA = 'indeferida';
    case PARCIALMENTE_DEFERIDA = 'parcialmente_deferida';
    case DEFERIDA = 'deferida';
    case INATIVA = 'inativa';
    
    // Apenas casos que são resultado de avaliação
    // (exclui INATIVA, que é arquivamento)
    public static function valoresDeAvaliacao(): array;
}
```

### `ModoArquivoEnum`

```php
enum ModoArquivoEnum: string {
    case ATIVAS = 'ativas';         // Exclui inativas (padrão)
    case ARQUIVADAS = 'arquivadas'; // Só inativas
    case TODAS = 'todas';           // Sem filtro
    
    // Resolve valor da query string, fallback para ATIVAS
    public static function fromFiltro(mixed $valor): self;
}
```

### `OrdenacaoReservaEnum`

```php
enum OrdenacaoReservaEnum: string {
    case DATA_SOLICITACAO = 'data_solicitacao'; // latest() (padrão)
    case SITUACAO = 'situacao'; // Prioridade fixa + latest()
    
    // Resolve valor da query string, fallback para DATA_SOLICITACAO
    public static function fromFiltro(mixed $valor): self;
}
```

### `AgendaEnum`

```php
enum AgendaEnum: string {
    case MANHA = 'manha';
    case TARDE = 'tarde';
    case NOITE = 'noite';
}
```

---

## Notas Importantes

1. **Queries N+1:** Sempre use `with()` ao carregar relacionamentos para serialização. Exemplo: `Reserva::with('horarios', 'user')->get()`.

2. **Validações customizadas:** A regra `HorarioDisponivel` valida se uma faixa horária já está `deferida`. Conflitos adicionais são detectados pela `ConflictDetectionService` durante a avaliação.

3. **Permissões Spatie:** Referem-se a `reservas.listar`, `reservas.visualizar`, `reservas.atualizar`, `reservas.avaliar`, etc. Consulte `RoleService` e migrations de permissões para a lista completa.

4. **Estado `em_analise` é transitório:** Não bloqueia novas submissões ou criação de novos horários. É apenas um marcador de "em progresso".

5. **Arquivamento via `inativa`:** Não é reversível no código; é um estado final. Quando uma reserva é cancelada (`ReservaService::cancel()`), ela e todos seus horários são marcados como `inativa`.
