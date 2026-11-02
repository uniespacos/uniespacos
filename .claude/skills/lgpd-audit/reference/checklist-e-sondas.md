# Checklist e sondas de código

Cada item: **pergunta** → **sonda** (como procurar) → **o que é achado**. Rode as sondas com `Grep`/`Glob`
(ou `rg`, que a máquina tem). Tudo é leitura. Cite `arquivo:linha` no achado.

Legenda de coluna "Ref": artigo da LGPD / seção do guia.

---

## A. Princípios (art. 6º) — F2

### A1 Finalidade e adequação
- **Cada coluna pessoal tem uso conhecido?** Liste colunas pessoais (§Inventário) e, para cada uma, ache
  onde é *lida*: `rg -n "telefone" app resources/js`. Coluna escrita e nunca lida = coleta sem finalidade
  (A2). Coluna lida num contexto diferente do da coleta = adequação.
- **Reuso secundário.** Procure relatórios, métricas, dashboards e exports que cruzem pessoa × comportamento:
  `rg -n "user_id|solicitante|geradoPor" app/Services/Relatorio app/Services/HomeService.php`. Ranking de
  usuários/setores, "quem mais cancela", "quem avalia mais lento" é **perfil comportamental** (gatilho de RIPD).
- **Finalidade escrita em algum lugar?** `rg -n -i "finalidade|base legal|art\. 7" docs app resources lang`.
  Vazio = achado de transparência/prestação de contas (A6).

### A2 Necessidade / minimização (Privacy by Default)
- **Coleta no cadastro.** Leia `app/Actions/Fortify/CreateNewUser.php` e `UpdateUserProfileInformation.php`:
  cada campo `required` precisa de justificativa. Pergunte: o telefone é *necessário* para a reserva ou é
  conveniência? Se opcional bastaria, é coleta excessiva (R06).
- **Superexposição por serialização.** `rg -n "toArray\(\)|->get\(\)|select\(\['\*'\]|\*\)" app --glob '!tests'`
  em Controller/Service que devolvem a Inertia. `$user->toArray()` entrega **toda coluna não-`$hidden`**
  (ex.: `telefone`, `email`, `profile_pic`) ao navegador, mesmo que a tela mostre só o nome. Confirme
  também o que vai nas *shared props* (`HandleInertiaRequests`), que seguem em **toda página**.
- **Props de listagem.** Em telas de lista de usuários/reservas, abra o JSON da página no navegador (ou
  leia o Resource/Service) e confira se há campo que a UI não renderiza.
- **Campo livre.** Ache os campos de texto livre de reserva/espaço/setor nos `FormRequest`
  (`rg -n "string|text" app/Http/Requests`) e veja se há orientação de **não inserir dado pessoal/sensível**.
- **Metadados coletados sem uso.** `sessions.ip_address`/`user_agent`, IP em `ExceptionContext`, auditoria:
  existe finalidade (segurança) e prazo? Se sim, documente; se não, é R06/R11.
- **Interações anônimas por padrão.** Existem rotas públicas que já pedem identificação? `rg -n "Route::" routes/web.php`
  e compare `guest` × `auth`.

### A3 Livre acesso e qualidade
- Existe tela "meus dados" (nome, e-mail, telefone, foto, vínculos, histórico de reservas, avaliações
  recebidas, notificações) com **duração do tratamento** informada? `rg -n -i "meus dados|exportar meus|download" resources routes`.
- O titular **corrige** os próprios dados? (hoje: `UpdateUserProfileInformation`). Troca de e-mail zera
  verificação: ok, mas confira se há trilha.
- Há rotina de qualidade (conta inativa, e-mail que quica, telefone inválido)? Sem rotina = A3 `HIPÓTESE`.

### A4 Transparência
- `rg -n -i "privacidade|lgpd|encarregado|dpo|termos|política" resources routes lang app` → onde o titular
  é informado de **quem trata, para quê, com que base, por quanto tempo, com quem compartilha, como exercer direitos**.
- Rodapé, cadastro e e-mails (templates `resources/views/vendor/mail`, `app/Notifications`) trazem o aviso/contato?

### A5 Segurança → ver §C.

### A6 Prevenção, não discriminação, prestação de contas
- **Prevenção:** existe análise de risco/RIPD por feature? `Glob docs/**/*ripd* docs/**/*impacto*`.
- **Decisão automatizada (art. 20):** a auto-aprovação (`AutoAprovacaoService`) e a detecção de conflito
  (`ConflictDetectionService`) decidem sobre o titular **sem revisão humana**? Reprovar/aprovar reserva
  "automaticamente" afeta interesse dele. Verifique: critérios documentados? há recurso/revisão humana?
  o titular consegue saber o critério? (art. 20 §1º). Se a decisão é só sobre o *espaço*, não sobre a
  *pessoa*, registre isso com evidência.
- **Prestação de contas:** os controles têm teste que os prova? `rg -n -i "hidden|redact|mask|policy" tests`.
  Controle sem teste regride sem aviso.

---

## B. Direitos do titular (art. 18, 20) — F3

Para **cada** direito: existe funcionalidade, rota, procedimento documentado ou canal? Quem responde? Em quanto tempo?

| Direito | Sonda | Achado típico |
|---|---|---|
| I Confirmação de tratamento | procurar canal/FAQ | inexistente |
| II Acesso aos dados | tela/rota de "meus dados"; `rg -n "export" app routes` | só administrador enxerga; titular não |
| III Correção | `UpdateUserProfileInformation`, Settings | existe para perfil; **não** para dados derivados (histórico) |
| IV Anonimização/bloqueio/eliminação do desnecessário | `rg -n "forceDelete|->delete\(|destroy\(" app` | só `DELETE` físico; sem anonimização |
| V Portabilidade | formato estruturado (CSV/JSON) do próprio dado | só relatórios gerenciais |
| VI Eliminação (consentimento) | n/a se base ≠ consentimento; ver art. 16 | confirmar com jurídico |
| VII Compartilhamento | lista de operadores/destinatários publicada | inexistente |
| IX Revogação | só se há consentimento | se há checkbox de aceite, existe como revogar? |
| Art. 20 Revisão automatizada | ver A6 | sem canal |

- **Exclusão de usuário.** Leia `UserService::delete` → `destroy`. Perguntas: apaga fisicamente? o que
  acontece com `reservas`, `horarios.user_id` (avaliador), `agendas`, `notifications`, `sessions`,
  `espaco_user`, arquivos em `storage/app/public/avatars`, `telescope_entries`, `failed_jobs`, cache, backups?
  **Eliminar o registro e deixar a foto, a notificação e o dump é eliminação incompleta.**
  Por outro lado, apagar tudo pode destruir o histórico de reservas que a instituição precisa guardar
  (art. 16, I): decisão de retenção/anonimização é jurídica; a skill só mostra a tensão.
- **Quem pode pedir o quê.** Hoje o administrador "institucional" gerencia usuários (`InstitucionalUsuarioController`):
  verifique se ele pode ver/editar dado além do necessário (princípio da necessidade aplicado a acesso, §C2).
- **Canal e prazo.** Não existe no código? Então é `FORA DO ALCANCE DO CÓDIGO` + tarefa `humano`
  (definir canal, responsável, prazo) + tarefa `frontend/docs` (publicar o canal).

---

## C. Segurança (art. 46) — F4

### C1 Autenticação e sessão
- 2FA disponível e **incentivado** para perfis privilegiados? `config/fortify.php` (`Features::twoFactorAuthentication`),
  `two_factor_*` em `$hidden` (ok). 2FA é opcional ou obrigatório para administrador?
- Política de senha (`PasswordValidationRules`), limitação de tentativas (`RateLimiter` no Fortify), `remember_me`.
- **Sessão:** `SESSION_ENCRYPT` — `config/session.php` tem default `true`, mas `.env.example` fixa `false`.
  Verifique o valor efetivo em produção (`docs/deployment-secrets.md`, compose prod). Cookie `secure`, `same_site`, `http_only`.
- Reset/verificação de e-mail: token expira? mensagem **não revela** se o e-mail existe (enumeração de usuário)?
  `rg -n "passwords|reset" config/auth.php config/fortify.php`.

### C2 Controle de acesso (princípio do menor privilégio; Privacy by Default: "nem todo usuário vê tudo")
- **Mapa papel × dado pessoal.** Para cada rota que devolve usuário/reserva, qual papel acessa e qual dado vê?
  `rg -n "can\(|authorize\(|middleware\(|permission:" routes app/Http/Controllers app/Policies`.
- **IDOR:** rota com `{usuario}`/`{reserva}` sem Policy escopada por instituição/setor/agenda?
  Ex.: `GET setors/{setor}/usuarios`, `usuarios/{usuario}/contexto-permissoes`. Teste: a Policy compara
  `instituicao_id`/`setor_id` do alvo com o do ator? Procure teste de negativa (`assertForbidden`).
- **Mass assignment:** `$fillable` ou `$guarded=[]`? `rg -n "guarded = \[\]" app/Models`. `permission_type_id`
  não está no `$fillable` de `User` (bom, confirme em todas as rotas de update).
- **Canais de broadcast** (`routes/channels.php`): `App.Models.User.{id}` só para o próprio usuário (ok:
  compara `id`). `App.Models.Espaco.{id}` autoriza **qualquer autenticado** se o espaço existe (a variante
  restrita por permissão está comentada). Então a pergunta é o **conteúdo** do evento: ele carrega dado
  pessoal de reserva (solicitante, descrição)? Se sim, é exposição a quem não tem relação com o espaço.
- **Payload de broadcast/notificação** (`BaseNotification::toArray/toBroadcast`, `ReservaEvent`): o que de
  pessoal viaja? Nome de solicitante em texto livre na `descricao` fica **gravado indefinidamente** na tabela `notifications`.

### C3 Vazamento por observabilidade (a categoria que mais passa despercebida)
- **Logs:** `rg -n "Log::" app` e inspecione o contexto passado. Dado pessoal (e-mail, nome, telefone,
  IP, payload) em log = cópia sem controle de acesso nem prazo. Conferir: `LOG_LEVEL=debug`, `LOG_STACK=single`
  (arquivo único **sem rotação** → retenção ilimitada), `LOG_DAILY_DAYS`, destino do log em produção.
- `ExceptionContext` grava `user_id` e **IP** em toda exceção: documentado como finalidade? prazo?
  (Bom: o corpo da requisição foi **excluído de propósito** por conter senha — registre como controle positivo.)
- **Telescope** (`config/telescope.php`, `TelescopeServiceProvider`): `TELESCOPE_ENABLED` default `false`, mas
  se ligado captura requisições, queries, e-mails, notificações, jobs, modelos. `Telescope::filter(fn => true)`
  e `hideRequestParameters(['_token'])` esconde **só** `_token` — **senha e dados do formulário não estão
  redigidos**. Confirme: ligado em algum ambiente com dado real? quem acessa `/telescope`? `viewTelescope` gate?
  retenção (`telescope:prune`)? (Ver armadilha em CLAUDE.md: Telescope vazou em `reverb-1`/`queue-worker-1`.)
- **Filas:** `jobs`/`failed_jobs` guardam payload serializado com modelos/Notifications → dado pessoal
  parado em tabela, às vezes por tempo indefinido. `queue:prune-failed`/`queue:flush` agendados?
- **Cache/Redis:** o que é cacheado e por quanto tempo (`conflict-cache-contract.md`)? chave inclui dado pessoal?
- **Erros ao usuário:** `APP_DEBUG=false` em prod; páginas de erro sem stack trace.
- **Frontend:** `rg -n "console\.(log|info|debug)" resources/js` com objeto de usuário; `localStorage`/
  `sessionStorage` guardando dado pessoal; serviços de terceiros carregados (fontes, analytics, CDN) que
  recebem IP (transferência/compartilhamento).

### C4 Armazenamento e criptografia
- **Em repouso:** colunas pessoais em texto puro no Postgres (`telefone`, `email`). Criptografia de coluna
  é decisão de risco; no mínimo, **disco/volume e backup cifrados**. Verifique em `compose.prod.yml`/infra.
- **Em trânsito:** HTTPS externo (HSTS presente em `docker/production/nginx/default.ssl.conf`), TLS ≥ 1.2.
  Interno Docker usa http por regra do projeto (`REVERB_SCHEME=http`): aceitável **dentro** da rede
  privada; confirme que nenhuma porta de Postgres/Redis/Reverb está publicada no host em produção.
- **Cabeçalhos:** no nginx de produção só aparecem `X-Frame-Options` e `Strict-Transport-Security`.
  Procure `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
  `rg -n "add_header" docker/production/nginx`.
- **Arquivos enviados:** `profile_pic` vai para o disco `public` (`storage/app/public/avatars`), servido
  **sem autenticação** por URL previsível. Foto de pessoa é dado pessoal (e pode virar biométrico se usada
  para reconhecimento). Veja: nome do arquivo é aleatório? tipo/tamanho validados? é removida ao trocar
  e ao excluir usuário? (`ProfileController` remove ao trocar; exclusão de usuário?)
- **Segredos:** `.env.example` com credencial padrão (`DB_PASSWORD=uniespacossecretkey`) — confirme que
  produção não a usa. `docs/deployment-secrets.md`. Senhas de seed (`Development/UserSeeder` usa senha
  fraca): confirmar que **nunca** roda em produção (`database/seeders/Production`).

### C5 Backups, dumps e cópias
- `Glob *.sql`, `*.dump`, `*.zip`, `*.bak` na raiz, `docs/`, `storage/`, `database/`. Dump de produção
  fora de cofre é **S1**. Verifique `.gitignore` (ignorado ≠ seguro: o arquivo continua no disco, em
  backup de máquina, em sincronização de nuvem, em imagem Docker via `COPY . .` se `.dockerignore` não o exclui).
  `rg -n "sql|backup|zip" .dockerignore .gitignore`.
- Dado real em **ambientes não produtivos** (dev/teste/staging): restore de produção em dev é tratamento
  sem necessidade. Prefira anonimizar.
- Seeds/fixtures/factories: nomes/e-mails **reais** hardcoded? `rg -n "@uesb|@gmail" database tests`.
- **Histórico do git:** dado pessoal já commitado permanece no histórico mesmo após remoção. `git log -S"<padrão>" --all`
  (somente contagem de commits; não imprima o dado).

### C6 Retenção técnica
- Tabelas que crescem sem limpeza: `sessions`, `notifications`, `jobs`, `failed_jobs`, `telescope_entries`,
  `cache`, `password_reset_tokens`, `horarios`/`reservas` antigas. `rg -n "prune|schedule|->daily|->weekly" routes/console.php app/Console bootstrap`.
  Sem agendamento = retenção ilimitada (R11).
- **Arquivamento (`ModoArquivoEnum`) é filtro de listagem, não eliminação** (`archive-soft-delete-flow.md`).
  Dado arquivado continua identificável: registrar na matriz de retenção e perguntar ao jurídico o prazo final.

### C7 Integridade e erro de processamento (R13)
- Validação de entrada em todo `FormRequest` que grava dado pessoal; `Policy` no update.
- Scripts/comandos que alteram dado em massa (`app/Console/Commands`) têm dry-run, transação e log? Ex.:
  `CleanDuplicateHorariosCommand` faz `DB::table('horarios')->...->delete()` em lote.
- Migrations destrutivas e *down* que perdem dado.

### C8 Dependências e supply chain
- `composer audit` e `npm audit` (rodar no container/host conforme CLAUDE.md; **são leituras**).
  Vulnerabilidade conhecida em lib que toca autenticação/serialização é S1/S2.

---

## D. Governança — F5

Quase tudo aqui é `FORA DO ALCANCE DO CÓDIGO`. Verifique se **existe documento** e liste o que falta.

| Item | Ref | Existe? Evidência esperada |
|---|---|---|
| Controlador identificado | art. 5º VI | doc institucional |
| Encarregado nomeado, **contato público** (nome, cargo, local, horário, telefone, e-mail) | art. 23 II, 41 | página pública no sistema/site |
| Política/aviso de privacidade acessível | art. 6º VI, 9º | rota + link no rodapé/cadastro |
| Base legal por tratamento documentada | art. 7º, 23 | tabela no inventário |
| Previsão legal/finalidade/procedimentos publicados | art. 23 I | página pública |
| Registro das operações de tratamento (inventário) | art. 37 (⚠ fora do guia) | `01-inventario-de-dados.md` |
| **RIPD** do UniEspaços | art. 5º XVII, 38 | documento aprovado e revisado anualmente |
| Contrato/cláusula LGPD com operadores (e-mail, hospedagem, backup) | art. 39 | contrato |
| Plano de resposta a incidente + registro de incidentes | guia §2.3; art. 48 | runbook |
| Tabela de temporalidade / prazos de retenção | art. 15–16; Lei 8.159/91 | tabela aprovada |
| Canal e rito para pedidos do titular | art. 18; Lei 13.460/17 | procedimento + SLA |
| Treinamento/conscientização | guia intro, §2.3 | registro |
| Matriz de papéis × acesso revisada periodicamente | art. 46 | revisão datada |

---

## Como transformar sonda em achado

1. Rode a sonda, anote `arquivo:linha`/comando.
2. Classifique: `CONFIRMADO`, `HIPÓTESE` ou `FORA DO ALCANCE DO CÓDIGO`.
3. Ligue a princípio/artigo e a um risco do catálogo (R01–R14 ou novo).
4. Estime P e I, depois severidade (S1–S4) e esforço.
5. Escreva a correção como tarefa com `pronto quando` verificável (ver `templates.md`).
