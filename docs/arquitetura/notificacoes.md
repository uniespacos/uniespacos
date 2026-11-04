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
    return $this->payload();
}
```

Insere linha em `notifications` table com json serializado.

#### `toBroadcast()` — Notificação de WebSocket (Reverb)

```php
public function toBroadcast(object $notifiable): BroadcastMessage
{
    return new BroadcastMessage($this->payload());
}
```

Transmite ao canal `App.Models.User.{id}` em tempo real.

#### `payload()` — Conteúdo persistido e transmitido

`payload()` monta o mesmo array para `toArray()` (database) e `toBroadcast()` (WebSocket):

```php
[
    'titulo' => $this->titulo,
    'descricao' => $this->descricao,
    'url' => $this->url,
    ...$this->identificadores(),
    ...$this->traducaoNoFront(),
]
```

`identificadores()` é o gancho que cada notificação sobrescreve para expor IDs (ex.: `reserva_id`, `solicitante_id`, `cancelador_id`). **Regra LGPD (T-24):** `descricao` e os identificadores **não** podem conter nome de pessoa. O nome é lido ao vivo pelo e-mail (`toMail()`), que não é persistido. Texto livre da própria reserva (título) continua permitido nesta etapa; dados de terceiros, não.

`traducaoNoFront()` é o segundo gancho: as notificações que têm texto traduzido no front expõem `chave` e `parametros` (ver "Internacionalização" abaixo). Notificações sem o gancho não gravam esses campos.

#### Internacionalização (i18n) das notificações

**Back (`titulo` e `descricao`):** são gerados com `__()` usando chave em inglês (`lang/pt.json`, `lang/pt_BR.json`, `lang/es.json`; `en` exibe a própria chave). O idioma é o locale em vigor no momento em que a notificação é construída: em request, o da sessão (`HandleLocale`); em job sem sessão (ex.: `ProcessarCriacaoReserva`), o locale padrão do worker (`APP_LOCALE`, hoje `pt`).

**Front (`chave` + `parametros`):** para as notificações da T-24, o payload também grava:

- `chave` — identificador estável que o front mapeia para as chaves tipadas do dicionário (`reservas.nova_solicitacao` → `reservas.notificacoes.nova_solicitacao.{titulo,descricao}`; `reservas.cancelada` → `reservas.notificacoes.cancelada.{titulo,descricao}`).
- `parametros` — valores interpolados no texto (`{ titulo_reserva }`). Nunca contêm nome de pessoa.

`resources/js/lib/utils/notificacao-texto.ts` (`resolverTextoNotificacao`) renderiza o texto no idioma de quem lê, com `t()`. Se `chave` não for conhecida ou não existir (notificações antigas), o front cai em `titulo` e `descricao` gravados. O mesmo vale para o item que chega por broadcast, em `NotificationDropdown`.

**Limitação de idioma no `AvaliarReservaJob`:** o job roda na fila, sem sessão. O locale é capturado em `app()->getLocale()` no construtor (executado na request do gestor) e usado em `__('Conflict with another approved reservation at this time.', [], $this->locale)` no `handle()`, sem alterar o locale global do worker. Consequência: o texto de justificativa de conflito persistido em `horarios.justificativa` fica no idioma de quem avaliou; não é retraduzido na leitura. Não há coluna para guardar chave e parâmetros e não criamos migration para isso. Registros já gravados com o texto antigo em português permanecem como estão.

#### `toMail()` — Notificação de Email

Implementado individualmente em cada notificação. Usa template customizado em `resources/views/emails/`.

---

## Notificações Implementadas

### 1. NewReservationNotification

**Namespace:** `App\Notifications\NewReservationNotification`

**Disparada por:** `ProcessarCriacaoReserva::handle()`

**Destinatário:** Todos os gestores da reserva, EXCETO o solicitante

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: __('New Reservation Request')  → "Nova Solicitação de Reserva" (pt)
Descrição: __('A new reservation request for ":titulo_reserva" was submitted.', ['titulo_reserva' => $reserva->titulo])
URL: route('gestor.reservas.show', $reserva->id)
Identificadores (notifications.data): reserva_id, solicitante_id
Tradução no front: chave 'reservas.nova_solicitacao', parametros { titulo_reserva }
```

Sem nome do solicitante em `notifications.data` (T-24). O e-mail (`emails.reservations.new_reservation`) continua mostrando o nome, lido ao vivo.

**Supressão de Email:** Não aplicável (nunca enviada para o solicitante — é loop exclusivamente para gestores)

**Template:** `emails.reservations.new_reservation`

---

### 2. ReservationCreatedNotification

**Namespace:** `App\Notifications\ReservationCreatedNotification`

**Disparada por:** `ProcessarCriacaoReserva::handle()`

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

**Disparada por:** `AvaliarReservaJob::handle()`

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

**Disparada por:** `ReservaService::cancel()`

**Destinatário:** Todos os gestores de agendas envolvidas na reserva

**Canais:** `database`, `broadcast`, `mail`

**Payload:**

```
Título: __('Reservation Canceled')  → "Reserva Cancelada" (pt)
Descrição: __('The reservation ":titulo_reserva" was canceled.', ['titulo_reserva' => $reserva->titulo])
URL: route('gestor.reservas.index')
Identificadores (notifications.data): reserva_id, cancelador_id
Tradução no front: chave 'reservas.cancelada', parametros { titulo_reserva }

Propriedades extras:
- $canceler: User (quem cancelou; usado só para o e-mail e para o `cancelador_id`)
```

Sem nome de quem cancelou em `notifications.data` (T-24). O e-mail (`emails.reservations.reservation_canceled`) continua mostrando o nome, lido ao vivo.

**Supressão de Email:** Não aplicável (cancellamento sempre é ação administrativa)

**Template:** `emails.reservations.reservation_canceled`

---

### 5. ReservationUpdatedNotification

**Namespace:** `App\Notifications\ReservationUpdatedNotification`

**Disparada por:** `UpdateReservaJob::handle()`

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

**Disparada por:** `ProcessarCriacaoReserva::failed()`

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

**Disparada por:** `UpdateReservaJob::failed()`

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

- `EspacoService::updateGestores()`: ao designar um novo gestor para um turno do espaço, quando ele ainda não tem `reservas.avaliar`
- `UserService::updatePermissions()`: quando o papel informado é `gestor`

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

- `EspacoService::updateGestores()`: ao trocar o gestor de um turno, quando o usuário anterior não gerencia mais nenhuma agenda
- `UserService::updatePermissions()`: quando o papel informado não é `gestor` (o usuário perde as agendas que gerenciava)

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

**Disparada por:** `SetorService::update()`

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
    "url": "...",
    "reserva_id": 42,
    "solicitante_id": 7
  },
  "read_at": null,
  "created_at": "2026-08-22T10:30:00Z"
}
```

`data` contém `titulo`, `descricao` e `url`, mais os identificadores que a notificação expõe (`reserva_id`, `solicitante_id`, `cancelador_id`). Nas notificações da T-24 também entram `chave` e `parametros` (ex.: `"chave": "reservas.nova_solicitacao", "parametros": {"titulo_reserva": "Auditório"}`). Nenhum campo grava nome de pessoa (T-24).

**Características:**

- Criação é síncrona (não enfileirada como os outros)
- Registra histórico completo (permite auditoria)
- Usuário visualiza no painel ("Notificações")
- Marca como lida quando clicada
- Lidas: saem 90 dias depois do `read_at`, pela rotina `retencao:aplicar` (variável `RETENCAO_NOTIFICACOES_LIDAS_DIAS`, provisória até a T-12)
- Não lidas: ficam, sem prazo de expiração

**Registros anteriores ao T-24:** linhas gravadas antes desta mudança ainda trazem o nome do solicitante ou de quem cancelou dentro de `descricao` (ex.: `"...foi enviada por '<nome>'."`). Não há migration que reescreva esses dados, e não há regra especial para elas: seguem a regra geral de retenção. As lidas saem 90 dias depois de `read_at`; as não lidas ficam. Logo, uma notificação anterior à T-24 que continue não lida pode manter o nome do terceiro enquanto não for lida. O front exibe `descricao` como está gravada, pois essas linhas não têm `chave` e caem no fallback em `titulo`/`descricao`.

**Quem Consulta:**

- Frontend: componente de bell icon no navbar
- Usuário visualiza na aba "Notificações" do painel

---

### 2. Canal `broadcast`

**Mecanismo:** WebSocket via Laravel Reverb

**Configuração:**
```php
// BaseNotification::toBroadcast()
return new BroadcastMessage(CamposPublicosNotificacao::dadosPublicos($this->payload()));
```

O broadcast leva só os campos da lista branca `CamposPublicosNotificacao::DADOS` (`titulo`, `mensagem`, `descricao`, `chave`, `parametros`, `reserva_id`, `url`, `tipo`). Identificadores internos como `solicitante_id` e `cancelador_id` **não saem** no broadcast. O Laravel acrescenta `id` (da notificação) e `type` (a classe) ao payload.

**Broadcast × banco:** o que vai pelo WebSocket é um subconjunto do que é gravado em `notifications.data`. O método `toArray()` não mudou: a linha gravada continua com todos os identificadores (`reserva_id`, `solicitante_id`, `cancelador_id`), para uso interno (auditoria e rastreio). A tela recebe só o subconjunto público.

Vale para as 10 Notifications que herdam `BaseNotification`. `VerifyEmailQueued` e `ResetPasswordQueued` são só e-mail, sem canal `broadcast`.

**Deploy:** a classe da notificação é executada pelo queue worker. Após mudar uma Notification, reinicie o worker (`docker restart uniespacos-queue-worker-1` em desenvolvimento; em staging e produção, reinicie o serviço do worker depois do deploy). Sem isso, o broadcast segue com o código antigo.

**Canal de transmissão:** `App.Models.User.{id}` (privado; nome vindo de `User::receivesBroadcastNotificationsOn()`)

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
5. Se falhar, nova tentativa automática: até `$tries = 5` tentativas, com intervalos de 30, 60, 120 e 300 segundos (`BaseNotification::backoff()`)

**Quando é Suprimido:**

- Reserva auto-aprovada (`ReservationCreatedNotification`)
- Solicitante é o único gestor
- Resultado: email não é enfileirado

---

### Rodapé comum dos e-mails (LGPD)

**Arquivo:** `resources/views/emails/layout.blade.php`

Todos os templates de e-mail do sistema estendem `emails.layout` (`@extends('emails.layout')`), então o rodapé aparece em todos eles. Ele traz:

- Link para a Política de Privacidade, `url('/privacidade')`, com o rótulo `__('Privacy Policy')`. **Condicional:** só aparece com `config('privacidade.pagina_habilitada')` ligada (`PRIVACY_PAGE_ENABLED=true`, padrão `false`).
- Linha de contato provisório da Procuradoria Jurídica: `__('Questions about your personal data? Contact the UESB Legal Department (provisional channel):')`, seguida de `projur@uesb.edu.br`. **Fixo:** aparece sempre, com a flag ligada ou desligada.

Com a flag desligada, `/privacidade` responde 404 e o rodapé traz só o contato da Projur (ver [página de privacidade](../privacidade/pagina-de-privacidade.md#comportamento-com-a-flag)). As duas chaves de rodapé estão em `lang/` e são cobertas por `LangJsonChavesTest`. Teste do layout: `EmailLayoutPrivacidadeTest`, com os dois casos da flag.

---

## Prop compartilhada e badge

**Prop `notifications`** (`HandleInertiaRequests::share()`): as 15 notificações mais recentes do usuário logado. A relação `notifications()` do Laravel já ordena por `latest()`, então a ordem é por data de criação, da mais nova para a mais antiga.

Cada item sai em formato enxuto, filtrado pela lista branca de `App\Support\CamposPublicosNotificacao` (fonte única dos campos públicos, usada pela prop e pelo broadcast). `HandleInertiaRequests::formatNotification()` monta o item com `REGISTRO` (campos do registro) e `dadosPublicos()` sobre `data`, que filtra por `DADOS`. O formato da prop não muda com a fonte única.

| Campo | Sai na prop? | Observação |
| --- | --- | --- |
| `id`, `type`, `read_at`, `created_at` (`REGISTRO`) | sim | Campos do próprio registro. |
| `data.titulo`, `data.descricao`, `data.chave`, `data.parametros`, `data.reserva_id`, `data.url` | sim | Usados pelo painel. Chave ausente é omitida. |
| `data.mensagem`, `data.tipo` | sim | Mantidos para as notificações gravadas antes do formato atual. |
| `notifiable_type`, `notifiable_id`, `updated_at` | não | Não são usados pelo painel. |
| IDs internos em `data` (ex.: `solicitante_id`, `cancelador_id`) | não | Continuam gravados no banco; só saem da prop e do broadcast. |

Para o front receber um campo novo, ele precisa entrar em `CamposPublicosNotificacao::DADOS` (ou `REGISTRO`). Não há passagem automática do modelo. Como `DADOS` também filtra o broadcast, um campo novo ali passa a sair pelo WebSocket; `REGISTRO` não entra no broadcast (o Laravel já acrescenta `id` e `type`).

**Contagem de não lidas:** `auth.user.unread_notifications_count` é o total real de não lidas do usuário, calculado no servidor (`formatAuthUser()`). Não depende da lista de 15 itens. O tipo `User` do front usa esse campo (o antigo `unread_notifications` foi removido).

**Badge do `NotificationDropdown`:**

- Começa com `unread_notifications_count`. Se a prop faltar, conta as não lidas da própria lista.
- Soma 1 a cada notificação recebida em tempo real, pelo canal privado `App.Models.User.{id}`.
- Zera em "Marcar todas como lidas", depois que o POST para `notifications.markAsRead` tem sucesso.
- Ressincroniza com as props a cada navegação Inertia.
- Acima de 9, mostra `9+`.

**Rotas de notificações:** só existe `POST /notifications/mark-as-read` (`notifications.markAsRead`, em `NotificationController::markAsRead`). Não há rota JSON de listagem: a lista do painel vem da prop `notifications` do Inertia, e a contagem, de `auth.user.unread_notifications_count`. A antiga rota `GET /notifications` foi removida por não ter consumidor no front.

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

## Ordem nos Jobs: Notificação Antes do Broadcast

Em todo job ou service que altera reserva, as notificações (banco, e-mail e canal `broadcast` do Laravel) saem **antes** da publicação em tempo real. A publicação é feita por `ReservaBroadcaster::publicar()` e despacha o `ReservaEvent`, que é o evento de tela, não uma notificação. Detalhes em [tempo-real.md](./tempo-real.md#ponto-único-de-publicação-reservabroadcaster).

| Conceito | Classe | Canal | Papel |
|----------|--------|-------|-------|
| Notificação do usuário | `BaseNotification` (`database`, `broadcast`, `mail`) | `App.Models.User.{id}` | Aviso ao usuário |
| Evento de reserva | `ReservaEvent` (`ShouldBroadcastNow`) | `reserva-channel`, `App.Models.Espaco.{id}` | Atualização de tela |

**Regra:** o broadcast de reserva nunca substitui nem pula a notificação. Se `publicar()` falhar, a notificação já foi enfileirada e o job segue. A falha vira `Log::warning` (ver [erros-e-logs.md](./erros-e-logs.md#broadcast-em-tempo-real-falha-tolerada)).

| Job / service | Ordem depois do commit |
|---------------|------------------------|
| `ProcessarCriacaoReserva` | `NewReservationNotification` (gestores) → dispatch de `ValidateReservationConflictsJob` → `ReservationCreatedNotification` (solicitante) → `publicar('created')` |
| `UpdateReservaJob` | `ReservationUpdatedNotification` (solicitante) → dispatch de `ValidateReservationConflictsJob` → `publicar('updated')` |
| `AvaliarReservaJob` | Revalidação de conflitos → `ReservationEvaluatedNotification` (solicitante) → `publicar('evaluated')` |
| `ValidateReservationConflictsJob` | Grava `conflict_cache` e `completed` → `publicar('validated')` (sem notificação) |
| `ReservaService::notificarCancelamento()` | `ReservationCanceledNotification` (gestores) → revalidação de conflitos → `publicar('canceled')` |

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
│     ├─ broadcast: transmitir via Reverb ao canal App.Models.User.{gestor_id}
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

Se o envio falha depois de enfileirado, o worker tenta de novo até `$tries` (5 tentativas), com backoff de 30, 60, 120 e 300 segundos.

Se `notify()` lança exceção de forma síncrona (ex.: serialização), o try-catch do job captura, registra log e não há nova tentativa.

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
