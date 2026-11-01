# Enums e Constantes do UniEspaços

Este documento descreve todos os enums e constantes de domínio do UniEspaços, seus valores, significado e transições de estado.

## Sumário

- [SituacaoReservaEnum — Estados de Avaliação](#situacaoreservaenum--estados-de-avaliação)
- [ModoArquivoEnum — Filtro de Ativas/Arquivadas](#modoarquivoenum--filtro-de-ativasarquivadas)
- [OrdenacaoReservaEnum — Critérios de Ordenação](#ordenacaoreservaenum--critérios-de-ordenação)
- [AgendaEnum — Turnos de Gestão](#agendaenum--turnos-de-gestão)
- [CampusEnum — Campi da Universidade](#campusenum--campi-da-universidade)
- [DiasSemanaEnum — Dias da Semana](#diassemanadaenum--dias-da-semana)
- [RecorrenciaReservaEnum — Tipos de Recorrência](#recorrenciareservaenum--tipos-de-recorrência)
- [FormatoRelatorioEnum — Formatos de Exportação](#formatorelatoriouenum--formatos-de-exportação)
- [TipoRelatorioEnum — Tipos de Relatório](#tiporelatorioenum--tipos-de-relatório)
- [ErrorCode — Códigos de Erro HTTP](#errorcode--códigos-de-erro-http)
- [Tabela de Transições de Situação](#tabela-de-transições-de-situação)

---

## SituacaoReservaEnum — Estados de Avaliação

**Localização:** `app/Enums/SituacaoReserva/SituacaoReservaEnum.php`

**Tipo de dado:** string (enum)

Representa o estado agregado de uma reserva, refletindo o resultado da avaliação de seus horários pelo gestor.

### Valores Possíveis

| Valor | Label | Significado |
|-------|-------|-----------|
| `em_analise` | Em Análise | Reserva submetida, aguardando avaliação de pelo menos um horário. É o estado inicial. Não bloqueia novas submissões ou criação de novos horários. |
| `deferida` | Deferida | Todos os horários foram aprovados. Espaço está reservado para todas as datas/turnos solicitados. |
| `indeferida` | Indeferida | Todos os horários foram rejeitados (nenhum foi aprovado). Reserva não obtém nenhum espaço. |
| `parcialmente_deferida` | Parcialmente Deferida | Alguns horários foram aprovados e outros rejeitados. Espaço está reservado para alguns períodos. |
| `inativa` | Inativa | **Não é resultado de avaliação.** É um marcador de arquivamento/cancelamento lógico. Usado quando a reserva é cancelada (via `ReservaService::cancel()`). Nunca aparece como opção de avaliação. |

### Método Público: `valoresDeAvaliacao()`

Retorna apenas os valores que são **resultado de avaliação**, excluindo `inativa`:

```php
SituacaoReservaEnum::valoresDeAvaliacao()
// Retorna: ['em_analise', 'deferida', 'indeferida', 'parcialmente_deferida']
```

**Por quê:** `inativa` é um eixo separado (arquivamento), não um resultado de avaliação. Ver `ModoArquivoEnum`.

### Método Público: `labelDe(?string $valor)`

Converte um valor cru do banco em rótulo legível, sem quebrar se o valor for desconhecido:

```php
SituacaoReservaEnum::labelDe('em_analise')  // Retorna: 'Em Análise'
SituacaoReservaEnum::labelDe(null)          // Retorna: '—'
SituacaoReservaEnum::labelDe('desconhecido')// Retorna: 'desconhecido' (fallback)
```

### Regra de Agregação (Cascata)

A situação de uma `Reserva` é **calculada automaticamente** dos seus `Horario.situacao` via `AvaliarReservaJob::updateReservaOverallStatus()`:

```
Se a reserva está inativa:
  → Não recalcula (mantém inativa)

Se totalHorarios === 0:
  → situacao = 'indeferida'

Se TODOS os horários são 'deferida':
  → situacao = 'deferida'

Se TODOS os horários são 'indeferida':
  → situacao = 'indeferida'

Se algum horário está 'em_analise':
  → situacao = 'em_analise'

Caso contrário (mix de deferida + indeferida):
  → situacao = 'parcialmente_deferida'
```

### Relação com Horario

Cada `Horario` tem seu próprio estado (`Horario.situacao`):

| Valor | Descrição |
|-------|-----------|
| `solicitado` | Inicial, horário foi incluído na requisição. |
| `em_analise` | Gestor iniciou análise mas não finalizou. |
| `deferida` | Gestor aprovou; espaço está reservado para este slot. |
| `indeferida` | Gestor rejeitou (por conflito ou motivo customizado). |
| `inativa` | Cancelado (quando a reserva-mãe é arquivada). |

**Nota:** `solicitado` é apenas um estado interno de criação; após a expansão de horários, é convertido para `em_analise`.

---

## ModoArquivoEnum — Filtro de Ativas/Arquivadas

**Localização:** `app/Enums/SituacaoReserva/ModoArquivoEnum.php`

**Tipo de dado:** string (enum)

Eixo independente de filtro em listagens, separando reservas ativas de arquivadas. Introduzido na issue #108.

### Valores Possíveis

| Valor | Descrição |
|-------|-----------|
| `ativas` | Exclui reservas com `situacao = 'inativa'`. É o padrão. |
| `arquivadas` | Mostra apenas reservas com `situacao = 'inativa'`. |
| `todas` | Sem filtro de arquivo; mostra ativas e arquivadas. |

### Método Público: `fromFiltro(mixed $valor)`

Resolve o valor vindo da query string, caindo no default (`ATIVAS`) quando o valor não existe ou não é reconhecido.

```php
ModoArquivoEnum::fromFiltro('arquivadas') // Retorna: ModoArquivoEnum::ARQUIVADAS
ModoArquivoEnum::fromFiltro('xyz')        // Retorna: ModoArquivoEnum::ATIVAS (fallback)
ModoArquivoEnum::fromFiltro(null)         // Retorna: ModoArquivoEnum::ATIVAS (fallback)
```

**Por quê o fallback é seguro:** Um valor inválido na query string não deve devolver lista vazia ou erro; deve usar o comportamento padrão (ativas).

### Por Quê Separar de `SituacaoReservaEnum`?

Antes da #108, `inativa` era filtrado como parte de `situacao` no select de filtro. Isso criava contradição:

```
Usuário comum quer "mostrar arquivadas" E "filtrar por em_analise"
→ Query gerada: situacao != 'inativa' AND situacao = 'em_analise' AND situacao = 'inativa'
→ Resultado: lista vazia inexplicável
```

Agora:
- **`situacao`** = resultado de avaliação (`em_analise`, `deferida`, `indeferida`, `parcialmente_deferida`)
- **`arquivo`** = estado de arquivamento (`ativas`, `arquivadas`, `todas`)

Dois eixos independentes, sem conflito.

---

## OrdenacaoReservaEnum — Critérios de Ordenação

**Localização:** `app/Enums/SituacaoReserva/OrdenacaoReservaEnum.php`

**Tipo de dado:** string (enum)

Critério de ordenação em listagens de reserva.

### Valores Possíveis

| Valor | Comportamento |
|-------|---------------|
| `data_solicitacao` | Ordena por `created_at DESC` (mais recente primeiro). É o padrão histórico. |
| `situacao` | Ordena por prioridade fixa de situação + `created_at DESC` dentro de cada grupo. |

### Método Público: `fromFiltro(mixed $valor)`

Resolve o valor vindo da query string, caindo no default (`DATA_SOLICITACAO`) quando inválido.

```php
OrdenacaoReservaEnum::fromFiltro('situacao')         // Retorna: OrdenacaoReservaEnum::SITUACAO
OrdenacaoReservaEnum::fromFiltro('data_solicitacao') // Retorna: OrdenacaoReservaEnum::DATA_SOLICITACAO
OrdenacaoReservaEnum::fromFiltro('xyz')              // Retorna: OrdenacaoReservaEnum::DATA_SOLICITACAO (fallback)
```

### Prioridade de Situação (SITUACAO)

Quando ordenado por `SITUACAO`, a sequência é:

```
1. em_analise         (pendente de avaliação — urgente)
2. parcialmente_deferida (requer atenção — parcialmente aprovada)
3. indeferida         (rejeitada — visualizar motivo)
4. deferida           (aprovada — apenas referência)
5. inativa            (arquivada — fundo da lista)
```

Dentro de cada grupo, ordena por `created_at DESC`.

**Justificativa:** Mantém "o que precisa de atenção" no topo. Gestor não precisa descer a lista para ver pendências.

---

## AgendaEnum — Turnos de Gestão

**Localização:** `app/Enums/Agenda/AgendaEnum.php`

**Tipo de dado:** string (enum)

Turno de funcionamento de um espaço. Define quando o espaço é gerenciado/disponível.

### Valores Possíveis

| Valor | Significado |
|-------|-----------|
| `manha` | Turno matutino (tipicamente 08:00–12:00). |
| `tarde` | Turno vespertino (tipicamente 13:00–18:00). |
| `noite` | Turno noturno (tipicamente 19:00–22:00). |

### Uso

Cada `Agenda` representa um turno × espaço × gestor. Um espaço pode ter múltiplas agendas (uma por turno).

```php
// Exemplo: Auditório A tem 3 agendas
// - Auditório A + Manhã (gestor Maria)
// - Auditório A + Tarde (gestor João)
// - Auditório A + Noite (gestor Pedro)
```

**Nota:** O enum é semântico; não há validação automática de que `Horario.horario_inicio` respeite a faixa do turno. É responsabilidade da lógica de negócio.

---

## CampusEnum — Campi da Universidade

**Localização:** `app/Enums/Campus/CampusEnum.php`

**Tipo de dado:** string (enum)

Identifica o campus (unidade geográfica) da universidade.

### Valores Possíveis

| Valor | Campus |
|-------|--------|
| `jeq` | Campus Jequié |
| `vca` | Campus Vitória da Conquista |
| `ita` | Campus Itabuna |

### Uso

Tipicamente usado para agrupar espaços e agendas por localização geográfica, permitindo filtros e relatórios por campus.

---

## DiasSemanaEnum — Dias da Semana

**Localização:** `app/Enums/DiasSemana/DiasSemanaEnum.php`

**Tipo de dado:** string (enum)

Dias da semana, usados em recorrências e calendários.

### Valores Possíveis

| Valor | Dia |
|-------|-----|
| `seg` | Segunda-feira |
| `ter` | Terça-feira |
| `qua` | Quarta-feira |
| `qui` | Quinta-feira |
| `sex` | Sexta-feira |
| `sab` | Sábado |
| `dom` | Domingo |

### Uso

Usado para definir padrões de recorrência (ex: "toda segunda, quarta e sexta") e para exibições em calendários.

---

## RecorrenciaReservaEnum — Tipos de Recorrência

**Localização:** `app/Enums/Reserva/RecorrenciaReservaEnum.php`

**Tipo de dado:** string (enum)

Define como um padrão de horários (agenda + dia da semana + faixa horária) se expande no tempo. Cada tipo tem semântica e comportamento distintos de expansão e edição de `data_final`.

### Valores Possíveis

| Valor | Tipo | `data_final` definido por | Expansão | `data_final` editável | Exemplo |
|-------|------|--------------------------|----------|----------------------|---------|
| `unica` | Ocorrência Única | Sistema (= `data_inicial`) | Nenhuma | Não | Uma aula única em 15/set |
| `15dias` | Período Fixo (15 dias) | Sistema (= `data_inicial` + 15 dias) | Semanal até `data_final` | Não | Reuniões quinzenais por 2 meses |
| `1mes` | Período Fixo (1 mês) | Sistema (= `data_inicial` + 1 mês) | Semanal até `data_final` | Não | Workshops mensais por 1 mês |
| `personalizado` | Período Personalizado | **Usuário** | Semanal até `data_final` | **Sim** | Aulas em ter/qui por 3 meses (definidos pelo usuário) |

### Comportamento de Expansão

- **`unica`** → Gera exatamente N horários (um por slot selecionado), sem repetição.
- **`15dias`, `1mes`, `personalizado`** → Cada padrão (agenda + dia da semana + horário) se repete **semanalmente** até `data_final`.

### Por Que Consultar

Para entender como uma reserva com `recorrencia='personalizado'` gera múltiplos horários, ou para compreender a diferença entre os tipos de recorrência suportados, consulte **`docs/recorrencia-semantica.md`** (documentação completa com exemplos reais, reclassificação de falsos positivos e justificativa de design).

---

## FormatoRelatorioEnum — Formatos de Exportação

**Localização:** `app/Enums/Relatorio/FormatoRelatorioEnum.php`

**Tipo de dado:** string (enum)

Formato de exportação de relatórios.

### Valores Possíveis

| Valor | MIME Type | Descrição |
|-------|-----------|-----------|
| `pdf` | `application/pdf` | Documento PDF (formatado, pronto para impressão). |
| `csv` | `text/csv; charset=UTF-8` | Valores separados por vírgula (planilha). |
| `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Excel moderno (planilha formatada). |

### Método Público: `mimeType()`

Retorna o MIME type do formato:

```php
FormatoRelatorioEnum::PDF->mimeType()
// Retorna: 'application/pdf'
```

---

## TipoRelatorioEnum — Tipos de Relatório

**Localização:** `app/Enums/Relatorio/TipoRelatorioEnum.php`

**Tipo de dado:** string (enum)

Tipo de relatório disponível no sistema, cada um com título, permissão específica e acesso controlado.

### Valores Possíveis

| Valor | Título Completo | Título Curto | Permissão | Descrição |
|-------|-----------------|--------------|-----------|-----------|
| `reservas_periodo` | Relatório de Reservas por Período | Reservas por Período | `relatorios.reservas-periodo` | Lista todas as reservas dentro de um intervalo de datas, com status e detalhes. |
| `ocupacao_espacos` | Relatório de Ocupação de Espaços | Ocupação de Espaços | `relatorios.ocupacao-espacos` | Taxa de ocupação (aprovadas vs disponíveis) por espaço. |
| `inventario_espacos` | Inventário de Espaços | Inventário de Espaços | `relatorios.inventario-espacos` | Listagem de todos os espaços cadastrados com capacidade e descrição. |
| `indicadores_consolidados` | Indicadores Consolidados | Indicadores Consolidados | `relatorios.indicadores-consolidados` | KPIs agregadas (total de reservas, taxa de aprovação, espaço mais solicitado, etc.). |

### Métodos Públicos

#### `titulo(): string`

Retorna o título completo do relatório:

```php
TipoRelatorioEnum::RESERVAS_PERIODO->titulo()
// Retorna: 'Relatório de Reservas por Período'
```

#### `tituloCurto(): string`

Retorna o título sem prefixo, para uso dentro da interface (onde o contexto já está claro):

```php
TipoRelatorioEnum::RESERVAS_PERIODO->tituloCurto()
// Retorna: 'Reservas por Período'
```

#### `permissao(): string`

Retorna a permissão Spatie necessária para acessar este relatório:

```php
TipoRelatorioEnum::RESERVAS_PERIODO->permissao()
// Retorna: 'relatorios.reservas-periodo'
```

#### `static disponiveisPara(User $user): array`

Retorna apenas os tipos de relatório que o usuário tem permissão para acessar:

```php
$relatorios = TipoRelatorioEnum::disponiveisPara($user);
// Retorna array com apenas os relatórios que $user pode gerar
```

---

## ErrorCode — Códigos de Erro HTTP

**Localização:** `app/Enums/ErrorCode.php`

**Tipo de dado:** string (enum)

Códigos de erro estáveis expostos nas respostas JSON, permitindo que o cliente ramifique por um identificador imutável em vez de comparar mensagens de texto.

### Valores Possíveis

| Valor | Status HTTP | Significado |
|-------|-------------|-----------|
| `UNAUTHENTICATED` | 401 | Usuário não autenticado; token ausente ou inválido. |
| `FORBIDDEN` | 403 | Usuário autenticado mas sem permissão (falha de Policy/autorização). |
| `NOT_FOUND` | 404 | Recurso não encontrado. |
| `METHOD_NOT_ALLOWED` | 405 | Método HTTP não permitido neste endpoint. |
| `PAGE_EXPIRED` | 419 | Token CSRF expirado (apenas Inertia). |
| `VALIDATION_FAILED` | 422 | Validação dos dados de entrada falhou. |
| `TOO_MANY_REQUESTS` | 429 | Rate limit atingido (throttling). |
| `BAD_REQUEST` | 400 | Erro genérico de cliente (qualquer 4xx não mapeado). |
| `SERVER_ERROR` | 500 | Erro genérico do servidor (qualquer 5xx). |

### Método Público: `fromStatus(int $status)`

Converte um status HTTP em `ErrorCode`:

```php
ErrorCode::fromStatus(401)  // Retorna: ErrorCode::UNAUTHENTICATED
ErrorCode::fromStatus(422)  // Retorna: ErrorCode::VALIDATION_FAILED
ErrorCode::fromStatus(500)  // Retorna: ErrorCode::SERVER_ERROR
ErrorCode::fromStatus(400)  // Retorna: ErrorCode::BAD_REQUEST (fallback para 4xx desconhecido)
```

**Por quê usar status como fonte:** O status HTTP é o resultado final depois de todo o tratamento do Laravel. Várias exceções distintas convergem para o mesmo status, e é o status que o cliente HTTP vê.

---

## Tabela de Transições de Situação

Este diagrama mostra as transições **válidas** de `Reserva.situacao`, sem contar as causas (avaliação, cancelamento, auto-aprovação).

| De | Para | Gatilho | Quem Dispara | Notas |
|----|------|---------|--------------|-------|
| *(criação)* | `em_analise` | Reserva criada | `ProcessarCriacaoReserva` | Estado inicial padrão. |
| *(criação)* | `deferida` | Reserva criada com um único gestor (que é o solicitante) | `ProcessarCriacaoReserva` | Auto-aprovação: solicitante é gestor de todos os espaços. |
| *(criação)* | `parcialmente_deferida` | Reserva criada com múltiplos gestores, um é o solicitante | `ProcessarCriacaoReserva` | Auto-aprovação parcial: solicitante é gestor de alguns espaços. |
| `em_analise` | `deferida` | Todos os horários avaliados como `deferida` | `AvaliarReservaJob` | Agregação: `updateReservaOverallStatus()` detecta todos deferidos. |
| `em_analise` | `indeferida` | Todos os horários avaliados como `indeferida` | `AvaliarReservaJob` | Agregação: nenhum horário foi aprovado. |
| `em_analise` | `parcialmente_deferida` | Mix de horários `deferida` + `indeferida` | `AvaliarReservaJob` | Agregação: alguns aprovados, alguns rejeitados. |
| `deferida` | `parcialmente_deferida` | Gestor rejeita alguns horários previamente aprovados | `AvaliarReservaJob` | Reavaliar aprovados pode gerar parcial. |
| `deferida` | `indeferida` | Gestor rejeita todos os horários | `AvaliarReservaJob` | Reavaliar (todos aprovados → todos rejeitados). |
| `indeferida` | `em_analise` | Gestor reabre análise (marca alguns como em_analise) | `AvaliarReservaJob` | Reavaliar permite mudar de indeferida. |
| `indeferida` | `parcialmente_deferida` | Gestor aprova alguns horários | `AvaliarReservaJob` | Reavaliar: rejeição não é final. |
| `parcialmente_deferida` | `deferida` | Gestor aprova os horários que estavam indeferidos | `AvaliarReservaJob` | Reavaliar: pode completar a aprovação. |
| `parcialmente_deferida` | `indeferida` | Gestor rejeita os horários que estavam deferidos | `AvaliarReservaJob` | Reavaliar: pode revogar. |
| `parcialmente_deferida` | `em_analise` | Gestor reabre análise | `AvaliarReservaJob` | Reavaliar: pode voltar a estado intermediário. |
| `em_analise` | `inativa` | Cancelamento (via UI ou `ReservaService::cancel()`) | `ReservaService` | Marca como arquivada; não é resultado de avaliação. |
| `deferida` | `inativa` | Cancelamento | `ReservaService` | Marca como arquivada; não é resultado de avaliação. |
| `indeferida` | `inativa` | Cancelamento | `ReservaService` | Marca como arquivada; não é resultado de avaliação. |
| `parcialmente_deferida` | `inativa` | Cancelamento | `ReservaService` | Marca como arquivada; não é resultado de avaliação. |
| `inativa` | *(nenhuma)* | — | — | Estado final; não transiciona. Cancelar inativa novamente é no-op. |

### Notas Importantes

1. **Não existe transição de `inativa` para outro estado.** Arquivamento é irreversível (no código atual).

2. **`em_analise` é interruptível.** Horários neste estado não bloqueiam novas submissões ou criação de novos horários. Pode-se reavaliar (mudar de status) enquanto está em análise.

3. **Agregação é automática.** `Reserva.situacao` nunca é setado diretamente; é calculado por `updateReservaOverallStatus()` após cada avaliação de horários.

4. **Conflitos convertem em `indeferida`.** Se um horário tiver conflito com outro já `deferida`, é automaticamente marcado como `indeferida` (via `AvaliarReservaJob::handle()`), mesmo que o gestor tenha tentado aprovar.

5. **Replicação em escopo "all".** Quando o escopo de avaliação é "todos" (avaliar toda a recorrência), o status é replicado para todos os horários do mesmo dia da semana e faixa horária, exceto conflitantes.

---

## Constantes e Padrões de Negócio

Embora não sejam enums, estes padrões aparecem repetidamente no código:

### Horário de Criação Padrão: `solicitado`

Quando `ProcessarCriacaoReserva` cria horários via `ExpansaoHorariosService::montar()`, o status inicial é `solicitado`. Após a expansão, é convertido para `em_analise` ou `deferida` (se auto-aprovado).

### Permissão Padrão de Reavaliar

A permissão `reservas.avaliar` permite que um gestor reavaliar horários quantas vezes quiser. Não há limite de reavalições.

### Notificações de Avaliação

- Quando uma reserva é **criada**, gestores (exceto solicitante) recebem `NewReservationNotification`.
- Quando uma reserva é **avaliada**, o solicitante recebe `ReservationEvaluatedNotification`.
- Quando uma reserva é **cancelada**, gestores recebem `ReservationCanceledNotification`.

---

## Referências Cruzadas

- **Models:** Ver `docs/models-business-rules.md` para detalhes de `Reserva`, `Horario`, `Agenda`, etc.
- **Testing:** Veja `tests/` para exemplos de uso em testes.
- **Migrações:** Ver `database/migrations/` para esquemas de tabelas.
