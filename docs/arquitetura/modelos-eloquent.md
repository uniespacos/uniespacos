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
| `recorrencia` | string \| null | Padrão de recorrência (ver [recorrência](../regras-de-negocio/recorrencia.md)) |
| `observacao` | string \| null | Notas do gestor após avaliação |
| `user_id` | int | FK para solicitante |
| `validation_status` | string | `pending`, `completed`, etc. (estado do job de validação de conflitos) |
| `conflict_cache` | array (JSON) | Cache dos conflitos detectados |

**Nota sobre `conflict_cache`:** Este é um snapshot histórico gravado por `ValidateReservationConflictsJob` no momento do processamento, exposto na interface do gestor como informação secundária de auditoria — não é fonte de verdade. Veja [cache de conflitos](../regras-de-negocio/cache-de-conflitos.md) para contrato completo, incluso divergência esperada com conflitos recalculados ao vivo.

### Atributos Dinâmicos (Computados em Runtime)

- **`can_update`** — Boolean, definido por `ReservaService` via policy check. Indica se o usuário autenticado pode editar a reserva.
- **`existing_justification`** — String ou null, extraído de `ReservaService::getForGestorReview()` com a primeira justificativa não nula entre seus horários.
- **`situacao_formatada`** — Rótulo legível (ex: "Em Análise") via `getSituacaoFormatadaAttribute()`.
- **`resumo_horarios`** — Array de objetos com texto descritivo dos horários (resumido para ≤10 ou agrupado por agenda).

### Scopes

#### `scopeArquivo($query, $modo)`

Aplica o eixo de arquivamento (`ModoArquivoEnum`: `ativas`, padrão; `arquivadas`; `todas`). Valor inválido cai em `ativas`. Regra, motivo do design e exemplos em [arquivamento](../regras-de-negocio/arquivamento.md#os-modos-de-filtro-modoarquivoenum).

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

**Colunas do usuário nos repositórios (LGPD, [T-26](../backlog.md)):** `ReservaRepositoryEloquent` carrega o usuário com colunas explícitas nas listagens: `getPaginatedForUser()` e `getPaginatedForGestor()` usam `user:id,name`. `findWithWeekSlots()` usa `agenda.user:id,name,email,setor_id` para o gestor da agenda. `findWithWeekSlots()` e `findForGestorModal()` carregam `user` sem seleção de colunas, então trazem a linha completa do solicitante.

**Prop compartilhada do usuário autenticado:** `HandleInertiaRequests::formatAuthUser()` envia `auth.user` com `setor`, papéis, permissões e `unread_notifications_count` (contagem, não a lista). A prop `notifications` leva as 15 notificações mais recentes.

**Prop compartilhada da flag de privacidade:** `HandleInertiaRequests::share()` envia `privacidadeHabilitada` (booleano, a partir de `config('privacidade.pagina_habilitada')`, padrão `false`). O hook `usePrivacidadeHabilitada()` lê a prop com `=== true`. Ela controla os links para `/privacidade`; ver [página de privacidade](../privacidade/pagina-de-privacidade.md#comportamento-com-a-flag).

### Validações Customizadas

Veja `HorarioDisponivel` (app/Rules) — rejeita faixa que se sobrepõe a horário `deferida` na mesma agenda e data (`horario_inicio < fim AND horario_fim > inicio`). Ver [validação](../regras-de-negocio/validacao.md#horariodisponivel).

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

3. **Auto-aprovação via unicidade de gestor:** Quando uma reserva é **criada** e existe apenas **um** gestor para **todos** os espaços solicitados, a reserva é automaticamente deferida via `AutoAprovacaoService::calcularSituacaoReserva()`. Essa decisão é tomada **apenas no momento de criação**; edições subsequentes da reserva (escopo `recurring`) não recalculam a situação agregada. Ver [auto-aprovação](../regras-de-negocio/auto-aprovacao.md) para detalhes completos.

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

5. **Exclusão de conta é anonimização, não remoção da linha (T-25, decisão P-05):** a linha de `users` nunca é apagada. `ExclusaoDeContaService::anonimizar()` é o único caminho, usado pela autoexclusão (`ProfileController::destroy`) e pela exclusão pelo institucional (`UserService::anonimizar()`). A `User` não usa SoftDeletes; ver [arquivamento](../regras-de-negocio/arquivamento.md#exclusão-de-conta-não-usa-soft-delete).

   Na mesma `DB::transaction`:
   - remove as notificações do titular, os favoritos (`espaco_user`) e os papéis e permissões Spatie;
   - grava o nome como marcador `ExclusaoDeContaService::NOME_ANONIMIZADO` (`Usuário anonimizado`), o e-mail por `anonimizado-{id}@invalid`, zera `telefone` e `profile_pic` (string vazia, pois as colunas são NOT NULL), gera senha aleatória de 64 caracteres (a senha antiga deixa de valer) e limpa `remember_token`, `email_verified_at` e os campos de 2FA;
   - remove as sessões (`sessions.user_id`) e o token de redefinição de senha, localizado pelo e-mail original.

   Depois do commit, apaga o arquivo da foto se `profile_pic` for caminho local `avatars/...`. URL externa não é tocada. Falha ao apagar o arquivo é logada e não desfaz a anonimização.

   **Marcador de conta anonimizada:** `User::estaAnonimizado()` compara o padrão do e-mail (`anonimizado-*@invalid`). Não há coluna nova. `User::notify()` não envia nada a conta anonimizada, nem grava linha em `notifications`, porque o e-mail não existe e o titular pediu eliminação.

   **Nome exibido traduzido na leitura:** o banco guarda o marcador `NOME_ANONIMIZADO` (não traduzido). O accessor `User::name()` (`Attribute::get`) devolve `__('Anonymized user')` quando o valor bruto é esse marcador, no idioma da request (ou do worker, em job) de quem lê; qualquer outro valor volta como está. O accessor não depende da coluna `email`, então funciona nos selects explícitos sem `email`. Consequências:
   - `getRawOriginal('name')` continua sendo o marcador; `ExclusaoDeContaService::anonimizar()` grava o valor bruto e não é afetado.
   - Atualização de perfil, factories e `fill()` operam sobre o valor bruto. Ordenação e busca por nome (`UserRepositoryEloquent`) continuam no banco, sobre a coluna bruta.
   - Serialização Inertia e relatórios leem pelo accessor, então exibem o rótulo traduzido. Consulta crua (`DB::table`/SQL) continua devolvendo o marcador.
   - Um usuário ativo cujo nome real seja exatamente `Usuário anonimizado` seria exibido traduzido; o caso é improvável e aceito.

   **Preservado de propósito:**
   - `reservas.user_id` e `horarios.user_id` (avaliador): rastreabilidade. O `onDelete set null` não dispara mais na exclusão de conta.
   - `users.setor_id`: mantido para os relatórios agregados por instituição (`IndicadoresConsolidadosRelatorio`). Pendência de decisão do encarregado (ver abaixo).
   - `users.permission_type_id`: NOT NULL, sem uso de domínio.

   **Trava de gestor:** usuário que ainda gere alguma agenda (`agendas.user_id`) não é anonimizado. `ContaNaoPodeSerAnonimizadaException` é lançada antes de qualquer alteração. Na autoexclusão a mensagem volta ao perfil no campo `password`. Na exclusão pelo institucional volta como flash `error`. Para liberar, remover a gestão pelo cadastro de usuários (`UserService::updatePermissions()` desvincula as agendas) e repetir a ação.

   **Efeito nos fluxos de reserva:** o titular anonimizado continua existindo, então listagem, detalhe, avaliação (`AvaliarReservaJob`), cancelamento e conflitos seguem sem nulo. A detecção de conflito (`ConflictDetectionService::findConflictsFor()`) não junta mais com `users`; antes, uma reserva sem titular sumia da detecção. Os e-mails de reserva usam `$reserva->user?->name` com o rótulo `__('Unidentified requester')` quando a reserva não tem titular (registros anteriores à anonimização).

   **Reservas pendentes do titular são canceladas na anonimização (T-25, revisão do responsável):** dentro da mesma `DB::transaction`, toda reserva do titular (`reservas.user_id`) com `situacao = em_analise` é inativada pelo mesmo caminho do cancelamento: `ReservaService::inativar()` marca a reserva e os horários como `inativa`. A seleção trava as linhas (`lockForUpdate`), então uma avaliação concorrente não cruza a anonimização. "Pendente" é só `em_analise` na reserva. Não há filtro por data: como o cancelamento é da reserva inteira, uma reserva em análise com data já passada também é cancelada, para não deixar pendência sem solicitante na fila do gestor. Reservas `deferida`, `indeferida`, `parcialmente_deferida` e `inativa` não são alteradas, e reservas de outros solicitantes também não.

   Os efeitos externos do cancelamento (aviso aos gestores por `ReservationCanceledNotification`, sem nome do titular; revalidação de conflitos; publicação `canceled` pelo `ReservaBroadcaster`, que despacha `ReservaAlterada` e invalida o cache de relatórios) rodam só depois do commit, em `ExclusaoDeContaService::notificarCancelamentos()`, que chama `ReservaService::notificarCancelamento()`. O pós-commit é explícito, e não via `afterCommit`, porque sob `DatabaseTransactions` nos testes esse callback nunca dispara. Falha de um desses efeitos é logada e não desfaz a anonimização. Se qualquer etapa da transação falhar, a reserva continua em análise e nenhum aviso é enviado. A conta anonimizada não recebe aviso (`User::notify()`).

   **Decisões do responsável registradas:**
   - Gestor de agenda continua bloqueado de ser anonimizado enquanto gerir alguma agenda (decisão 1). Nenhuma mudança.
   - `users.setor_id` do titular anonimizado fica preservado (decisão 2), para os relatórios agregados por setor. Nenhuma mudança.

   **Contas anonimizadas na lista administrativa:** `UserRepositoryEloquent::getPaginatedForAdminByInstituicao()` esconde contas anonimizadas por padrão, pelo mesmo padrão do e-mail (`anonimizado-%@invalid`, com os curingas escapados). Com o parâmetro `anonimizados=1` (validado em `ListarUsuariosRequest`), a listagem mostra somente essas contas. Busca por nome e e-mail, ordenação e paginação seguem o filtro, que volta em `filters.anonimizados`. A conta aparece com o nome traduzido e marcada como `anonimizado`, e não recebe editar, redefinir senha, reenviar verificação, alterar papel ou excluir (ver `UserPolicy`).

   **Fora do alcance desta regra:** `failed_jobs.payload`, que sai pela rotina de retenção (`queue:prune-failed`, prazo `RETENCAO_JOBS_FALHOS_DIAS`); cópias de segurança, que seguem a T-23 no [backlog](../backlog.md); e as notificações anteriores à T-24, que podem conter o nome de terceiros enquanto não forem lidas e expiradas (ver [notificacoes.md](notificacoes.md)). A retenção não usa `Prunable` nos models: é o comando `retencao:aplicar`, pelo `RetencaoRepositoryInterface` (ver [repositorios.md](repositorios.md)).

6. **Foto de perfil reprocessada:** `ProcessadorDeFotoDePerfil::armazenar()` (`app/Services/ProcessadorDeFotoDePerfil.php`) decodifica a imagem enviada, aplica a orientação EXIF aos pixels e reduz para no máximo 800 px no maior lado (imagens menores não são ampliadas). Grava o resultado como JPEG ou WebP (PNG nos demais casos), com nome aleatório em `avatars/`. O arquivo é recodificado a partir dos pixels, então não carrega os metadados originais (EXIF, GPS). Imagens acima de 25 milhões de pixels, ou que não cabem na memória, são recusadas com erro no campo `photo`. Na troca, a foto anterior é apagada; na anonimização, a foto local é apagada (item 5).

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

2. **Validações customizadas:** A regra `HorarioDisponivel` rejeita faixas que se sobrepõem a horário `deferida` ([validação](../regras-de-negocio/validacao.md#horariodisponivel)). Conflitos adicionais são detectados pela `ConflictDetectionService` durante a avaliação.

3. **Permissões Spatie:** Referem-se a `reservas.listar`, `reservas.visualizar`, `reservas.atualizar`, `reservas.avaliar`, etc. Consulte `RoleService` e migrations de permissões para a lista completa.

4. **Estado `em_analise` é transitório:** Não bloqueia novas submissões ou criação de novos horários. É apenas um marcador de "em progresso".

5. **Arquivamento via `inativa`:** Não é reversível no código; é um estado final. Quando uma reserva é cancelada (`ReservaService::cancel()`), ela e todos seus horários são marcados como `inativa`.
