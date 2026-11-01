# Auto-Aprovação de Reserva

## Invariante

Quando um solicitante é o **único gestor de TODAS as agendas** incluídas em sua reserva, a reserva nasce automaticamente com `situacao='deferida'` (aprovada).

**Lógica subjacente:** Quem gerencia uma agenda pode sempre usá-la — não faz sentido colocar em análise uma reserva feita por seu próprio gestor.

**Resultado:** Os horários da reserva nascem já deferidos, pulando o fluxo de avaliação.

## Localização no Código

**Arquivo principal:** `app/Services/AutoAprovacaoService.php`

A classe concentra a regra em três métodos públicos. Os jobs que criam e editam reservas chamam esses métodos; não repetem a lógica.

### Métodos do Serviço

#### 1. `resolverSituacaoHorario(Agenda $agenda, int $proprietarioReservaId): string`

```php
public function resolverSituacaoHorario(Agenda $agenda, int $proprietarioReservaId): string
{
    return $agenda->user_id === $proprietarioReservaId
        ? SituacaoReservaEnum::DEFERIDA->value
        : SituacaoReservaEnum::EM_ANALISE->value;
}
```

**Decisão no nível individual:** Se o user que está criando/editando a reserva é o gestor daquela agenda, o horário nasce `deferida`. Caso contrário, `em_analise`.

#### 2. `resolverSituacaoEAvaliador(Agenda $agenda, int $proprietarioReservaId): array`

Deriva a situação de `resolverSituacaoHorario()` e define também o avaliador do horário. É esse método que os jobs passam ao `ExpansaoHorariosService::montar()`.

```php
public function resolverSituacaoEAvaliador(Agenda $agenda, int $proprietarioReservaId): array
{
    $situacao = $this->resolverSituacaoHorario($agenda, $proprietarioReservaId);

    return [
        'situacao' => $situacao,
        'user_id' => $situacao === SituacaoReservaEnum::DEFERIDA->value
            ? $agenda->user_id
            : null,
    ];
}
```

**Avaliador registrado:** Quando o horário é auto-aprovado, `horarios.user_id` recebe o gestor da agenda, ou seja, o avaliador fica registrado. Em `em_analise`, `user_id` fica nulo.

#### 3. `calcularSituacaoReserva(Collection $gestoresUnicos, int $solicitanteId): ?string`

```php
public function calcularSituacaoReserva(Collection $gestoresUnicos, int $solicitanteId): ?string
{
    if ($gestoresUnicos->count() === 1) {
        $gestor = $gestoresUnicos->first();
        if ($gestor && $gestor->id === $solicitanteId) {
            return SituacaoReservaEnum::DEFERIDA->value;
        }
    }

    if ($gestoresUnicos->contains(fn ($g) => $g->id === $solicitanteId)) {
        return SituacaoReservaEnum::PARCIALMENTE_DEFERIDA->value;
    }

    return null;
}
```

**Decisão no nível agregado:** Após processar os horários, calcula se a reserva inteira pode ser deferida, parcialmente deferida ou permanece em análise. Retorna `null` para preservar a situação existente quando nenhuma condição se aplica. A checagem `$gestor &&` é uma guarda de nulo: com `count() === 1`, `first()` nunca é nulo, mas a guarda deixa o tipo explícito para o analisador estático.

---

### Uso em Criação de Reserva

**Arquivo:** `app/Jobs/ProcessarCriacaoReserva.php`, método `handle()`.

**Nível de horário.** Dentro da transação, depois de criar a `Reserva` com `situacao='em_analise'`, o job chama `ExpansaoHorariosService::montar()` com o callback `resolverSituacaoEAvaliador()`. Cada linha de `horarios` recebe `situacao` e `user_id`.

**Nível de reserva.** Ainda dentro da transação, depois do insert dos horários:

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

**Arquivo:** `app/Jobs/UpdateReservaJob.php`, método `handle()`, ramo de expansão (`recurring`).

```php
[$linhas, $agendasUsadas] = $expansao->montar(
    $slots,
    $agendasMap,
    $recorrencia,
    $dataFinal,
    $this->reserva->id,
    fn (Agenda $agenda) => $autoAprovacao->resolverSituacaoEAvaliador($agenda, $this->reserva->user_id)
);
```

**Diferença crítica em relação à criação:**

Em uma edição, o proprietário de referência é o **dono da reserva** (`$this->reserva->user_id`), **não** quem está editando (`$this->user->id`). Isso é intencional: um gestor editando a reserva de outra pessoa não pode auto-deferir por acidente.

**Comportamento de agregação na edição:**

`UpdateReservaJob` **não** chama `calcularSituacaoReserva()`. Após uma edição (escopo `recurring`), a coluna `reservas.situacao` permanece com o valor que tinha antes da edição.

**Nota:** O recálculo agregado da situação de uma reserva acontece em outro mecanismo: `AvaliarReservaJob::updateReservaOverallStatus()`, chamado quando um gestor avalia horários. Esse mecanismo está documentado em [modelos Eloquent](../arquitetura/modelos-eloquent.md#regras-de-negócio--cascata-de-situação), seção "Regras de Negócio — Cascata de Situação".

---

### Uso em Edição de Reserva (Escopo `single`)

**Arquivo:** `app/Jobs/UpdateReservaJob.php`, método `handle()`, ramo `single`.

O ramo `single` apaga os horários removidos da semana editada e cria os horários novos. Para cada horário novo (sem `id` no payload):

```php
$agenda = $agendasMapSingle->get($agendaId);
if ($agenda !== null) {
    $resultado = $autoAprovacao->resolverSituacaoEAvaliador($agenda, (int) $this->reserva->user_id);
    $novoHorario['situacao'] = $resultado['situacao'];
    $novoHorario['user_id'] = $resultado['user_id'];
} else {
    $novoHorario['situacao'] = SituacaoReservaEnum::EM_ANALISE->value;
    $novoHorario['user_id'] = null;
}

$this->reserva->horarios()->create($novoHorario);
```

**Mesma semântica do `recurring`:** o proprietário de referência é o **dono da reserva** (`$this->reserva->user_id`), nunca quem edita. A regra só se aplica a horários **novos**; horários existentes não são regravados.

**Histórico:** Até a PR #432, o ramo `single` não chamava `AutoAprovacaoService`, e horários novos nasciam sempre `em_analise`. A PR #432 replicou a regra do `recurring`. O `else` (agenda ausente do mapa) é um fallback defensivo: `UpdateReservaRequest` exige `exists:agendas,id` para os `horarios_solicitados.*.agenda_id`.

---

## Condição Requerida: "TODAS" as Agendas

A auto-aprovação exige que:

1. `count($gestoresUnicos) === 1` — há apenas um gestor diferente entre todas as agendas reservadas.
2. Esse gestor é `$this->solicitante` — o gestor único é quem fez a requisição.

Se a reserva inclui múltiplas agendas e o solicitante não é gestor de todas, a reserva fica `parcialmente_deferida` (se gestor de algumas) ou `em_analise` (se gestor de nenhuma).

## Implicação para Edição

A função `ReservaService::resolveDataAncora()` busca o **primeiro horário em ordem de data**, independentemente da situação, e usa `data_inicial` da reserva apenas quando não há horário:

```php
public function resolveDataAncora(Reserva $reserva): string
{
    $firstSlot = $reserva->horarios()->orderBy('data', 'asc')->first();

    return Carbon::parse($firstSlot ? $firstSlot->data : $reserva->data_inicial)->format('Y-m-d');
}
```

**Por que não filtrar por `situacao='em_analise'`?**

Em uma reserva auto-aprovada, **todos os horários nascem `deferida`** — não há nenhum em `em_analise`. Se buscasse apenas horários em análise, não encontraria nenhum e cairia no fallback, sem um ponto de referência de horário real.

**Solução:** Buscar o primeiro horário (independente da `situacao`), mesmo que seja futuro ou deferido.

## Implicação para Notificações

Uma reserva auto-aprovada dispara `ReservationCreatedNotification` normalmente, mas `BaseNotification::via()` suprime o canal `mail` para o solicitante que é o único gestor:

```php
// BaseNotification::via()
$isApplicant = $this->reserva->user_id === $notifiable->id;
$isSoleManager = $managerIds->count() === 1 && $managerIds->first() === $notifiable->id;

if ($isApplicant && $isSoleManager) {
    return ['database', 'broadcast'];  // Sem mail
}

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
4. Manter `resolverSituacaoEAvaliador()` como única fonte do par `situacao` + `user_id` nos três ramos de escrita de horários (criação, `recurring` e `single`)

### Testes Esperados

- ✓ Auto-aprovação nunca dispara email redundante
- ✓ `resolveDataAncora()` retorna data válida mesmo com todos os horários deferidos
- ✓ `parcialmente_deferida` dispara email para gestores não-aprovadores
- ✓ Gestor como solicitante recebe apenas notificação de banco de dados (broadcast, sem mail)
- ✓ Horário novo adicionado em edição de escopo `single`, numa agenda administrada pelo dono da reserva, nasce `deferida` (`UpdateReservaJobTest::test_single_scope_novo_horario_do_proprio_gestor_nasce_deferido`)
