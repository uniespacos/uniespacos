# Validações Customizadas

Este documento descreve as Rules customizadas, os FormRequests que as usam e onde cada verificação de conflito de horário acontece.

## Sumário

- [Rules Customizadas](#rules-customizadas)
  - [HorarioDisponivel](#horariodisponivel)
  - [DataDoHorarioNoPeriodo](#datadohorarionoperiodo)
  - [HorariosMesmoEspaco](#horariosmesmoespaco)
  - [UsuarioDaMesmaInstituicaoDaAgenda](#usuariodamesmainstituicaodaagenda)
  - [Unicidade de andares por módulo](#unicidade-de-andares-por-módulo)
- [FormRequests e Suas Rules](#formrequests-e-suas-rules)
- [Onde cada verificação de conflito acontece](#onde-cada-verificação-de-conflito-acontece)
  - [Horários em análise (#107)](#horários-em-análise-107)

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
// Simplificado de app/Rules/HorarioDisponivel.php
if ($editScope === 'single') {
    // Slot fora da semana (seg–dom) de edited_week_date: retorna sem validar
    $datasParaVerificar = [$data];
} else {
    $datasParaVerificar = app(ExpansaoHorariosService::class)->datasExpandidasParaSlot($horario, $horariosRaw, $recorrencia, $dataFinalRaw);
}

DB::table('horarios')
    ->whereIn('data', $datasParaVerificar)
    ->where('agenda_id', $agendaId)
    ->where('situacao', SituacaoReservaEnum::DEFERIDA->value)  // Apenas deferida bloqueia
    ->where('horario_inicio', '<', $horarioFim)                // Sobreposição de intervalo
    ->where('horario_fim', '>', $horarioInicio)
    ->orderBy('data')->orderBy('horario_inicio')
    ->first();                                                  // + reserva_id != $ignorarReservaId, se informado
```

Dois horários conflitam quando seus intervalos se sobrepõem. Intervalos adjacentes (um termina no instante em que o outro começa) não conflitam. Para recorrências periódicas (`15dias`, `1mes`, `personalizado`), cada slot enviado tem suas datas expandidas via `ExpansaoHorariosService::datasExpandidasParaSlot()` (até `data_final`, parando antes de seleções explícitas em semanas futuras do mesmo dia da semana) e todas são checadas já no envio. Na edição de ocorrência única (`edit_scope === 'single'`), a regra valida só os slots cuja data cai na semana (seg–dom) de `edited_week_date`; slots de outras semanas são aceitos sem checagem, porque o job não os grava. Na edição, `UpdateReservaRequest` passa o ID da reserva ao construtor (`new HorarioDisponivel($reservaId)`), e os horários da própria reserva são excluídos da checagem. Na criação, `StoreReservaRequest` usa `new HorarioDisponivel` sem argumento.

#### Caso de Uso: Cenário Prático

1. **Sala A, 14h–15h, terça-feira:** existe uma reserva **deferida** (aprovada)
2. Usuário tenta criar/editar uma segunda reserva para **Sala A, 14h–15h, mesma terça-feira**
3. **Resultado:** Validação falha com mensagem de erro

#### Comportamento Crítico: `em_analise` NÃO Bloqueia

- Horários com `situacao = 'em_analise'` (em avaliação) **não bloqueiam** a validação
- **Motivo:** Um horário sob análise ainda pode ser indeferido; bloquear preventivamente torna a UX ruim (usuário não pode enviar uma segunda solicitação alternativa enquanto aguarda resposta)
- Cabe ao gestor avaliar conflitos com horários pendentes. Dar visibilidade das solicitações pendentes a quem solicita é o item #107 do [backlog](../backlog.md), ainda não implementado

#### Mensagem de Erro

Chave traduzível (a frase em inglês é a chave em `lang/*.json`):

```
"The time slot :start–:end on :date is already reserved."
pt-BR: "O horário :start–:end de :date já está reservado."
es:    "El horario :start–:end del día :date ya está reservado."
```

- `:start` e `:end` são a faixa solicitada (HH:MM).
- `:date` é a data do **primeiro** conflito encontrado (ordenado por data e início), no formato `dd/mm/aaaa`.
- A mensagem não cita o solicitante do horário em conflito.
- Não cita "em análise": só horários `deferida` bloqueiam, e a mensagem não sugere o contrário.

#### Nível de Validação

- **Envio (backend):** determinante; rejeita com 422.
- **Avaliação:** o gestor vê os conflitos na tela de avaliação, e o job de avaliação indefere o horário em conflito (ver [Onde cada verificação de conflito acontece](#onde-cada-verificação-de-conflito-acontece)).

---

### DataDoHorarioNoPeriodo

**Localização:** `app/Rules/DataDoHorarioNoPeriodo.php`

**Responsabilidade:** Garantir que a data de cada item de `horarios_solicitados` esteja dentro do período `[data_inicial, data_final]` da própria reserva. Sem essa regra, um horário fora do período podia ser gravado e deixar a revisão e os detalhes da reserva com períodos diferentes.

#### Quando é Usada

| Requisição | Campo | Aplicada |
|---|---|---|
| `StoreReservaRequest` | `horarios_solicitados.*.data` | Sempre |
| `UpdateReservaRequest` | `horarios_solicitados.*.data` | Só com `edit_scope = recurring` |

Na edição `single`, a regra não entra. O job recalcula `data_inicial` e `data_final` a partir do menor e do maior horário restante (`UpdateReservaJob`), então o período não limita os slots da semana editada.

#### Lógica de Validação

```php
// Simplificado de app/Rules/DataDoHorarioNoPeriodo.php
// Compara só a parte de data (Y-m-d). Se algum valor não for uma data válida,
// a regra não age: as regras `date` e `after_or_equal` do próprio campo já barram.
if ($data < $dataInicial->toDateString()) {
    $fail('Each time slot date must be on or after the start date.');
}
if ($data > $dataFinal->toDateString()) {
    $fail('Each time slot date must be on or before the end date.');
}
```

#### Mensagens de Erro

| Caso | Chave | pt-BR |
|---|---|---|
| Data antes de `data_inicial` | `Each time slot date must be on or after the start date.` | "A data de cada horário deve ser igual ou posterior à data inicial." |
| Data depois de `data_final` | `Each time slot date must be on or before the end date.` | "A data de cada horário deve ser igual ou anterior à data final." |

#### Efeito no Front

No passo 1, `data_inicial` é derivada do menor horário selecionado e fica somente leitura, em todas as recorrências. Por isso a tela não envia um período que começa depois dos horários. O backend mantém a regra como barreira para payloads que não passam pela tela.

#### Nível de Validação

- **Backend:** determinante; rejeita com 422.

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

### Unicidade de andares por módulo

**Localização:** `app/Http/Requests/StoreModuloRequest.php` (`validateAndaresUniqueness()`) e `app/Services/ModuloService.php` (`update()`)

**Responsabilidade:** Garantir que um módulo não tenha dois andares com o mesmo nome.

Não é uma Rule. A unicidade é **por módulo**, não global, porque todo módulo tem o seu próprio `terreo`.

#### Por que não é texto livre

`andares.*.nome` é um slug de lista fechada, validado com `in:subsolo-2,subsolo-1,terreo,andar-1,...,andar-10`. Um módulo tem no máximo 12 andares (`max:12`). Como o conjunto de valores é fixo, a comparação é exata, sem normalização de caixa ou de espaços.

#### Como a unicidade é garantida hoje

Não há CRUD avulso de andar. Os andares são criados e editados junto com o módulo: `InstitucionalModuloController::store()` e `update()` validam com `StoreModuloRequest` e `UpdateModuloRequest` (este estende o primeiro) e delegam a `ModuloService::store()` e `ModuloService::update()`.

| Fluxo | Mecanismo | Efeito |
|-------|-----------|--------|
| Criação (`ModuloService::store()`) | `StoreModuloRequest::validateAndaresUniqueness()` rejeita slugs repetidos no payload | Erro de validação em `andares` ("Há andares duplicados. Cada andar deve ser único."), devolvido ao formulário pelo Inertia |
| Edição (`ModuloService::update()`) | Mesma validação no payload. Em seguida, `$modulo->andars()->updateOrCreate(['nome' => ...], ...)`, escopado por `modulo_id` | Reenviar um andar existente atualiza o `tipo_acesso` em vez de duplicar |

Na edição, andares que saem do payload são apagados. A exceção é o andar que ainda tem espaços: nesse caso o service lança exceção e a transação é desfeita.

O `withValidator` também impõe a integridade da sequência: não pode haver gaps, o térreo é obrigatório, e cada andar exige o anterior (`andar-1` exige o térreo; `subsolo-2` exige `subsolo-1`).

#### Mensagem de Erro

```
"Há andares duplicados. Cada andar deve ser único."
```

#### Limite do Banco

- A tabela `andars` tem apenas a chave primária. Não há índice único em `(modulo_id, nome)` e não há coluna de nome normalizado.
- A unicidade depende só da aplicação. Na criação não há corrida possível, porque cada requisição cria um módulo novo. Na edição, duas requisições simultâneas para o mesmo módulo podem, em tese, executar o `updateOrCreate` ao mesmo tempo (nenhuma encontra o andar e as duas o inserem), gerando duplicatas. Não há lock nem constraint que impeça isso. Esse é o risco residual conhecido. A constraint no banco está prevista no [backlog](../backlog.md) (S74).

---

## FormRequests e Suas Rules

### StoreReservaRequest

**Localização:** `app/Http/Requests/StoreReservaRequest.php`

**Context:** Criação de nova reserva

| Campo | Rules | Propósito |
|-------|-------|----------|
| `titulo` | `required`, `string`, `max:255` | Título descritivo da reserva |
| `descricao` | `nullable`, `string`, `max:2000` | Justificativa (opcional) |
| `data_inicial` | `required`, `date`, `after_or_equal:today` | Início do período (hoje ou futura) |
| `data_final` | `required`, `date`, `after_or_equal:data_inicial` | Término do período (≥ data inicial) |
| `recorrencia` | `required`, `in:unica,15dias,1mes,personalizado` | Padrão de repetição |
| `horarios_solicitados` | `required`, `array`, `min:1`, **`HorariosMesmoEspaco`** | Array de time slots solicitados (validação de espaço único) |
| `horarios_solicitados.*.data` | `required`, `date`, `after_or_equal:today`, **`DataDoHorarioNoPeriodo`** | Data de cada horário (hoje ou futura, e dentro de `data_inicial`–`data_final`) |
| `horarios_solicitados.*.horario_inicio` | `required`, `date_format:H:i:s` | Hora de início (HH:MM:SS) |
| `horarios_solicitados.*.horario_fim` | `required`, `date_format:H:i:s`, `after:horarios_solicitados.*.horario_inicio` | Hora de término (deve ser posterior ao início) |
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
| `descricao` | `nullable`, `string`, `max:2000` | Justificativa (opcional) |
| `data_inicial` | `required`, `date` | Início do período (sem validação de data passada) |
| `data_final` | `required`, `date`, `after_or_equal:data_inicial` | Término do período (≥ data inicial) |
| `recorrencia` | `required`, `in:unica,15dias,1mes,personalizado` | Padrão de repetição |
| `horarios_solicitados` | `present`, `array`, **`HorariosMesmoEspaco`** | Array de time slots (pode ser vazio, validação de espaço único) |
| `horarios_solicitados.*.data` | `required`, `date`, **`DataDoHorarioNoPeriodo`** (só com `edit_scope = recurring`) | Data de cada horário (sem validação de data passada) |
| `horarios_solicitados.*.horario_inicio` | `required`, `date_format:H:i:s` | Hora de início (HH:MM:SS) |
| `horarios_solicitados.*.horario_fim` | `required`, `date_format:H:i:s`, `after:horarios_solicitados.*.horario_inicio` | Hora de término (deve ser posterior ao início) |
| `horarios_solicitados.*.agenda_id` | `required`, `integer`, `exists:agendas,id`, **`HorarioDisponivel`** | Validação de disponibilidade (na `single`, só dos slots da semana editada) |
| `edit_scope` | `required`, `Rule::in(['single', 'recurring'])` | Single: edita só a semana de `edited_week_date`; Recurring: edita toda a série |
| `edited_week_date` | `required_if:edit_scope,single`, `nullable`, `date` | Data de referência para edição única (define a semana seg–dom) |

**Diferenças Intencionais em Relação a `StoreReservaRequest`:**

A validação de data em `data_inicial` e `horarios_solicitados.*.data` **não inclui** `after_or_equal:today` na edição, diferentemente da criação. A regra de período (`DataDoHorarioNoPeriodo`) entra na edição só no escopo `recurring`; no `single`, o job recalcula o período (ver [DataDoHorarioNoPeriodo](#datadohorarionoperiodo)). Motivo: **Reservas recorrentes criadas no passado** (ex: `recorrencia=personalizado` iniciada há 2 meses, vigente até o próximo mês) precisam ser editáveis para manutenção de horários sem serem rejeitadas pelo backend. Se `UpdateReservaRequest` exigisse `after_or_equal:today` em `data_inicial`, qualquer alteração nessas reservas seria bloqueada.

A regra "não pode criar reserva com data passada" vale **apenas na criação** (`StoreReservaRequest`). Alterações em reservas em andamento são permitidas; qualquer correção de data para trás é manual e autorizada pelo gestor/administrador.

**Validação HorariosMesmoEspaco:** Mesmo comportamento que em `StoreReservaRequest` — valida que todos os horários estão no mesmo espaço

**Validação HorarioDisponivel:** Mesmo comportamento, mesma regra aplicada aos horários solicitados

---

### AvaliarReservaRequest

**Localização:** `app/Http/Requests/AvaliarReservaRequest.php`

**Context:** Avaliação de horários de uma reserva pelo gestor da agenda

| Campo | Rules | Propósito |
|-------|-------|----------|
| `situacao` | `required`, `Rule::in(['parcialmente_deferida', 'deferida', 'indeferida', 'em_analise'])` | Decisão da avaliação |
| `motivo` | `required_if:situacao,indeferida`, `nullable`, `string`, `max:2000` | Justificativa. Obrigatório quando a situação é `indeferida` |

**Mensagens personalizadas:**

- `motivo.string`: `__('The reason must be a valid text.')` (pt-BR: "O motivo deve ser um texto válido.")
- `motivo.max`: `__('The reason may not have more than :max characters.', ['max' => 2000])` (pt-BR: "O motivo não pode ter mais de 2000 caracteres.")
- `motivo.required_if` não tem mensagem própria. Usa a tradução padrão de `lang/pt/validation.php`: "O campo :attribute é obrigatório quando :other for :value."

**Regra em `after()`:** cada horário avaliado deve pertencer a uma agenda gerenciada pelo gestor. Caso contrário: "Um ou mais horários pertencem a agendas que você não gerencia."

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

### StoreModuloRequest e UpdateModuloRequest

**Localização:** `app/Http/Requests/StoreModuloRequest.php` e `app/Http/Requests/UpdateModuloRequest.php`

**Autorização:**
- `StoreModuloRequest::authorize()` exige `modulos.criar`.
- `UpdateModuloRequest` estende `StoreModuloRequest` (mesmas regras de campos e andares), mas sobrescreve `authorize()` para exigir `modulos.atualizar`, em alinhamento com `ModuloPolicy::update()`.

---

## Onde cada verificação de conflito acontece

A sobreposição com horário `deferida` é verificada em quatro pontos, todos no backend. A condição é a mesma nos quatro: mesma agenda, mesma data e `horario_inicio < fim AND horario_fim > inicio`.

| Ponto | Onde | Quando | Efeito |
|---|---|---|---|
| Envio | `HorarioDisponivel` em `StoreReservaRequest` e `UpdateReservaRequest` | No POST/PUT | Rejeita com 422. Verifica todas as datas geradas pela expansão da recorrência (`ExpansaoHorariosService::datasExpandidasParaSlot()`), respeitando seleções explícitas por semana. Com `edit_scope === 'single'`, checa só os slots da semana de `edited_week_date`. |
| Envio | `DataDoHorarioNoPeriodo` em `StoreReservaRequest` e `UpdateReservaRequest` | No POST/PUT | Rejeita com 422 a data de um horário fora de `data_inicial`–`data_final`. Na edição, só com `edit_scope === 'recurring'`. |
| Processamento | `ProcessarCriacaoReserva` e `UpdateReservaJob`, sob lock | Na fila | Revalida antes de gravar; o conflito faz o job falhar e o solicitante é notificado. Ver [fluxo de reservas](./fluxo-de-reservas.md). |
| Avaliação | `AvaliarReservaJob`, via `ConflictDetectionService::findConflictsFor()` | Quando o gestor avalia | O horário em conflito com um `deferida` é marcado `indeferida` automaticamente. |
| Tela de avaliação e snapshot | `ReservaService` (prop `todosOsConflitos`) e `ValidateReservationConflictsJob` | Ao abrir a avaliação; depois de criar, editar, avaliar ou cancelar | O gestor vê os conflitos no `ConflictAlertBox`, que é só informativo; o snapshot fica em `conflict_cache` ([cache de conflitos](./cache-de-conflitos.md)). |

### Horários em análise (#107)

Horários `em_analise` não bloqueiam o envio (`HorarioDisponivel`) e não contam como conflito (`ConflictDetectionService` só considera `deferida`). Por isso é possível enviar uma solicitação para um intervalo que já tem outra pendente; o gestor decide na avaliação. Mostrar essas solicitações pendentes é o item #107 do [backlog](../backlog.md).

Ao implementar, use um serviço à parte. Ampliar o `ConflictDetectionService` para `em_analise` faria o `AvaliarReservaJob` indeferir automaticamente horários que só concorrem com pedidos ainda não avaliados.

---

## Resumo de Regras por Contexto

### Criação/Edição de Reserva

| Validação | Nível | Bloqueante |
|-----------|-------|-----------|
| `HorariosMesmoEspaco` | Backend (Rule) | ✅ Sim |
| `HorarioDisponivel` (deferida) | Backend (Rule) | ✅ Sim |
| `DataDoHorarioNoPeriodo` (Store sempre; Update só `recurring`) | Backend (Rule) | ✅ Sim |
| Conflitos na tela de avaliação | Backend (`ConflictDetectionService`), exibido ao gestor | ⚠️ Informativo |
| Conflito na avaliação | Backend (`AvaliarReservaJob`) | ✅ Sim (indefere o horário) |
| Solicitações em análise | Não implementado (#107) | — |

### Atribuição de Gestores

| Validação | Nível | Bloqueante |
|-----------|-------|-----------|
| `UsuarioDaMesmaInstituicaoDaAgenda` | Backend (Rule) | ✅ Sim |
| Permissão `espacos.alterar-gestores` | Backend (Policy) | ✅ Sim |

### Cadastro de Andares

| Validação | Nível | Bloqueante |
|-----------|-------|-----------|
| Andares repetidos no payload (`StoreModuloRequest`) | Backend (FormRequest) | ✅ Sim |
| Andar existente reenviado na edição (`ModuloService::update()`, `updateOrCreate` por módulo) | Backend (Service) | ✅ Sim (atualiza, não duplica) |
| Constraint DB (unique index em `andars`) | Não existe (só a PK) | — Risco residual de corrida entre requisições simultâneas |

