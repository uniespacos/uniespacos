# Auto-Aprovação de Reserva

## Invariante

Quando um solicitante é o **único gestor de TODAS as agendas** incluídas em sua reserva, a reserva nasce automaticamente com `situacao='deferida'` (aprovada).

**Lógica subjacente:** Quem gerencia uma agenda pode sempre usá-la — não faz sentido colocar em análise uma reserva feita por seu próprio gestor.

**Resultado:** Os horários da reserva nascem já deferidos, pulando o fluxo de avaliação.

## Localização no Código

A regra de auto-aprovação foi extraída de lógica duplicada em dois jobs e consolidada em um serviço único:

**Arquivo Principal:** `app/Services/AutoAprovacaoService.php`

A classe encapsula duas responsabilidades distintas em dois métodos públicos:

### Métodos do Serviço

#### 1. `resolverSituacaoHorario(Agenda $agenda, int $proprietarioReservaId): string`

```php
/**
 * Resolve a situacao inicial de um horario individual.
 *
 * Regra: se o dono da agenda (gestor) e o proprietario da reserva, o horario
 * ja nasce deferido — o proprietario automaticamente tem permissao para usar
 * seus proprios espacos. Caso contrario, fica em_analise aguardando avaliacao
 * do gestor.
 *
 * @param  Agenda  $agenda  Agenda na qual o horario esta sendo solicitado.
 * @param  int  $proprietarioReservaId  ID do user que criou/edita a reserva (solicitante ou dono).
 * @return string Valor de SituacaoReservaEnum (deferida ou em_analise).
 */
public function resolverSituacaoHorario(Agenda $agenda, int $proprietarioReservaId): string
{
    return $agenda->user_id === $proprietarioReservaId
        ? SituacaoReservaEnum::DEFERIDA->value
        : SituacaoReservaEnum::EM_ANALISE->value;
}
```

**Decisão no nível individual:** Se o user que está criando/editando a reserva é o gestor daquela agenda, o horário nasce `deferida`. Caso contrário, `em_analise`.

#### 2. `calcularSituacaoReserva(Collection $gestoresUnicos, int $solicitanteId): ?string`

```php
/**
 * Calcula a situacao agregada da reserva baseado nos gestores unicos envolvidos.
 *
 * Regra: se ha apenas 1 gestor E esse gestor e o solicitante, a reserva toda
 * e automaticamente deferida (o proprietario administra todos os espacos).
 * Se ha multiplos gestores MAS o solicitante e um deles, a reserva e
 * parcialmente_deferida (alguns horarios sua, alguns depende de outros gestores).
 *
 * Retorna null quando nenhuma condicao se aplica — a reserva permanece com a
 * situacao que ja tinha (tipicamente em_analise setada na criacao).
 *
 * @param  Collection<int, User>  $gestoresUnicos  Users que gerenciam as agendas usadas.
 * @param  int  $solicitanteId  ID do usuario que fez a solicitacao.
 * @return ?string Nova situacao se aplicavel, ou null para preservar a situacao existente.
 */
public function calcularSituacaoReserva(Collection $gestoresUnicos, int $solicitanteId): ?string
{
    if ($gestoresUnicos->count() === 1 && $gestoresUnicos->first()->id === $solicitanteId) {
        return SituacaoReservaEnum::DEFERIDA->value;
    }

    if ($gestoresUnicos->contains(fn ($g) => $g->id === $solicitanteId)) {
        return SituacaoReservaEnum::PARCIALMENTE_DEFERIDA->value;
    }

    return null;
}
```

**Decisão no nível agregado:** Após processar todos os horários, calcula se a reserva INTEIRA pode ser deferida, parcialmente deferida, ou permanece em análise. Retorna `null` para preservar a situação existente quando nenhuma condição aplica.

---

### Uso em Criação de Reserva

**Arquivo:** `app/Jobs/ProcessarCriacaoReserva.php` (linhas 93–107)

**Nível de Horário (linha 93):**
```php
$autoAprovacao = app(AutoAprovacaoService::class);
// ...
[$linhas, $agendasUsadas] = $expansao->montar(
    $slots,
    $agendasMap,
    $recorrencia,
    $dataFinal,
    $reserva->id,
    fn (Agenda $agenda) => $autoAprovacao->resolverSituacaoHorario($agenda, $this->solicitante->id)
);
```

Cada horário recebe `situacao='deferida'` se o solicitante é o gestor daquela agenda, ou `'em_analise'` caso contrário.

**Nível de Reserva (linhas 104–107):**
```php
// Agenda sem gestor atribuido nao entra na conta.
$gestoresUnicos = $agendasUsadas->map(fn (Agenda $a) => $a->user)->filter()->unique('id')->values();
$novaSituacao = $autoAprovacao->calcularSituacaoReserva($gestoresUnicos, $this->solicitante->id);

if ($novaSituacao !== null) {
    $reserva->update(['situacao' => $novaSituacao]);
}
```

Após a criação dos horários, a `Reserva` tem sua `situacao` atualizada conforme:
- **Deferida:** Um único gestor (de TODAS as agendas) e é o solicitante.
- **Parcialmente deferida:** O solicitante é gestor de ALGUMAS agendas (mas não todas).
- **Em análise:** Nenhuma condição aplica — a reserva permanece com a situação que já tinha.

---

### Uso em Edição de Reserva (Escopo `recurring`)

**Arquivo:** `app/Jobs/UpdateReservaJob.php` (linha 131)

```php
$autoAprovacao = app(AutoAprovacaoService::class);
// ...
[$linhas, $agendasUsadas] = $expansao->montar(
    $slots,
    $agendasMap,
    $recorrencia,
    $dataFinal,
    $this->reserva->id,
    fn (Agenda $agenda) => $autoAprovacao->resolverSituacaoHorario($agenda, $this->reserva->user_id)
);
```

**Diferença crítica em relação à criação:**

Em uma edição (escopo `recurring`), o proprietário de referência é o **dono da reserva** (`$this->reserva->user_id`), **não** quem está editando (`$this->user->id`). Isso é intencional: um gestor editando a reserva de outra pessoa não pode auto-deferir por acidente.

**Comportamento de agregação na edição:**

`UpdateReservaJob` **NÃO recalcula** `calcularSituacaoReserva()` — não existe, e nunca existiu, recálculo da situação AGREGADA da reserva dentro deste job. Após uma edição (escopo `recurring`), a coluna `reservas.situacao` permanece com o valor que tinha antes da edição.

**Nota:** O recálculo agregado da situação de uma reserva acontece em outro mecanismo completamente diferente: `AvaliarReservaJob::updateReservaOverallStatus()`, chamado quando um gestor avalia horários. Esse mecanismo está documentado em `docs/models-business-rules.md` (seção "Regras de Negócio — Cascata de Situação") e não é afetado por esta fase.

## Condição Requerida: "TODAS" as Agendas

A auto-aprovação exige que:

1. `count($gestoresUnicos) === 1` — há apenas um gestor diferente entre todas as agendas reservadas.
2. Esse gestor é `$this->solicitante` — o gestor único é quem fez a requisição.

Se a reserva inclui múltiplas agendas e o solicitante não é gestor de todas, a reserva fica `parcialmente_deferida` (se gestor de algumas) ou `em_analise` (se gestor de nenhuma).

## Implicação para Edição

A função `ReservaService::resolveDataAncora()` busca o **primeiro horário em ordem de data**:

```php
public function resolveDataAncora(Reserva $reserva): string
{
    $firstSlot = $reserva->horarios()->orderBy('data', 'asc')->first();
    return Carbon::parse($firstSlot ? $firstSlot->data : $reserva->data_inicial)->format('Y-m-d');
}
```

**Por que não filtrar por `situacao='em_analise'`?**

Em uma reserva auto-aprovada, **todos os horários nascem `deferida`** — não há nenhum em `em_analise`. Se buscasse apenas horários em análise, retornaria `null` e falharia na validação de `data_inicial` editável.

**Solução:** Buscar o primeiro horário (independente da `situacao`), mesmo que seja futuro ou deferido. Isso garante um ponto de referência válido para edição.

## Implicação para Notificações

Uma reserva auto-aprovada dispara `ReservationCreatedNotification` normalmente, mas o método `via()` de `BaseNotification` suprime o canal `mail`:

```php
// BaseNotification::via()
if ($isApplicant && $isSoleManager) {
    return ['database', 'broadcast'];  // Sem mail
}
// Caso contrário:
return ['database', 'broadcast', 'mail'];
```

**Comportamento:**

- **Email:** Não é enviado
- **Notificação de banco de dados:** Enviada
- **Broadcast (WebSocket):** Enviado

**Razão:** Não faz sentido enviar notificação por email dizendo "sua reserva foi aprovada" quando você mesmo (o gestor) é quem a aprovou implicitamente.

## Cenários de Uso

### Cenário 1: Gestor de Sala Única
- Usuário é gestor da Sala A
- Cria reserva apenas na Sala A
- **Resultado:** `reserva.situacao = 'deferida'`, `horarios[].situacao = 'deferida'`
- **Notificação:** Nenhum email enviado

### Cenário 2: Gestor de Múltiplas Salas
- Usuário é gestor da Sala A e Sala B
- Cria reserva em Sala A + Sala B
- **Resultado:** `reserva.situacao = 'deferida'`, todos `horarios[].situacao = 'deferida'`
- **Notificação:** Nenhum email enviado

### Cenário 3: Gestor Parcial
- Usuário é gestor da Sala A (mas não de B)
- Cria reserva em Sala A + Sala B
- **Resultado:** `reserva.situacao = 'parcialmente_deferida'`, `horarios` em Sala A = `'deferida'`, em Sala B = `'em_analise'`
- **Notificação:** Email enviado (gestor de B precisa avaliar)

### Cenário 4: Usuário Comum
- Usuário não é gestor de nenhuma sala
- Cria reserva em qualquer sala
- **Resultado:** `reserva.situacao = 'em_analise'`, todos `horarios[].situacao = 'em_analise'`
- **Notificação:** Email enviado para todos os gestores

## Notas de Precaução

### Loop Infinito de Notificação

Esta regra previne que:
- Um gestor receba email "sua reserva foi aprovada" quando ele mesmo é o único gestor
- A validação de e-mail fique redundante (auto-aprovação não precisa de "confirmação" por email)

### Invariante de Manutenção

Se a lógica de aprovação for modificada no futuro:

1. Manter a simetria entre `Horario.situacao` (nível individual) e `Reserva.situacao` (nível agregado)
2. Garantir que `BaseNotification::via()` continua verificando `isSoleManager` antes de suprimir email
3. Validar que `resolveDataAncora()` encontra o primeiro horário mesmo em reservas 100% deferidas

### Testes Esperados

- ✓ Auto-aprovação nunca dispara email redundante
- ✓ `resolveDataAncora()` retorna data válida mesmo com todos os horários deferidos
- ✓ `parcialmente_deferida` dispara email para gestores não-aprovadores
- ✓ Gestor como solicitante recebe apenas notificação de banco de dados (broadcast, sem mail)
