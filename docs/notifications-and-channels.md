# Sistema de Notificações e Canais de Entrega

## Visão Geral

O sistema de notificações do UniEspaços implementa entrega assíncrona em múltiplos canais (banco de dados, WebSocket via Reverb, e email SMTP), com supressão inteligente de email para reservas auto-aprovadas.

**Princípios:**

- **Assíncrono:** Todas as notificações implementam `ShouldQueue` — o envio não bloqueia a request
- **Resiliente:** Disparos envolvem `try-catch` obrigatório em jobs para isolar falhas de email da lógica central
- **Inteligente:** Email é automaticamente suprimido para gestor auto-aprovador (evita redundância)

## BaseNotification: Classe Abstrata Raiz

**Namespace:** `App\Notifications\BaseNotification`

Toda notificação estende `BaseNotification`, que implementa `ShouldQueue` e padroniza a entrega.

### Construtor e Propriedades

```php
public function __construct(string $titulo, string $descricao, string $url)
```

Cada notificação recebe três atributos:

- `$titulo` — Título exibido no painel e email
- `$descricao` — Descrição curta do evento
- `$url` — Link para ação (rota interna convertida para `app.url`)

### Implementação de ShouldQueue

```php
abstract class BaseNotification extends Notification implements ShouldQueue
{
    use Queueable;
    // ...
}
```

Isso garante que:

1. Notificações são enfileiradas (Redis, Database, ou conforme `.env`)
2. Envio é assíncrono — não prende a response
3. Falhas de reentrega são tratadas pelo fila
4. Ordem de entrega não é garantida (use database para histórico)

### Método `via()`: Supressão de Email para Auto-Aprovação

```php
public function via(object $notifiable): array
{
    $channels = ['database', 'broadcast'];

    if (property_exists($this, 'reserva') && $this->reserva instanceof Reserva) {
        $isApplicant = $this->reserva->user_id === $notifiable->id;

        $managerIds = Agenda::whereIn(
            'id',
            Horario::where('reserva_id', $this->reserva->id)->select('agenda_id')
        )->pluck('user_id')->unique();

        $isSoleManager = $managerIds->count() === 1 && $managerIds->first() === $notifiable->id;

        if ($isApplicant && $isSoleManager) {
            return $channels;  // Sem 'mail'
        }
    }

    $channels[] = 'mail';
    return $channels;
}
```

**Lógica:**

1. Inicializa com `['database', 'broadcast']`
2. Se a notificação possui propriedade `reserva`:
   - Verifica se o destinatário é o solicitante da reserva
   - Verifica se é o ÚNICO gestor de TODAS as agendas incluídas
   - Se ambas condições forem verdadeiras, **retorna apenas database + broadcast** (email suprimido)
3. Caso contrário, adiciona `'mail'` à lista

**Quando email é suprimido:**

- Notificação é `ReservationCreatedNotification` (ou similar com reserva)
- Destinatário é o próprio solicitante
- Solicitante é o único gestor das agendas

**Resultado:** Gestor que auto-aprova sua reserva recebe apenas database e broadcast — sem email redundante.

### Métodos de Formatação

#### `toArray()` — Notificação de Database

```php
public function toArray(object $notifiable): array
{
    return [
        'titulo' => $this->titulo,
        'descricao' => $this->descricao,
        'url' => $this->url,
    ];
}
```

Insere linha em `notifications` table com json serializado.

#### `toBroadcast()` — Notificação de WebSocket (Reverb)

```php
public function toBroadcast(object $notifiable): BroadcastMessage
{
    return new BroadcastMessage([
        'titulo' => $this->titulo,
        'descricao' => $this->descricao,
        'url' => $this->url,
    ]);
}
```

Transmite ao canal `App.User.{id}` em tempo real.

#### `toMail()` — Notificação de Email

Implementado individualmente em cada notificação. Usa template customizado em `resources/views/emails/`.

---

## Notificações Implementadas

### 1. NewReservationNotification

**Namespace:** `App\Notifications\NewReservationNotification`

**Disparada por:** `ProcessarCriacaoReserva::handle()` (linhas 121–129)

**Destinatário:** Todos os gestores da reserva, EXCETO o solicitante

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: "Nova Solicitação de Reserva"
Descrição: "Uma nova solicitação de reserva para '{$reserva->titulo}' foi criada por '{$reserva->user->name}'."
URL: route('gestor.reservas.show', $reserva->id)
```

**Supressão de Email:** Não aplicável (nunca enviada para o solicitante — é loop exclusivamente para gestores)

**Template:** `emails.reservations.new_reservation`

---

### 2. ReservationCreatedNotification

**Namespace:** `App\Notifications\ReservationCreatedNotification`

**Disparada por:** `ProcessarCriacaoReserva::handle()` (linhas 137–144)

**Destinatário:** O solicitante da reserva

**Canais:** `database`, `broadcast`, **`mail` (suprimido se auto-aprovado)**

**Payload:**

```
Título: "Sua reserva foi criada!"
Descrição: "Sua solicitação de reserva para '{$reserva->titulo}' foi processada com sucesso."
URL: route('reservas.show', $reserva->id)
```

**Supressão de Email:** **SIM**

Se o solicitante é o único gestor de todas as agendas:
- Email é suprimido (resultado de auto-aprovação)
- Database e broadcast continuam normalmente
- Usuário vê a notificação no painel e em tempo real, sem email redundante

**Scenario:**

```
Job: ProcessarCriacaoReserva
├─ Cria Reserva (situacao='deferida' se auto-aprovada)
├─ Cria Horarios (todos 'deferida' se gestor único)
├─ Notifica gestores das agendas NÃO-solicitantes (NewReservationNotification)
│  └─ Canais: database, broadcast, mail
└─ Notifica solicitante (ReservationCreatedNotification)
   └─ Canais: database, broadcast, mail (ou apenas database+broadcast se auto-aprovado)
```

**Template:** `emails.reservations.reservation_created`

---

### 3. ReservationEvaluatedNotification

**Namespace:** `App\Notifications\ReservationEvaluatedNotification`

**Disparada por:** `AvaliarReservaJob::handle()` (linhas 157–168)

**Destinatário:** O solicitante da reserva

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: "Reserva Avaliada"
Descrição: "Sua reserva para '{$reserva->titulo}' foi {$statusAvaliacao}."
URL: route('reservas.show', $reserva->id)

Propriedades extras:
- $statusAvaliacao: string (ex: "aprovada", "reprovada")
- $evaluator: User (gestor que avaliou)
```

**Supressão de Email:** Não aplicável (avaliação é sempre por terceiro, nunca auto)

**Template:** `emails.reservations.reservation_evaluated`

---

### 4. ReservationCanceledNotification

**Namespace:** `App\Notifications\ReservationCanceledNotification`

**Disparada por:** `ReservaService::cancelar()` (linhas 228–233)

**Destinatário:** Todos os gestores de agendas envolvidas na reserva

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: "Reserva Cancelada"
Descrição: "O usuário {$canceler->name} cancelou a reserva '{$reserva->titulo}'."
URL: route('gestor.reservas.index')

Propriedades extras:
- $canceler: User (quem cancelou)
```

**Supressão de Email:** Não aplicável (cancellamento sempre é ação administrativa)

**Template:** `emails.reservations.reservation_canceled`

---

### 5. ReservationUpdatedNotification

**Namespace:** `App\Notifications\ReservationUpdatedNotification`

**Disparada por:** `UpdateReservaJob::handle()` (linhas 140–147)

**Destinatário:** O solicitante da reserva (user que pediu atualização)

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: "Reserva Atualizada"
Descrição: "Sua reserva '{$reserva->titulo}' foi atualizada com sucesso."
URL: route('reservas.show', $reserva->id)
```

**Supressão de Email:** Não aplicável

**Template:** `emails.reservations.reservation_updated`

---

### 6. ReservationFailedNotification

**Namespace:** `App\Notifications\ReservationFailedNotification`

**Disparada por:** `ProcessarCriacaoReserva::failed()` (linhas 162–166)

**Destinatário:** O solicitante (quando job exaure 3 tentativas)

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: "Falha na sua solicitação de reserva"
Descrição: "Houve um erro ao processar sua solicitação para '{$reservationTitle}'. Por favor, tente novamente ou contate o suporte."
URL: route('reservas.index')

Propriedades extras:
- $reservationTitle: string (título da reserva)
- $user: User
```

**Supressão de Email:** Não aplicável (erro sempre deve ser notificado)

**Template:** `emails.reservations.reservation_failed`

---

### 7. ReservationUpdateFailedNotification

**Namespace:** `App\Notifications\ReservationUpdateFailedNotification`

**Disparada por:** `UpdateReservaJob::failed()` (linhas 180–187)

**Destinatário:** O usuário que tentou atualizar (quando job exaure)

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: "Falha ao Atualizar Reserva"
Descrição: "Ocorreu um erro ao processar a atualização da sua reserva '{$reserva->titulo}'. Por favor, tente novamente."
URL: route('reservas.edit', $reserva->id)

Propriedades extras:
- $reserva: Reserva
- $user: User
```

**Supressão de Email:** Não aplicável

**Template:** `emails.reservations.reservation_failed` (reutiliza)

---

### 8. UserAssignedAsManagerNotification

**Namespace:** `App\Notifications\UserAssignedAsManagerNotification`

**Disparada por:**

- `EspacoService::updateEspacoAndAgendas()` (linhas 276–280 e 318–320)
- `UserService::attachOrDetachAgendas()` (linhas 152–158)

**Destinatário:** Usuário recém-designado como gestor

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: "Gestão de Espaços"
Descrição: Variável conforme contexto:
  - Genérica: "Você foi designado como gestor de agenda."
  - Específica: "Você foi designado como gestor do espaço: {$espacoNome} Turno: {$turno}."
URL: route('espacos.index') ou route('espacos.show', $espaco->id)

Propriedades extras:
- $manager: User
- $espacoNome: string|null
- $turno: string|null
```

**Supressão de Email:** Não aplicável

**Template:** `emails.users.user_assigned_as_manager`

---

### 9. UserRemovedAsManagerNotification

**Namespace:** `App\Notifications\UserRemovedAsManagerNotification`

**Disparada por:**

- `EspacoService::updateEspacoAndAgendas()` (linhas 326–328)
- `UserService::attachOrDetachAgendas()` (linhas 163–168)

**Destinatário:** Usuário removido de gestão

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: "Gestão de Espaços"
Descrição: Variável conforme contexto:
  - Genérica: "Você foi removido como gestor de agenda."
  - Específica: "Você foi removido como gestor do espaço: {$espacoNome} Turno: {$turno}."
URL: route('espacos.index')

Propriedades extras:
- $user: User
- $espacoNome: string|null
- $turno: string|null
```

**Supressão de Email:** Não aplicável

**Template:** `emails.users.user_removed_as_manager`

---

### 10. SectorUpdatedNotification

**Namespace:** `App\Notifications\SectorUpdatedNotification`

**Disparada por:** `SetorService::update()` (linhas 49–50)

**Destinatário:** Todos os usuários associados ao setor

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: "Setor Atualizado"
Descrição: "O setor {$setor->nome} foi atualizado."
URL: route('institucional.setors.show', $setor->id)

Propriedades extras:
- $setor: Setor
- $user: User
```

**Supressão de Email:** Não aplicável

**Template:** `emails.users.sector_updated`

---

## Canais de Entrega

### 1. Canal `database`

**Mecanismo:** Insere linha em tabela `notifications` do Laravel

**Conteúdo:**
```json
{
  "id": "...",
  "notifiable_id": 123,
  "notifiable_type": "App\\Models\\User",
  "type": "App\\Notifications\\ReservationCreatedNotification",
  "data": {
    "titulo": "Sua reserva foi criada!",
    "descricao": "...",
    "url": "..."
  },
  "read_at": null,
  "created_at": "2026-08-22T10:30:00Z"
}
```

**Características:**

- Criação é síncrona (não enfileirada como os outros)
- Registra histórico completo (permite auditoria)
- Usuário visualiza no painel ("Notificações")
- Marca como lida quando clicada
- Persiste indefinidamente (não expira)

**Quem Consulta:**

- Frontend: componente de bell icon no navbar
- Usuário visualiza na aba "Notificações" do painel

---

### 2. Canal `broadcast`

**Mecanismo:** WebSocket via Laravel Reverb

**Configuração:**
```php
// BaseNotification::toBroadcast()
return new BroadcastMessage([
    'titulo' => $this->titulo,
    'descricao' => $this->descricao,
    'url' => $this->url,
]);
```

**Canal de transmissão:** `App.User.{user_id}` (privado)

**Características:**

- Entrega em tempo real
- Exige conexão WebSocket ativa
- Não persiste (perdida se offline)
- Apenas conectados recebem
- Imediata (não enfileirada)

**Quem Consulta:**

- React components com listener WebSocket
- Toast notifications (aviso rápido em tempo real)

**Configuração em `.env`:**
```
REVERB_SCHEME=http              # Interno Docker
REVERB_APP_ID=...               # Laravel Reverb
REVERB_APP_KEY=...
REVERB_HOST=reverb              # Host interno
REVERB_PORT=8080
```

---

### 3. Canal `mail`

**Mecanismo:** Fila SMTP (Laravel Mailer)

**Configuração:**
```
MAIL_DRIVER=smtp
MAIL_HOST=mailhog              # Dev
MAIL_PORT=1025
MAIL_USERNAME=...
MAIL_PASSWORD=...
```

**Características:**

- Assíncrono (enfileirado)
- Respeita tentativas (retry)
- Suprimível via lógica em `via()`
- Template HTML em `resources/views/emails/`
- Subject customizado por notificação

**Quando é Enviado:**

1. Notificação é instanciada
2. `via()` é chamado — verifica supressão
3. Se `'mail'` está no array, Laravel enfileira
4. Job de email retira da fila e envia via SMTP
5. Se falhar, retry automático (até 3x por padrão)

**Quando é Suprimido:**

- Reserva auto-aprovada (`ReservationCreatedNotification`)
- Solicitante é o único gestor
- Resultado: email não é enfileirado

---

## Padrão Try-Catch Obrigatório

Toda chamada a `.notify()` em jobs e services **deve estar envolvida em try-catch**.

**Razão:** Falha de provedor de email (SMTP timeout, falha de autenticação, etc.) não deve derrubar a lógica central do job.

### Exemplo: ProcessarCriacaoReserva

```php
foreach ($gestoresUnicos as $gestor) {
    if ($gestor->id !== $this->solicitante->id) {
        try {
            $gestor->notify(new NewReservationNotification($reserva));
        } catch (Exception $e) {
            Log::warning('Falha ao notificar gestor sobre nova reserva', [
                'gestor_id' => $gestor->id,
                'reserva_id' => $reserva->id,
                'exception' => $e,
            ]);
        }
    }
}
```

**Fluxo:**

1. `$gestor->notify()` é chamado
2. Notificação é enfileirada (não dispara email imediatamente)
3. Se `notify()` falhar (ex: serialização), exception é capturada
4. Log avisa do erro — mas criação de reserva continua
5. Job completa com sucesso

### Exemplo: UpdateReservaJob::failed()

```php
public function failed(Throwable $exception): void
{
    Log::error('UpdateReservaJob exhausted all retries', [...]);

    try {
        $this->user->notify(new ReservationUpdateFailedNotification(...));
    } catch (Exception $e) {
        Log::error('Failed to send reservation update failure notification', [...]);
    }
}
```

Mesmo em `failed()`, o try-catch protege para que a falha de notificação não esconda a falha original do job.

---

## Fluxo Completo de Uma Notificação

### Cenário: Criação de Reserva

```
Request HTTP: POST /api/reservas
│
├─ Controller: StoreReservaRequest (valida dados)
│
├─ Dispara Job: ProcessarCriacaoReserva::dispatch($dados, $solicitante)
│  └─ Job é enfileirado (Redis/Database)
│
└─ Response: 202 Accepted (não aguarda job)

[Fila Processa Job]

ProcessarCriacaoReserva::handle()
│
├─ DB Transaction
│  ├─ Cria Reserva
│  │  └─ situacao='deferida' ou 'em_analise' conforme gestor único?
│  │
│  └─ Cria Horarios
│     └─ Cada situacao='deferida' ou 'em_analise' conforme gestor único?
│
├─ try { $gestor->notify(NewReservationNotification) }
│  ├─ Notificação é enfileirada em queue
│  │  └─ Laravel carrega em Job de queue/notifications
│  │
│  └─ via() retorna ['database', 'broadcast', 'mail']
│     │
│     ├─ database: inserir em tabela `notifications`
│     ├─ broadcast: transmitir via Reverb ao canal App.User.{gestor_id}
│     └─ mail: enfileirar envio SMTP
│
├─ try { $solicitante->notify(ReservationCreatedNotification) }
│  ├─ Notificação é enfileirada
│  │
│  └─ via() verifica:
│     ├─ $isApplicant = true (solicitante é proprietário)
│     ├─ $isSoleManager = ? (é único gestor?)
│     │
│     └─ if (true && true):
│        └─ return ['database', 'broadcast']  # Email suprimido
│           │
│           ├─ database: inserir em tabela
│           ├─ broadcast: transmitir ao solicitante em tempo real
│           └─ mail: NÃO ENFILEIRADO
│
├─ Dispara Job: ValidateReservationConflictsJob
│
└─ Completa com sucesso

[Fila Processa Notificações]

Laravel Mailer (para cada notificação com 'mail')
│
├─ Carrega template Blade em `resources/views/emails/`
├─ Renderiza HTML
├─ Envia via SMTP
└─ Se falhar: retry (até limite)

[Usuários Recebem]

Gestor:
├─ Email SMTP chega (se não suprimido)
├─ Dashboard mostra notificação de database
└─ Toast em tempo real via WebSocket (broadcast)

Solicitante (auto-aprovação):
├─ Email: NÃO RECEBE (suprimido)
├─ Dashboard mostra notificação de database
└─ Toast em tempo real via WebSocket (broadcast)
```

---

## Implicações de ShouldQueue

### 1. Notificação Enfileirada, Não Imediata

```php
// ERRADO — tenta enviar imediatamente
$user->notifyNow(new ReservationCreatedNotification($reserva));

// CERTO — enfileira
$user->notify(new ReservationCreatedNotification($reserva));
```

### 2. Request Retorna Rápido

```php
ProcessarCriacaoReserva::dispatch($dados, $user);  # Enfileira job
return response()->json(['id' => $reserva->id]);   # Response imediata
# Notificações são enviadas depois, em background
```

### 3. Ordem Não é Garantida

Se 5 jobs de notificação são enfileirados, podem chegar em ordem diferente:

```
Job 1: NewReservationNotification (gestor A) ─┐
Job 2: NewReservationNotification (gestor B) ─┼─ Fila
Job 3: ReservationCreatedNotification      ──┤
Job 4: ValidateReservationConflictsJob     ──┤
                                             │
Execução pode ser: 4 → 2 → 1 → 3 ← ordem diferente
```

Para histório confiável, use a notificação de `database` — sempre persiste.

### 4. Retry Automático em Falha

Se `notify()` falhar (ex: serialização):

```
Tentativa 1: Falha (exception capturada, logged)
Tentativa 2: Falha
Tentativa 3: Falha
Resultado: Notificação nunca é enviada, mas log regista tentativas
```

---

## Supressão de Email — Implementação Detalhada

### Quando Email é Suprimido

**Condição:** Notificação com propriedade `reserva` + solicitante é único gestor

**Verificação em `BaseNotification::via()`:**

```php
if (property_exists($this, 'reserva') && $this->reserva instanceof Reserva) {
    $isApplicant = $this->reserva->user_id === $notifiable->id;  // Solicitante?

    $managerIds = Agenda::whereIn(
        'id',
        Horario::where('reserva_id', $this->reserva->id)->select('agenda_id')
    )->pluck('user_id')->unique();  # Todos os gestores das agendas

    $isSoleManager = $managerIds->count() === 1 && 
                     $managerIds->first() === $notifiable->id;  # Um só, é ele?

    if ($isApplicant && $isSoleManager) {
        return ['database', 'broadcast'];  # Sem 'mail'
    }
}
```

### Notificações Afetadas

Apenas aquelas que herdam a propriedade `$reserva`:

1. ✓ `ReservationCreatedNotification` — suprimida se auto-aprovada
2. ✓ `ReservationEvaluatedNotification` — suprimida? Verificar (avaliador é sempre terceiro)
3. ✗ `NewReservationNotification` — nunca enviada ao solicitante (só gestores)
4. ✗ `ReservationCanceledNotification` — sempre para gestores, não solicitante
5. ✗ `UserAssignedAsManagerNotification` — sem propriedade `reserva`
6. ✗ `SectorUpdatedNotification` — sem propriedade `reserva`

### Resultado da Supressão

| Canal | Suprimido | Motivo |
|-------|-----------|--------|
| `database` | NÃO | Sempre persiste, consulta no painel |
| `broadcast` | NÃO | Entrega em tempo real, sem custó email |
| `mail` | **SIM** | Redundante — gestor já sabe que auto-aprovou |

**Efeito para Usuário:**

- Vê notificação no painel (database)
- Recebe toast em tempo real (broadcast/WebSocket)
- Não recebe email

**Por Quê?**

Se o solicitante é o único gestor, ele já sabe que a reserva foi aprovada automaticamente — não precisa de email confirmando.

---

## Exemplo de Implementação: Notificação Customizada

```php
<?php

namespace App\Notifications;

use App\Models\Reserva;
use Illuminate\Notifications\Messages\MailMessage;

class CustomReservationNotification extends BaseNotification
{
    public Reserva $reserva;

    public function __construct(Reserva $reserva)
    {
        parent::__construct(
            'Título da Notificação',
            'Descrição breve',
            route('reservas.show', $reserva->id)
        );
        $this->reserva = $reserva;  # Obrigatório para supressão funcionar
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Seu Assunto Aqui')
            ->view('emails.custom', ['reserva' => $this->reserva, 'url' => $this->url]);
    }
}
```

**Checklist:**

1. ✓ Estende `BaseNotification`
2. ✓ Define propriedade `$reserva` (se quiser supressão)
3. ✓ Chama `parent::__construct()` com 3 argumentos
4. ✓ Implementa `toMail()` com template customizado
5. ✓ Disparo envolvido em `try-catch` no job/service

---

## Testes e Validação

### Cenário 1: Auto-Aprovação (Sem Email)

```php
// Teste: ReservationCreatedNotification::toMail() não deve ser chamado
$this->assertTrue($reserva->situacao === 'deferida');
$this->assertTrue($reserva->user_id === $manager->id);

// Disparar notificação
$notif = new ReservationCreatedNotification($reserva);
$channels = $notif->via($manager);

$this->assertFalse(in_array('mail', $channels));  # Email suprimido
$this->assertContains('database', $channels);
$this->assertContains('broadcast', $channels);
```

### Cenário 2: Notificação Normal (Com Email)

```php
// Teste: Gestor diferente sempre recebe email
$otherManager = User::factory()->create();
$notif = new ReservationCreatedNotification($reserva);
$channels = $notif->via($otherManager);

$this->assertContains('mail', $channels);
$this->assertContains('database', $channels);
$this->assertContains('broadcast', $channels);
```

### Cenário 3: Try-Catch Protege Job

```php
// Teste: Job completa mesmo se notify() falha
$job = new ProcessarCriacaoReserva($dados, $user);

Mail::shouldReceive('send')->andThrow(new Exception('SMTP Down'));

$job->handle($service);  # Não lança exception

$this->assertTrue($reserva->exists());  # Reserva foi criada
```

---

## Notas de Precaução

### 1. Não Misturar Síncrono e Assíncrono

```php
// ERRADO — tenta usar resultado antes de enfileirado
$user->notify(new ReservationCreatedNotification($reserva));
$lastNotification = Notification::latest()->first();  # null ou anterior

// CERTO — guardar log ou ID imediatamente
$this->solicitante->notify(new ReservationCreatedNotification($reserva));
# Notificação será inserida depois, consulte via database quando precisar
```

### 2. Serialização em Queue

Propriedades de notificação são serializadas para a fila. **Evitar:**

```php
// ERRADO — closure não serializa
public Notifier extends BaseNotification {
    public $callback = fn() => doSomething();
}

// CERTO — armazenar dados primitivos
public $reserva;  # Eloquent models serizam automaticamente
```

### 3. Email é Suprimido, Não Deletado

Se a supressão for removida depois, o método `toMail()` será chamado. Garantir que sempre existe template correspondente.

### 4. Monitorar Fila de Notificações

```bash
# Ver jobs enfileirados
docker exec uniespacos-workspace-1 php artisan queue:work

# Ver falhas
docker exec uniespacos-workspace-1 php artisan queue:failed
```

---

## Referências

- Código: `app/Notifications/BaseNotification.php`
- Jobs: `app/Jobs/ProcessarCriacaoReserva.php`, `UpdateReservaJob.php`, `AvaliarReservaJob.php`
- Services: `app/Services/EspacoService.php`, `UserService.php`, `ReservaService.php`, `SetorService.php`
- Config: `config/queue.php`, `config/mail.php`
