# Validações Customizadas

Este documento descreve todas as Rules customizadas, FormRequests que as usam, e o padrão de validação frontend vs backend implementado no UniEspaços.

## Sumário

- [Rules Customizadas](#rules-customizadas)
  - [HorarioDisponivel](#horariodisponivel)
  - [HorariosMesmoEspaco](#horariosmesmoespaco)
  - [UsuarioDaMesmaInstituicaoDaAgenda](#usuariodamesmainstituicaodaagenda)
  - [UniqueNormalizedFloorName](#uniquenormalizedfloorname)
- [FormRequests e Suas Rules](#formrequests-e-suas-rules)
- [Padrão: Validação Frontend vs Backend](#padrão-validação-frontend-vs-backend)
- [Implicações para Issue #107](#implicações-para-issue-107)

---

## Rules Customizadas

### HorarioDisponivel

**Localização:** `app/Rules/HorarioDisponivel.php`

**Responsabilidade:** Impedir que um horário (time slot) seja reservado se já existe outra reserva **aprovada (deferida)** no mesmo intervalo, na mesma agenda e data.

#### Quando é Usada

- `StoreReservaRequest::rules()` — ao criar uma nova reserva
- `UpdateReservaRequest::rules()` — ao editar horários de uma reserva existente
- Aplicada ao campo `horarios_solicitados.*.agenda_id`

#### Lógica de Validação

```php
// Verifica se existe conflito
$conflict = DB::table('horarios')
    ->where('data', $horario['data'])
    ->where('horario_inicio', $horario['horario_inicio'])
    ->where('agenda_id', $horario['agenda_id'])
    ->where('situacao', 'deferida')  // Apenas deferida bloqueia
    ->exists();
```

#### Caso de Uso: Cenário Prático

1. **Sala A, 14h–15h, terça-feira:** existe uma reserva **deferida** (aprovada)
2. Usuário tenta criar/editar uma segunda reserva para **Sala A, 14h–15h, mesma terça-feira**
3. **Resultado:** Validação falha com mensagem de erro

#### Comportamento Crítico: `em_analise` NÃO Bloqueia

- Horários com `situacao = 'em_analise'` (em avaliação) **não bloqueiam** a validação
- **Motivo:** Um horário sob análise ainda pode ser indeferido; bloquear preventivamente torna a UX ruim (usuário não pode enviar uma segunda solicitação alternativa enquanto aguarda resposta)
- Cabe ao gestor avaliar conflitos com horários pendentes; o frontend oferece visibilidade (via issue #107)

#### Mensagem de Erro

```
"O horário selecionado já está reservado ou em análise."
```

**Nota:** A mensagem menciona "em análise" para fins informativos do usuário, mas tecnicamente o campo `situacao` da validação só checka `'deferida'`.

#### Nível de Validação

- **Backend:** Determinante; regra de negócio crítica
- **Frontend:** Feedback visual (ConflictDetectionService, ver seção abaixo)

---

### HorariosMesmoEspaco

**Localização:** `app/Rules/HorariosMesmoEspaco.php`

**Responsabilidade:** Garantir que todos os horários solicitados em uma reserva apontam para agendas do mesmo espaço. Previne incoerência de dados onde uma única Reserva teria horários em múltiplos espaços.

#### Quando é Usada

- `StoreReservaRequest::rules()` — ao criar uma nova reserva
- `UpdateReservaRequest::rules()` — ao editar horários de uma reserva existente
- Aplicada ao campo `horarios_solicitados` (o array inteiro)

#### Lógica de Validação

```php
// Para cada horário solicitado, busca o espaco_id da agenda
$espacoIds = [];
foreach ($value as $horario) {
    $espacoId = DB::table('agendas')
        ->where('id', $horario['agenda_id'])
        ->value('espaco_id');
    
    $espacoIds[] = $espacoId;
}

// Valida que todos os IDs são idênticos
if (count(array_unique($espacoIds)) > 1) {
    // Falha: múltiplos espaços detectados
}
```

#### Caso de Uso: Cenário Prático

1. **Espaço A** tem agendas com IDs 1, 2, 3
2. **Espaço B** tem agendas com IDs 4, 5, 6
3. Usuário tenta criar reserva com:
   - Horário 1: `agenda_id = 1` (Espaço A)
   - Horário 2: `agenda_id = 4` (Espaço B)
4. **Resultado:** Validação falha; todos os horários devem estar no mesmo espaço

#### Implicação de Negócio

- **Integridade de dados:** Uma Reserva representa um compromisso único e coeso; não faz sentido que abranja múltiplos espaços simultaneamente
- **Prevenção de anomalias:** Sem essa validação, fluxos downstream (análise de disponibilidade, notificações por espaço, relatórios) podem gerar comportamento imprevisível

#### Mensagem de Erro

```
"Todos os horários solicitados devem estar no mesmo espaço."
```

#### Nível de Validação

- **Backend:** Determinante; regra de negócio de integridade estrutural

---

### UsuarioDaMesmaInstituicaoDaAgenda

**Localização:** `app/Rules/UsuarioDaMesmaInstituicaoDaAgenda.php`

**Responsabilidade:** Garantir que um usuário designado como gestor de turno pertence à mesma instituição do espaço. Previne vazamento de dados entre instituições.

#### Quando é Usada

- `AlterarGestoresEspacoRequest::rules()` — ao atribuir gestores a um espaço
- Aplicada ao campo `gestores.user_id.*`
- Recebe `$espacoId` no construtor

#### Lógica de Validação

```php
// 1. Encontra o espaço
$espaco = Espaco::find($espacoId);

// 2. Encontra o usuário a validar
$user = User::find($value);

// 3. Compara instituição
if ($user->setor->unidade->instituicao_id 
    !== $espaco->andar->modulo->unidade->instituicao_id) {
    // Falha: instituições diferentes
}
```

#### Caso de Uso: Cenário Prático

1. **Espaço "Sala de Reunião A"** pertence ao módulo "Bloco A" da **Unidade de Engenharia** (Instituição UESB)
2. Administrador tenta atribuir usuário "João" como gestor matutino
3. "João" pertence ao **Setor de Informática** (Instituição UFSB)
4. **Resultado:** Validação falha; "João" não pode ser gestor da Sala A

#### Implicação de Negócio

- **Governança multi-instituição:** Cada instituição gerencia seus próprios espaços e gestores
- Impossibilita que um colaborador de outra instituição obtenha acesso administrativo
- Aplicado na camada de autorização, não em policies (validation é primeira linha de defesa)

#### Mensagem de Erro

```
"O gestor deve pertencer à mesma instituição do espaço."
```

---

### UniqueNormalizedFloorName

**Localização:** `app/Rules/UniqueNormalizedFloorName.php`

**Responsabilidade:** Garantir que nenhum outro andar tenha o mesmo nome normalizado (case-insensitive, trimmed).

#### Quando é Usada

**Status:** Implementada mas não está sendo utilizada na FormRequest `StoreAndarRequest` atualmente.

**Contexto:** A rule existe como preparação para validação customizada de unicidade de andares. Atualmente, a unicidade é verificada via constraint de banco (unique index em `nome_normalizado`) e tratada via catch de `QueryException` no controller.

#### Lógica de Validação

```php
// Normaliza o nome (lowercase + trim)
$normalized = Andar::normalizarNome($value);  // "ANDAR 1" → "andar 1"

// Verifica se existe outro andar com esse nome normalizado
$query = Andar::where('nome_normalizado', $normalized);

// Em updates, ignora o próprio andar
if ($this->ignoreId !== null) {
    $query->where('id', '!=', $this->ignoreId);
}
```

#### Normalização

```php
// Em app/Models/Andar.php
public static function normalizarNome(string $nome): string
{
    return mb_strtolower(trim($nome));
}
```

**Exemplos de equivalência normalizada:**
- `"Andar 1"`, `"ANDAR 1"`, `"andar 1"` → tudo normaliza para `"andar 1"`
- `"  2º Andar  "` → normaliza para `"  2º andar  "` (trim + lowercase)

#### Mensagem de Erro (se usada)

```
"Este nome de andar, ou uma variação dele, já está cadastrado."
```

#### Nota Técnica

- Implementação preparada para uso futuro ou refatoração (ex: migrar de constraint DB para validação explícita em FormRequest)
- Implementa tanto `ValidationRule` (Laravel 11+) quanto suporta padrão de rule customizada

---

## FormRequests e Suas Rules

### StoreReservaRequest

**Localização:** `app/Http/Requests/StoreReservaRequest.php`

**Context:** Criação de nova reserva

| Campo | Rules | Propósito |
|-------|-------|----------|
| `titulo` | `required`, `string`, `max:255` | Título descritivo da reserva |
| `descricao` | `nullable`, `string` | Justificativa (opcional) |
| `data_inicial` | `required`, `date`, `after_or_equal:today` | Início do período (hoje ou futura) |
| `data_final` | `required`, `date`, `after_or_equal:data_inicial` | Término do período (≥ data inicial) |
| `recorrencia` | `required`, `in:unica,15dias,1mes,personalizado` | Padrão de repetição |
| `horarios_solicitados` | `required`, `array`, `min:1`, **`HorariosMesmoEspaco`** | Array de time slots solicitados (validação de espaço único) |
| `horarios_solicitados.*.data` | `required`, `date`, `after_or_equal:today` | Data de cada horário (hoje ou futura) |
| `horarios_solicitados.*.horario_inicio` | `required`, `date_format:H:i:s` | Hora de início (HH:MM:SS) |
| `horarios_solicitados.*.horario_fim` | `required`, `date_format:H:i:s` | Hora de término |
| `horarios_solicitados.*.agenda_id` | `required`, `integer`, `exists:agendas,id`, **`HorarioDisponivel`** | Validação de disponibilidade |

**Ordem de Validação Crítica:**
1. `horarios_solicitados` é validado quanto à estrutura (`required`, `array`, `min:1`)
2. `HorariosMesmoEspaco` executa e verifica se todas as agendas apontam para o mesmo espaço
3. `horarios_solicitados.*.agenda_id` é validado quanto à existência (`exists:agendas,id`)
4. `HorarioDisponivel` executa (por item) e checa banco de dados por conflitos

---

### UpdateReservaRequest

**Localização:** `app/Http/Requests/UpdateReservaRequest.php`

**Context:** Edição de reserva existente

| Campo | Rules | Propósito |
|-------|-------|----------|
| `titulo` | `required`, `string`, `max:255` | Título descritivo da reserva |
| `descricao` | `nullable`, `string` | Justificativa (opcional) |
| `data_inicial` | `required`, `date` | Início do período (sem validação de data passada) |
| `data_final` | `required`, `date`, `after_or_equal:data_inicial` | Término do período (≥ data inicial) |
| `recorrencia` | `required`, `in:unica,15dias,1mes,personalizado` | Padrão de repetição |
| `horarios_solicitados` | `present`, `array`, **`HorariosMesmoEspaco`** | Array de time slots (pode ser vazio, validação de espaço único) |
| `horarios_solicitados.*.data` | `required`, `date` | Data de cada horário (sem validação de data passada) |
| `horarios_solicitados.*.horario_inicio` | `required`, `date_format:H:i:s` | Hora de início (HH:MM:SS) |
| `horarios_solicitados.*.horario_fim` | `required`, `date_format:H:i:s` | Hora de término |
| `horarios_solicitados.*.agenda_id` | `required`, `integer`, `exists:agendas,id`, **`HorarioDisponivel`** | Validação de disponibilidade |
| `edit_scope` | `required`, `Rule::in(['single', 'recurring'])` | Single: edita só essa ocorrência; Recurring: edita toda série |
| `edited_week_date` | `required_if:edit_scope,single`, `nullable`, `date` | Data de referência para edição única |

**Diferenças Intencionais em Relação a `StoreReservaRequest`:**

A validação de data em `data_inicial` e `horarios_solicitados.*.data` **não inclui** `after_or_equal:today` na edição, diferentemente da criação. Motivo: **Reservas recorrentes criadas no passado** (ex: `recorrencia=personalizado` iniciada há 2 meses, vigente até o próximo mês) precisam ser editáveis para manutenção de horários sem serem rejeitadas pelo backend. Se `UpdateReservaRequest` exigisse `after_or_equal:today` em `data_inicial`, qualquer alteração nessas reservas seria bloqueada.

A regra "não pode criar reserva com data passada" vale **apenas na criação** (`StoreReservaRequest`). Alterações em reservas em andamento são permitidas; qualquer correção de data para trás é manual e autorizada pelo gestor/administrador.

**Validação HorariosMesmoEspaco:** Mesmo comportamento que em `StoreReservaRequest` — valida que todos os horários estão no mesmo espaço

**Validação HorarioDisponivel:** Mesmo comportamento, mesma regra aplicada aos horários solicitados

---

### AlterarGestoresEspacoRequest

**Localização:** `app/Http/Requests/AlterarGestoresEspacoRequest.php`

**Context:** Atribuição/edição de gestores a um espaço (por turno)

| Campo | Rules | Propósito |
|-------|-------|----------|
| `gestores` | `required` | Objeto contendo turnos e usuários |
| `gestores.turno.*` | `required`, `string`, `in:manha,tarde,noite` | Identificação do turno |
| `gestores.user_id.*` | `nullable`, `exists:users,id`, **`UsuarioDaMesmaInstituicaoDaAgenda($espacoId)`** | Gestor do turno (validado) |

**Autorização:**
- Checa se usuário autenticado tem permissão `espacos.alterar-gestores` (em `authorize()`)

**Validação de Regra Customizada:**
- `UsuarioDaMesmaInstituicaoDaAgenda` é instanciada com o `$espacoId` extraído da rota (`$this->route('espaco')->id`)

---

## Padrão: Validação Frontend vs Backend

O UniEspaços implementa **dupla camada de validação** para horários:

### 1. Frontend (ConflictDetectionService)

**Localização:** `app/Services/ConflictDetectionService.php`

**Propósito:** Feedback imediato ao usuário (UX) sem round-trip ao servidor

**Implementação:**
```php
public function findConflictsFor(int $reservaId): Collection
{
    $rows = DB::select('
        SELECT ...
        FROM horarios AS h_checar
        JOIN horarios AS h_conflito
            ON h_checar.reserva_id = ?
            AND h_conflito.situacao = \'deferida\'
            AND h_conflito.agenda_id = h_checar.agenda_id
            AND h_conflito.data = h_checar.data
            AND h_conflito.horario_inicio < h_checar.horario_fim
            AND h_conflito.horario_fim > h_checar.horario_inicio
        ...
    ');
    return collect($rows)->keyBy('horario_checado_id');
}
```

**Comportamento:**
- Usado ao carregar formulário de edição ou após seleção de novos horários
- Retorna lista de conflitos (reserva_id, título, usuário conflitante)
- Permite ao frontend exibir alerta: "Já existe reserva deferida: [Título] de [Usuário]"

**Verificação:** Apenas `situacao = 'deferida'` (mesmo que HorarioDisponivel)

### 2. Backend (HorarioDisponivel Rule)

**Localização:** `app/Rules/HorarioDisponivel.php`

**Propósito:** Validação autoritária (backend é sempre fonte verdade)

**Aplicação:**
- Executada no momento de POST/PUT (ao submeter formulário)
- Rejeita se `horarios_solicitados.*.agenda_id` tiver conflito com `situacao = 'deferida'`
- Garante que submit malicioso (contornando frontend) é bloqueado

### Por Que Ambas?

| Aspecto | Frontend | Backend |
|--------|----------|---------|
| **Timing** | Imediato (enquanto preenche) | Após submit |
| **Propósito** | UX (feedback rápido) | Segurança (regra de negócio) |
| **Confiabilidade** | Pode ser contornada (JS desabilitado, console) | Determinante; aplicada em toda requisição |
| **Fluxo** | Alerta visual, impede submit se grave | Rejeita com erro HTTP 422 |

**Padrão Implementado:**
1. Frontend carrega conflicts e avisa: "Há reserva deferida neste horário"
2. Usuário pode prosseguir mesmo assim (pode ser ignorado? ou realmente bloqueado?)
3. Backend valida: se existe conflito deferido, reject
4. Usuário recebe erro; precisa escolher outro horário

---

## Implicações para Issue #107

**Issue #107:** Alerta de pendências (horários sob análise que podem afetar disponibilidade)

### Contexto

Quando um usuário está tentando criar/editar uma reserva, pode haver **horários em outras reservas que estão em_analise** e podem ser deferidos depois, bloqueando o horário escolhido.

### Comportamento Atual (Confirmado pelo Código)

- `HorarioDisponivel` **não bloqueia** horários com `situacao = 'em_analise'`
- `ConflictDetectionService` **também só retorna** `situacao = 'deferida'`
- Resultado: O usuário pode enviar uma reserva para 14h–15h mesmo que haja outra solicitação pendente para o mesmo intervalo

### Implementação para Issue #107

Quando implementar "alerta de pendências", seguir este padrão:

1. **Frontend:** Criar novo serviço (ex: `PendingSlotDetectionService`) que retorna horários com `situacao = 'em_analise'` na mesma agenda/data/intervalo
2. **Aviso visual:** Mostrar alert **informativo** (não bloqueante): "Há horários sob análise neste intervalo. O resultado pode afetar a disponibilidade."
3. **Permitir envio:** Usuário pode prosseguir; é responsabilidade do gestor avaliar prioridade
4. **Decisão de negócio:** Documente se é "apenas aviso" ou "bloqueante em certos casos"

### Exemplo de Regra de Negócio (Sugestão)

```
Se há ≥1 horário em_analise no intervalo:
  - Mostrar badge/badge amarelo: "Pendências detectadas"
  - Permitir submit (é apenas aviso)
  - Caso seja aprovado depois, usuário será notificado de conflito
```

---

## Resumo de Regras por Contexto

### Criação/Edição de Reserva

| Validação | Nível | Bloqueante |
|-----------|-------|-----------|
| `HorariosMesmoEspaco` | Backend (Rule) | ✅ Sim |
| `HorarioDisponivel` (deferida) | Backend (Rule) | ✅ Sim |
| Conflitos deferidos (frontend) | Frontend (Service) | ⚠️ Info apenas |
| Pendências (em_analise) | Frontend (Future) | ⚠️ Info apenas |

### Atribuição de Gestores

| Validação | Nível | Bloqueante |
|-----------|-------|-----------|
| `UsuarioDaMesmaInstituicaoDaAgenda` | Backend (Rule) | ✅ Sim |
| Permissão `espacos.alterar-gestores` | Backend (Policy) | ✅ Sim |

### Cadastro de Andares

| Validação | Nível | Bloqueante |
|-----------|-------|-----------|
| `UniqueNormalizedFloorName` | Backend (Rule, preparada) | ✅ Sim (se usado) |
| Constraint DB (unique index) | Backend (DB) | ✅ Sim (ativo) |

