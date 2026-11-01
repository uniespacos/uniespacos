# Backlog — UniEspaços

> **Fonte única do que falta fazer.** Consolida os planos e auditorias de agosto a outubro de 2026, conferidos contra o código em 2026-11-01.
> **Base:** `develop` @ `629bdab` (1.5.0-rc.108, em staging) · produção: `main` v1.4.4 (30/10/2026).
> **Atualizado em:** 2026-11-01.

## Como ler

- **Ordem:** as ondas estão na ordem de execução. A LGPD (Ondas 1 e 2) tem precedência; itens `P1` das Ondas 3 e 4 podem correr em paralelo aos `P3` da LGPD.
- **Prioridade:** `P0` bloqueia o próximo release ou é risco imediato · `P1` alto impacto, próximo ciclo · `P2` importante, planejar · `P3` melhoria · `P4` ideia ou baixo impacto.
- **Esforço:** pequeno (até 1 dia) · médio (alguns dias) · grande (uma semana ou mais).
- **IDs:** o primeiro é o canônico; depois do `=` vêm os nomes do mesmo item em outros planos. Famílias: `T-xx` plano LGPD · `Sxx` e `Bxx` estabilização v1 · `GAP-xx` lacunas do fluxo de reserva · `#nnn` issue do GitHub · `I18N-*` plano de i18n · `RR-*`, `AF-*` e `DEB-*` sobras dos planos de regras de reserva, áreas de foco e débitos técnicos 2026-09 · `DOC-xx` achados desta consolidação. Decisões: `F-xx` e `P-xx` (LGPD), `D-EST-xx`, `DT-xx`, `E1-xx` e `Dx` (estabilização e board de 30/09).
- **Segurança:** o repositório é público. Itens de segurança descrevem o objetivo, sem detalhe de exploração; o detalhe fica nos planos locais (ver [Origem dos itens](#origem-dos-itens)).

## Agora

- **Em staging:** 1.5.0-rc.108, com o lote LGPD (#489), a congruência de UI/UX (#487) e o resíduo da Onda 1 (#494). Produção segue na v1.4.4.
- **Próximo passo:** validação manual em staging, com o responsável → release 1.5.0 → T-05. A página de privacidade está em standby (desligada por padrão) e não entra no 1.5.0.
- **Parado:** trilha de backup (T-23), aguardando a TI · remoção do fallback da `RelatorioPolicy` (DEB-D2), aguardando consulta em produção.
- **Decisões que mais destravam:** encarregado formal (F-01), prazos de guarda (F-03), canal do titular (F-08), 2FA (F-12), rastreador de erros e canal de alerta (D-EST-01, D-EST-15). Lista completa em [Decisões pendentes](#decisões-pendentes-não-é-código).

---

## Onda 1 — LGPD: fechar e liberar o lote que está em staging (`P0`)

- [ ] **Validação em staging** · Roteiro manual na rc.108 — `P0` · pequeno · operação (responsável, em andamento)
  29 passos em 6 blocos: (1) telas com menos dados; (2) logout, botão "Voltar" e foto de perfil; (3) notificações sem nome de terceiros em pt/en/es e limite de 2000 caracteres; (4) anonimização de conta; (5) página de privacidade desligada (404 em `/privacidade`, links ocultos nas telas e nos e-mails, contato da Projur presente no e-mail) e rodapés; (6) recuperação de senha e limites de taxa. Comece pelo bloco 1 e pelo passo 15. No passo 2, o setor do gestor deve aparecer: a T-26 (c) foi corrigida no #494, então um traço já é falha. Roteiro: plano LGPD local, arquivo 09.
  **Pronto quando:** os 29 passos passam.
- [ ] **Release 1.5.0** · Levar o lote LGPD para produção — `P0` · pequeno · operação
  Depende da validação em staging acima. A decisão sobre a página de privacidade já foi tomada (standby, fora do 1.5.0). Sem migration. Checklist: conferir que o `.env` de staging e o de produção não definem `PRIVACY_PAGE_ENABLED=true` (o padrão `false` só vale se o servidor não sobrescrever); backup manual baixado para fora do host antes do deploy; PR do release-please na `develop`; PR `develop` → `main` com **merge commit** (squash não gera release, B53); acompanhar o `CI/CD - Production`; smoke por papel; PR de sincronização `main` → `develop`; reiniciar o queue worker (o lote mexe em Job e Notification).
- [ ] **T-05** · Rotacionar e descartar logs antigos de produção — `P0` · pequeno · operação
  Logo depois do release, com a T-04 completa. Registrar a decisão sobre incidente no runbook (T-16). = A-03, R-P03, S13.
- [ ] **T-08** · Conferir a configuração efetiva de produção, sem abrir dados — `P1` · pequeno · operação
  Pode correr em paralelo à validação. Destrava T-20 e T-35. = H-01 a H-03.

## Onda 2 — LGPD: próximo lote (`P1`–`P3`)

**Código**

- [ ] **T-19** · Rotinas de retenção configuráveis e scheduler em produção — `P1` · médio · lgpd
  Valores provisórios da DT-11 (jobs falhos 30 dias, notificações lidas 90, cache 7, sessões 7) atrás de `config/retencao.php`; os valores finais dependem da T-12. Também limpa registros antigos que ainda têm nome de terceiros (anteriores à T-24). = S52, DT-11, B23, A-06.
  **Pronto quando:** `php artisan schedule:list` mostra as rotinas, os testes de retenção passam e o serviço de scheduler roda em staging.
- [ ] **T-20** · Log diário com 14 dias e nível `info` em produção — `P1` · pequeno · lgpd
  Prazo decidido (P-16). Depende da T-08. Inclui limite de tamanho dos logs dos containers. = S43, B23, E1-29.
  **Pronto quando:** `LOG_STACK=daily`, `LOG_DAILY_DAYS=14` e `LOG_LEVEL=info` em produção, com arquivos rotacionados em staging.
- [ ] **T-26 (a, b)** · Props compartilhadas mínimas — `P1` · pequeno · débito técnico
  Trocar o tipo `unread_notifications` por `unread_notifications_count` em `resources/js/types/index.d.ts` e nos mocks; avaliar enxugar a prop `notifications` (15 itens com texto). A visibilidade do telefone para institucionais aguarda a F-06. A prop `notifications` ganha `chave`/`parametros` na I18N-F3; coordenar. = S61, F1, E2-O.1.
- [ ] **T-31 (resíduo)** · Reprocessar as fotos de perfil enviadas antes do reprocessamento automático — `P2` · pequeno · lgpd
  O tratamento da T-31 vale para os envios novos; as fotos já gravadas não passaram por ele. = A-19.
  **Pronto quando:** comando com `--dry-run` reprocessa as fotos existentes e há teste cobrindo.
- [ ] **T-35** · Validar na inicialização se a configuração de produção está segura — `P2` · pequeno · segurança
  Comando `app:check-env`. Depende da T-08. = S53, A-18.
- [ ] **T-41** · Comando de anonimização para bases não produtivas — `P2` · médio · lgpd
  Recusa rodar em produção. Prepara a T-01 e a T-03.
- [ ] **T-44** · Teste transversal de privacidade das páginas na CI — `P2` · médio · teste
  Depende da T-26 completa.
- [ ] **T-21** · Documentação de retenção de logs igual à configuração real — `P2` · pequeno · docs
  Atualizar [`arquitetura/erros-e-logs.md`](./arquitetura/erros-e-logs.md) depois da T-19 e da T-20.

**Operação de produção (um arquivo por vez)**

- [ ] **T-06** · Endurecer o script de deploy contra configuração ausente — `P1` · pequeno · segurança
  Precisa de janela combinada (DT-08). = A-07, A-12, A-21, B22.
- [ ] **T-23** · Cópias de segurança cifradas, com retenção, cópia externa e restauração testada — `P1` · grande · operação · ⏸ parado
  Aguarda a conversa com a TI (destino externo, retenção, staging para o ensaio) e as decisões T-12, T-13, D-EST-13, D-EST-23, D-EST-24 e DT-10. Até lá: backup manual antes de cada deploy, e restauração automática pelo script de rollback proibida. = D-EST-22, S16, S22, S23, S51, S71, B21, B22, B74, E1-26 a E1-28, A-07.
- [ ] **T-28** · Cabeçalhos de segurança e compressão na borda — `P2` · pequeno · segurança
  Depende da DT-13 (CSP e HSTS). = S54, DT-13, A-20, B24, B67.
- [ ] **T-37** · Reduzir o escopo de variáveis e volumes por container — `P2` · pequeno · segurança
  = S67, E2-20, A-21, B27.

**Aguardando decisão institucional** (ver [Decisões pendentes](#decisões-pendentes-não-é-código))

- [ ] **T-17, T-18 (retomada)** · Retomar a página de privacidade: levantamento de design e redesenho — `P2` · médio · produto/UI · depende do texto final (T-10, T-17, T-18 / F-01)
  Página em standby desde 01/11, por decisão do responsável: os termos estão minimamente adequados, mas a UI/UX ficou desarmônica com o design do sistema. Detalhe e condição de retomada em [`privacidade/pagina-de-privacidade.md`](./privacidade/pagina-de-privacidade.md). Primeiro passo, antes de qualquer redesenho: levantar o que já existe no projeto (tokens Catppuccin do `@theme`, átomos, moléculas e templates em `resources/js/presentation`, primitivos shadcn em `resources/js/components/ui`, e os padrões de anatomia de página e estado vazio do #487) e redesenhar a partir desse levantamento.
  **Pronto quando:** o levantamento de design está registrado no documento da área; a página está redesenhada com o texto final aprovado; com `PRIVACY_PAGE_ENABLED=true` em staging, a página, os links e o e-mail passam nos testes e no roteiro.
- [ ] **T-30** · Reforçar a autenticação de perfis administrativos — `P2` · médio · segurança · depende da F-12
  = A-10, P-13, P-18.
- [ ] **T-14, T-16** · Versionar o inventário de dados e o runbook de incidente em `docs/privacidade/` — `P2` · pequeno · docs
  Rascunhos prontos, fora do git; aguardam aprovação e a definição de papéis (T-10). O RIPD (T-15) e o registro de incidentes continuam fora do git.
- [ ] **T-39, T-40** · "Meus dados": consulta e solicitações do titular — `P2` · médio · lgpd · depende da T-12 e da F-08
- [ ] **T-43** · Quem vê o nome do solicitante na agenda — `P2` · depende da F-05
- [ ] **T-10 a T-13** · Encarregado, bases legais, tabela de temporalidade e operadores — decisões institucionais

**Diferidas pelo responsável**

- [ ] **T-01, T-03** · Ambientes de desenvolvimento só com dados sintéticos ou anonimizados — `P1` · médio · lgpd · diferida (P-11)
  É o maior risco do plano LGPD; vale reavaliar a data. A T-41 prepara o caminho. = A-01, A-02, R-P01.
- [ ] **T-33** · Orientação de privacidade nos campos de texto livre — diferida (P-14)

**Complementares**

- [ ] **T-38** · Servir a fonte tipográfica pela própria aplicação — `P3` · pequeno · lgpd. = A-23.
- [ ] **T-46** · Checklist de privacidade no template de PR e nas skills — `P3` · pequeno · docs.
- [ ] **T-45** · Trilha de ações administrativas sobre dados pessoais — `P3` · médio · lgpd · depende da T-12 (ver também a GAP-10).
- [ ] **T-29 (limitação)** · Reduzir a informação revelada nos fluxos públicos de conta — `P3` · pequeno · segurança.
- [ ] **T-47, T-48** · Revisões periódicas e métricas de prestação de contas — `P3` · tarefa humana e recorrente · dependem da T-15, da T-10 e da T-16.

## Onda 3 — Estabilidade e segurança da v1 (`P1`)

- [ ] **S42** · Revisar a configuração de proxies confiáveis (borda e aplicação) — `P1` · pequeno · segurança
  = B28, E1-35, D-EST-17.
- [ ] **S17** · Congelar o relógio nos testes que dependem da data real — `P2` · médio · teste
  Habilita a S26, a S33 e a S36. Cerca de 19 arquivos de teste PHP usam `now()` ou `today()` sem congelar; o workflow diário em `develop` só pega a falha depois que ela acontece. = B63.
  **Pronto quando:** existe um trait de congelamento em `tests/Concerns/` e a suíte passa em duas datas simuladas (dia 31 e dia 1).
- [ ] **S26** · Broadcast não decide o desfecho dos jobs de reserva — `P1` · médio · bug
  Uma falha do Reverb pode marcar o job como falho e pular a notificação. Decisão tomada: broadcast depois do commit, num ponto único com `try/catch` (D-EST-14). = B15, B59, B60, E1-17.
  **Pronto quando:** com um broadcaster que lança exceção, criar e avaliar reserva não gera `failed_jobs` e o solicitante é notificado.
- [ ] **S33** · Separar erro de domínio, erro transitório e erro pós-commit nos jobs — `P1` · grande · bug
  Decisão tomada: `tries=1` em `ProcessarCriacaoReserva` (I8). Depende da S26 e da S17. = B15, B61, E1-18.
- [ ] **S14** · Tela de permissões usa o papel efetivo do usuário — `P1` · médio · bug
  Salvar o modal de quem tem dois papéis (comum e gestor) pode apagar as agendas dessa pessoa. Mitigação em vigor: os institucionais foram orientados a não salvar o modal desses usuários (I4). = B56, E2-14, A-15; decisão relacionada: B44.
  **Pronto quando:** um teste HTTP de `updatePermissions` preserva papéis e agendas de usuário com dois papéis.
- [ ] **S34, S35** · Alinhar os timeouts da fila e reparar reservas presas — `P2` · médio · bug
  `retry_after` maior que o timeout do worker, que é maior que o dos jobs; o comando de reparo cobre todos os estados presos. Depende da S33; a parte automática depende da DT-14. = B16, E1-19, E1-20.

## Onda 4 — Regras de negócio e segurança (`P2`)

- [ ] **S37** · Usuário sem setor: resolução segura da instituição e aviso para completar o perfil — `P2` · pequeno · bug
  Há acessos a `setor->unidade` sem proteção para nulo (erro 500 latente). Decisão tomada: middleware de setor com 403 explicativo (D-EST-03). = B2, E1-02, E1-03.
- [ ] **S38** · Endurecer o escopo padrão dos relatórios para contas sem vínculo organizacional completo — `P2` · médio · segurança
  Negar por padrão quando o escopo não puder ser determinado. Depende da S37 (e da S36). = B5, E1-08.
- [ ] **S36** · "Hoje" no fuso de negócio (America/Bahia) nas regras de data — `P2` · médio · bug
  À noite, o usuário pode não conseguir reservar para o próprio dia, porque a validação usa UTC. Decisão tomada: regras em America/Bahia, armazenamento em UTC (D-EST-02). Depende da S17. = B3, E1-04.
- [ ] **RR-H3** · Fechar a brecha de reserva dupla sob concorrência — `P2` · médio · bug
  O lock só alcança linhas que já existem e não há restrição no banco; duas criações simultâneas no mesmo horário vazio podem passar. Decidir a abordagem: lock consultivo por agenda e dia, ou restrição de exclusão no PostgreSQL.
  **Pronto quando:** um teste com duas conexões reais não grava dois horários deferidos sobrepostos.
- [ ] **RR-H2** · Validar no envio todas as semanas da recorrência — `P2` · médio · bug
  A validação síncrona olha só a primeira data; um conflito em semana posterior aparece no job como falha genérica.
  **Pronto quando:** uma reserva de um mês com conflito na terceira semana volta erro de validação no envio, sem criar a reserva.
- [ ] **B69, B71, B72** · Revisar validação e autorização dos FormRequests de atualização (espaço, módulo, unidade, instituição) — `P2` · médio · segurança
  Testes de caracterização primeiro (S30).
- [ ] **S73** · Editar módulo exige a permissão de atualização, não a de criação — `P2` · pequeno · bug
  `UpdateModuloRequest::authorize()` chama o `authorize()` padrão, que exige `modulos.criar`, enquanto `ModuloPolicy::update` exige `modulos.atualizar`. Um papel com só a atualização recebe 403 ao editar módulo; hoje é latente, porque o papel `institucional` tem as duas. Ligado à revisão da B69, B71 e B72.
  **Pronto quando:** `UpdateModuloRequest` usa `modulos.atualizar`, e um teste cobre a edição com um papel que tem só essa permissão.
- [ ] **S41** · Endurecer os workflows de deploy (verificação de host, versões fixadas, origem da imagem) — `P2` · pequeno · segurança
  Inclui unificar os Caddyfiles e corrigir o `workflow_dispatch` de staging, que implanta a imagem da última RC em vez da branch escolhida (B79). Depende da D-EST-24. = B68, B79, E1-33.
- [ ] **S46 → S48–S50** · Isolamento por instituição nas operações de escrita: ADR e implementação — `P2` · grande · segurança
  Hoje há uma instituição ativa; é requisito do gate da v2. Depende da decisão E1-16 (quem edita instituições alheias). = B6, E1-16, E2-A, A-16, A-26.
- [ ] **S39** · Atualizações em tempo real de reservas só por canais privados autenticados — `P3` · médio · segurança
  Remove o canal público `reserva-channel` e o listener morto. Decisão tomada: canal privado por usuário. Depende da S26. = B14, E1-15, B66.
- [ ] **B76** · Sanitizar o conteúdo das células nas exportações de planilha — `P3` · pequeno · segurança
  Depois do teste de exportação (S24).
- [ ] **S66** · Guarda-corpos administrativos e de conta — `P3` · médio · segurança
  = B51, B62, B64.
- [ ] **DEB-D2** · Remover o fallback de permissões legadas da `RelatorioPolicy` — `P3` · pequeno · débito técnico · ⏸ parado
  Aguarda rodar em produção as consultas de conferência (somente leitura) do relatório da fase 09 dos débitos 2026-09. = AF-R4a.
- [ ] **DEB-A1** · Validar no backend o horário contra a grade e o turno da agenda — `P3` · médio · débito técnico
  A grade canônica ainda vive no frontend (`resources/js/constants/turnos.ts`). Depende do #104.

## Onda 5 — Qualidade, operação e débitos técnicos (`P2`–`P4`)

**Testes**

- [ ] **B26** · Testes de caracterização dos módulos que a v2 vai alterar — `P2` · grande · teste
  `EspacoService` (S18), `ConflictDetectionService` (S19), `NotificationController` (S20), exportações PDF, XLSX e CSV (S24), CRUD de espaços (S30), de instituição e unidade (S32), de módulo e setor (S47). Junto: B77 (editar espaço renotifica gestores; confirmar na S18) e B73 (exclusão de instituição sem erro tratado; na S32). É gate da v2. = E2-10 a E2-17.
- [ ] **AF-6.3b** · Testes de conteúdo dos 4 tipos de relatório — `P3` · médio · teste · depende da S38
- [ ] **S57, S58** · Factories autossuficientes e CI só com seeders de produção — `P3` · médio · teste
  = B38, B52, I11.

**Operação**

- [ ] **S44, S45** · Health-check da fila e rastreador de erros — `P2` · médio · operação
  Hoje uma falha de fila só aparece por reclamação. Dependem da D-EST-15 (canal de alerta) e da D-EST-01 (rastreador). = B23, E1-30, E1-31.
- [ ] **S21, S71** · Runbooks versionados de deploy, rollback, hotfix, sincronização `main` → `develop` e restore — `P2` · médio · docs
  Não há nenhum (o hotfix 1.4.3 foi feito sem). Base: REGRAS §3 do plano de estabilização (arquivo local). Destino: `docs/operacao/`. O restore depende da T-23. = E2-D, B65.
- [ ] **S27** · Limite de taxa, teto diário e retentativa dos e-mails de notificação — `P2` · médio · bug
  O backoff já existe (#451). Depende das perguntas A e B (tipo de conta SMTP) e da I6. = B47.
- [ ] **S29** · Limites de upload e pool do php-fpm na imagem de produção — `P2` · pequeno · operação
  Produção usa os limites padrão do PHP, abaixo do limite que a aplicação valida. Depende da pergunta D (memória do host). = B18, B75, DT-07, E1-22.
- [ ] **S28, S31** · Retrato do RBAC de produção versionado, paridade dos seeders na CI e catálogo de permissões do front — `P3` · médio · débito técnico
  O catálogo do front (`resources/js/constants/permissions.ts`) já tem os 4 tipos de relatório e `secao.relatorios`, mas faltam `relatorios.escopo-agendas` e `relatorios.escopo-instituicao`. Depende da pergunta C (exportar a matriz de produção). = B11, B12, E1-09, E1-10.
- [ ] **DOC-01** · Tirar `docs/` do contexto de build da imagem de produção — `P3` · pequeno · operação
  O `.dockerignore` exclui só `docs/auditoria*` e `docs/plano-*`; os cerca de 25 MB de `docs/UniEspaço Web/` entram na imagem.

**Débitos técnicos e limpeza**

- [ ] **S64** · Reduzir as supressões do ESLint, com ratchet — `P3` · médio · débito técnico
  Reconferido em 01/11: 73 supressões em 33 arquivos no `eslint-suppressions.json` (`npm run lint:debt`), mais 6 `eslint-disable` inline: 5 `eslint-disable-next-line` em dois arquivos de teste (`hooks/use-espaco-live-updates.test.ts` e `presentation/pages/Espacos/VisualizarEspacoPage.test.tsx`) e 1 `/* eslint-disable */` em `ssr.tsx`.
- [ ] **DOC-02** · Sincronizar o `GEMINI.md` com o `CLAUDE.md` — `P3` · pequeno · docs
  O `GEMINI.md` é uma cópia antiga do `CLAUDE.md`: faltam os checks de PR e as armadilhas novas, e ele afirma que as supressões foram "100% purgadas".
- [ ] **DEB-R4** · Reduzir o baseline do PHPStan — `P4` · grande · débito técnico
  O nível 9 está ativo e o gate impede crescimento, mas o `phpstan-baseline.neon` ainda ignora cerca de 400 erros.
- [ ] **S65, S70, B39, B49, B50** · Limpeza de código morto e de ferramentas — `P4` · médio · débito técnico
  Controllers `Auth/` e `routes/auth.php` (conferir antes: o arquivo tem rotas ativas), `docker/production/nginx`, `compose.test.yml` e `versions.txt`; Prettier com o plugin do Tailwind (B34, B48; conferir depois da atualização do Prettier); Jest em worktree com ponto no caminho (B49); resposta das rotas `show` removidas (B39).
- [ ] **DEB-D3** · Admin: `DeleteItem` genérico em Roles e `ViewModeToggle` em todas as listas — `P4` · pequeno.
- [ ] **RR-D3** · Comando de auditoria dos horários com data anterior à criação, com `--dry-run` — `P4` · pequeno · depende de decisão sobre o destino desses registros.
- [ ] **RR-F01** · A mensagem de conflito diz "ou em análise", mas só horários deferidos bloqueiam — `P4` · pequeno. Entra no PR da I18N-F1, que traduz as Rules.
- [ ] **RR-F04** · Renomear a prop `conflictCache` do `ConflictAlertBox`, que recebe conflitos calculados na hora — `P4` · pequeno.
- [ ] **AF-6.3a** · Telemetria de acerto e falha do cache de relatórios — `P4` · pequeno.
- [ ] **S72** · Remover o código legado de unicidade de nome de andar — `P3` · pequeno · débito técnico
  `app/Rules/UniqueNormalizedFloorName.php` e `Andar::normalizarNome()` não têm uso. A Rule consulta a coluna `nome_normalizado`, que não existe em `andars`: resíduo do CRUD avulso de andar removido no #251.
  **Pronto quando:** os dois arquivos e as referências saem do código, e a suíte passa.
- [ ] **S74** · Garantir a unicidade de andar por módulo no banco, com testes — `P3` · médio · débito técnico
  A regra existe só na aplicação (`StoreModuloRequest::validateAndaresUniqueness` e `updateOrCreate` em `ModuloService::update`). Não há índice único `(modulo_id, nome)` em `andars`, e não há testes de criação ou edição de módulo. Antes da migration, conferir duplicatas em produção (no banco de dev não há nenhuma).
  **Pronto quando:** há testes de feature de criação e edição de módulo; a unicidade é decidida (índice único ou só aplicação) e, se for índice, a migration roda sem duplicatas em produção.

## Onda 6 — Internacionalização (`P2`–`P4`)

Plano revisado em 01/11 (rev. 3) e ainda não iniciado. Tarefas, riscos e critérios em `docs/plano-i18n/` (local; uma pasta por fase), auditoria em `docs/auditoria-i18n-2026-10-31/`. Convenção decidida (01/11): no backend, frase em inglês como chave nos JSON de `lang/`; no front, o motor tipado de `resources/js/i18n/`. Ordem: F0 → F1 e F5 em paralelo → F2, F3, F4+6a e os lotes 6b, 6c, 6d e 6f em paralelo → 6e → F7 → consolidação. F8 só com gatilho.

- [ ] **I18N-F0** · Fundação de locale: idioma salvo no usuário e formato único — `P2` · médio
  Enum de locale único; `users.locale` com `HasLocalePreference`; a prop `locale` do Inertia sempre em `pt-BR`/`en`/`es`; remove a prop `quote`, que não é usada; `<html lang>` acompanha a troca de idioma; cria `docs/arquitetura/internacionalizacao.md` com a convenção decidida.
  **Pronto quando:** a escolha de idioma persiste entre sessões; a prop `locale` nunca sai fora de `pt-BR`/`en`/`es`; `<html lang>` muda junto com o idioma; há testes cobrindo.
- [ ] **I18N-F1** · Arquivos de idioma, validação e testes de paridade — `P2` · médio · depende da F0
  `lang/pt_BR/` no lugar de `lang/pt/` e `lang/pt.json`; `lang/en` e `lang/es` completos; `es.json` com as chaves do framework que faltam (e-mails de senha e verificação); nomes de campo em `validation.attributes`; FormRequests e Rules traduzíveis; testes genéricos de paridade e de chave usada no lugar das listas manuais. Inclui a RR-F01.
  **Pronto quando:** a validação em `es` sai em espanhol, e remover uma chave de `es.json` faz um teste falhar.
- [ ] **I18N-F5** · Infraestrutura do front: plural, datas por locale e pseudo-locale — `P2` · médio · depende da F0
  Plural no motor; date-fns e formatos de data pelo locale ativo (hoje há `ptBR` importado em 7 arquivos e 12 formatos `dd/MM` fixos); ordenação pelo locale; textos dos primitivos de UI; dicionários divididos por namespace; pseudo-locale só em dev; testes com o motor real no lugar de mocks; script de inventário versionado.
  **Pronto quando:** nenhum import de `date-fns/locale` fora de `resources/js/i18n/`; testes de plural e datas nos 3 idiomas; nenhum teste com `jest.mock('@/i18n')`.
- [ ] **I18N-F2** · Mensagens de erro ao usuário traduzidas e sem detalhe técnico interno — `P3` · pequeno · depende da F1
  As flash messages já estão traduzidas (#489), e falhas de banco já viram mensagem genérica. Falta: exceção de domínio com mensagem traduzível, mensagem genérica para qualquer exceção não prevista, e as mensagens de `abort()` dos relatórios.
  **Pronto quando:** exceções de domínio e `abort()` aparecem traduzidos nos 3 idiomas, e exceção não prevista mostra só a mensagem genérica.
- [ ] **I18N-F3** · Notificações e e-mails no idioma do destinatário, inclusive em jobs — `P3` · grande · depende da F0 e da F1 (parte de front, da F5)
  O texto passa a ser gerado no idioma de quem recebe, nos canais banco, broadcast e e-mail; `chave` + `parametros` nas 8 notificações que ainda não têm, com o mapeamento no front; templates de e-mail e resumo de horários traduzidos. Mantém a regra da T-24 (sem nome de pessoa). A justificativa automática de conflito continua no idioma de quem avaliou (decidido). Coordenar com a T-26 (b) (formato da prop `notifications`). Notificações antigas sem `chave` usam o fallback, e a T-19 as remove com o tempo.
  **Pronto quando:** uma notificação disparada em job para um usuário com idioma `en` chega em inglês nos três canais, e as 10 notificações têm chave mapeada no front.
- [ ] **I18N-F4+6a** · Relatórios PDF e Excel e cache com chaves estáveis (backend e front juntos) — `P3` · médio · depende da F1 e da F5
  O resumo e os filtros usam chave estável em vez do rótulo em português; a tradução acontece depois do cache, com a versão do cache incrementada; PDF/Excel formatados pelo locale; telas de relatório traduzidas. Um PR só, porque o contrato JSON muda.
  **Pronto quando:** exportações em `en` e `es` saem traduzidas, a mesma entrada de cache serve todos os idiomas, e as telas de relatório não têm texto fixo.
- [ ] **I18N-6b** · Textos do front: espaços e andares (cerca de 42 strings) — `P3` · médio · depende da F5
  Um PR por lote: o PR remove do inventário só os arquivos deste lote.
  **Pronto quando:** o inventário não lista arquivos do lote, e as traduções en/es foram revisadas por uma pessoa.
- [ ] **I18N-6c** · Textos do front: administração, usuários e permissões (cerca de 108 strings, incluindo os rótulos de permissão) — `P3` · médio · depende da F5
  Um PR por lote: o PR remove do inventário só os arquivos deste lote.
  **Pronto quando:** o inventário não lista arquivos do lote, e as traduções en/es foram revisadas por uma pessoa.
- [ ] **I18N-6d** · Textos do front: reservas e agenda (cerca de 57 strings, incluindo a validação do formulário de reserva) — `P3` · médio · depende da F5
  Um PR por lote: o PR remove do inventário só os arquivos deste lote.
  **Pronto quando:** o inventário não lista arquivos do lote, e as traduções en/es foram revisadas por uma pessoa.
- [ ] **I18N-6f** · Textos do front: autenticação, componentes comuns e configurações (cerca de 42 strings) — `P3` · pequeno · depende da F5
  Um PR por lote: o PR remove do inventário só os arquivos deste lote.
  **Pronto quando:** o inventário não lista arquivos do lote, e as traduções en/es foram revisadas por uma pessoa.
- [ ] **I18N-6e** · Shell, navegação e painel de notificações no front (cerca de 30 strings) — `P3` · pequeno · depende da F3 e da F5
  Itens de menu, cabeçalho e painel de notificações do shell.
  **Pronto quando:** todos os itens de menu usam chave de tradução, e o painel de notificações não tem texto fixo.
- [ ] **I18N-F7** · Guardrails de i18n na CI e documento da convenção — `P3` · médio · depende das anteriores
  Lint que proíbe texto literal em JSX, sem supressões; testes de paridade dos rótulos de enum e dos idiomas; `docs/arquitetura/internacionalizacao.md` completo, com glossário e checklist de novo idioma. Depois dele vem a consolidação do plano.
  **Pronto quando:** um texto literal novo em JSX falha no lint, e uma chave faltando falha nos testes.
- [ ] **I18N-F8** · Carregamento sob demanda, manifest multilíngue e RTL — `P4` · médio
  Só com gatilho: um 4º idioma, tradutor externo ou PWA com nome traduzido.
  **Pronto quando:** definido conforme o gatilho.

## Onda 7 — Produto: funcionalidades (`P2`–`P4`)

- [ ] **#107** · Mostrar na agenda as solicitações em análise — `P2` · médio · feature
  Requisito "Must" do escopo original. Decidir o público: solicitante ou gestor (D-2). Armadilha: não ampliar o `ConflictDetectionService` para `em_analise`, porque a avaliação passaria a indeferir automaticamente; usar um serviço à parte.
- [ ] **GAP-10** · Trilha de auditoria das avaliações (quem, quando e por quê) — `P2` · médio · feature
  A reavaliação sobrescreve avaliador e justificativa. Bloqueia o #46; é o requisito 14 da v2. Ver também a T-45.
- [ ] **#98** · Versão de build no rodapé, só para administradores — `P2` · pequeno · feature. = S68, E2-I.
- [ ] **#46** · Edição de título e descrição da reserva com autorização do gestor — `P3` · grande · decisão primeiro
  Fazer um brainstorm das regras (D-3) e reescrever a issue. Depende da GAP-10. A D-EST-09 sugere fechar ou redefinir.
- [ ] **#104** · Templates de horário configuráveis pelo gestor — `P3` · grande · ADR primeiro (D-5)
  A label `P0` do GitHub não reflete o plano ("fora da 2.0", D-EST-09). O template precisa ser respeitado por `HorarioDisponivel` e `ConflictDetectionService`; destrava a DEB-A1.
- [ ] **GAP-09** · Fluxo para reserva parcialmente deferida — `P3` · médio · decisão primeiro
  Resumo de horários deferidos e indeferidos, com ação sobre os indeferidos. Inclui decidir se `ReservaPolicy::update` permite editar reserva com horário já avaliado (GAP-06).
- [ ] **#49** · Ir para a sala anterior ou a próxima a partir da agenda — `P3` · pequeno · depende da D-4 (andar ou módulo; ordem).
- [ ] **#462** · Busca de salas por necessidade (recursos e capacidade) — `P3` · grande · depende de modelar recursos e equipamentos.
- [ ] **GAP-07** · Indicador de progresso para o solicitante depois de criar a reserva — `P4` · médio
  A lista já recarrega por evento; a D-EST-18 deixa para a 2.x.
- [ ] **GAP-08** · Hora de pico, mapa de calor e série histórica nos relatórios — `P4` · médio.

## Futuro — v2.0

- [ ] **E3-01** · Re-baseline da documentação da v2 — `P3` · grande · decisão
  A documentação preparatória está na branch `docs/v2-0-documentacao-preparatoria`, não mergeada e escrita sobre a rc.71. Precisa aplicar o ADENDO-V2 antes de entrar na `develop`, já no padrão de nomes de `docs/`. Escopo da v2: Gestor de Unidade e Gestor de Espaço, dashboard composto, setor e expediente, aprovação por urgência, QR Code e chamados, consolidação retroativa (sprints 0 a 7).
  **Gate da v2:** 14 dias de v1 estável · fuso de negócio (S36) · isolamento de escrita (S48–S50) · staging anonimizado (E3-03, T-41) · restore testado nos últimos 30 dias (T-23) · jobs sem falha por broadcast (S26) · testes de caracterização (B26) · destino do PR #397.
- [ ] **PR #397** · Decidir o destino do módulo de chamados — `P2` · pequeno · decisão
  Aberto desde 26/08, sem revisão, com conflitos em 83 arquivos. Recomendação dos planos: fechar como substituído e reimplementar na v2 (sprint 6). = D-EST-05, D-7, A-06.

---

## Decisões pendentes (não é código)

### Institucionais (LGPD)

| Decisão | Quem decide | Destrava |
| --- | --- | --- |
| F-01 · Encarregado formal, com contato próprio (provisório: Projur e prefeituras dos campi) | gestão da UESB | T-10, texto final da política (T-17, T-18), runbook (T-16) |
| F-08 · Canal, rito e prazo de atendimento ao titular | encarregado | T-10, T-39, T-40, T-48 |
| F-02 · Bases legais e norma estadual | jurídico | T-11, T-14, T-15 |
| F-03 · Prazos de guarda (proposta DT-11: 30, 90, 7 e 7 dias) e eliminar ou anonimizar | encarregado e CPAD | T-12, T-19 (valores finais), T-23 |
| F-04 · Reservas históricas: temporalidade da CPAD ou anonimização | encarregado e arquivo | T-12, T-25 |
| F-05 · Quem vê o nome do solicitante na agenda | responsável e encarregado | T-43 |
| F-06 · Quem, além do gestor da reserva, vê o telefone | responsável | visibilidade institucional (T-26) |
| F-07 · Menores de idade com cadastro aberto | gestão da UESB | RIPD |
| F-09 · Responsável técnico e guardião do registro de incidentes | gestão da UESB | T-16 |
| F-10 · Provedor SMTP, proxy da borda e guarda de logs de acesso; contratos com GitHub e com o provedor de fontes | TI e gestão da UESB | T-13, T-23, T-38 |
| F-11 · O art. 15 do Marco Civil se aplica? | jurídico | confirma a T-20 |
| F-12 · 2FA obrigatório para institucionais e gestores | gestão da UESB | T-30 |
| F-13 · Texto e guarda dos campos livres | encarregado | T-33 |
| F-14 · Conferir os binários de `docs/UniEspaço Web/` | responsável | H-05 e reorganização da pasta |
| Manter diferidas ou antecipar a T-01 e a T-03 | responsável | maior risco do plano LGPD |

### Produto e técnica (responsável)

| Decisão | Destrava |
| --- | --- |
| D-EST-13 e DT-10 · Backup: destino, retenção, cifragem e staging para o ensaio (com a TI) | T-23 |
| D-EST-23 e D-EST-24 · Efeitos do backup parado; liberar a S34 e a S41 a S43 com backup manual | Ondas 3 e 4 |
| D-EST-01 · Rastreador de erros | S45 |
| D-EST-15 · Canal de alerta | S44 |
| DT-13 · CSP e HSTS | T-28 |
| DT-14 · Reparo automático de reservas presas | S35 |
| E1-16 · Quem edita instituições alheias | S46, S48–S50 |
| Perguntas A, B e I6 · Tipo de conta e limites do SMTP | S27 |
| Pergunta C · Exportar a matriz RBAC de produção | S28, S31 |
| Pergunta D · Medir a memória do host de produção | S29 |
| D-EST-21 · Novo critério de "2 releases sem hotfix" (a contagem recomeça na 1.4.4) | saída da Fase 1 da estabilização |
| D-EST-04 e D-8 · Cadência de releases | processo de release |
| D-9 · Institucional sem agendas deve avaliar reservas? | regra de autorização |
| D-6 · Login institucional (@uesb.edu.br), requisito "Must" original ainda sem issue | nova issue |
| D-1 · Multi-instituição | v2 |
| D-2, D-3, D-4 e D-5 · Público do #107; escopo do #46; escopo do #49; ADR do #104 | #107, #46, #49, #104 |
| D-7 e D-EST-05 · Destino do PR #397 | v2 |
| B44 · Papéis acumulados comum e gestor | S14 |
| B39 · O que as rotas `show` removidas devem responder | S65 |
| RR-H3 · Lock consultivo ou restrição de exclusão | RR-H3 |
| RR-D3 · Destino dos horários com data anterior à criação | RR-D3 |

## Gestão do repositório (não é código)

- [ ] Comentar o fechamento das issues #48 e #102 (fechadas sem comentário). A #41 já foi tratada (entrega no #432 comentada no GitHub e label `wontfix` removida). A validação manual com dois navegadores (T6.6) nunca foi registrada.
- [ ] Alinhar as labels: #104 está `P0` (o plano pede ADR antes e deixa fora da 2.0); #107 está `P4` (requisito "Must" original); #98 e #462 estão sem prioridade.
- [ ] As 18 issues do plano de estabilização (`criar-issues.sh`) nunca foram criadas. Este backlog passa a ser a fonte: fechar o milestone vazio "Estabilização v1 — Fase 1" e abrir issue só quando o item entrar em execução.
- [ ] Limpar as 33 branches remotas antigas já absorvidas por `develop`: 14 `fase-*`, 5 `fix/fase-*`, 4 `fix/governanca-eslint-*` e 10 avulsas. Conferir cada uma por conteúdo, não por `git branch -r --merged`: o repo usa squash merge e a maioria nunca teve PR própria (entrou pela branch-mãe). Fora da limpeza: `feat/tickets-module` (PR #397 aberta), `refactor/melhorias-arquitetura-ux-frontend` (commit de 30/10; perguntar ao dono), `docs/v2-0-documentacao-preparatoria` (manter até o E3-01) e `docs/backlog-alinhamento-i18n`.
- [ ] Arquivar os planos locais concluídos (ver [Origem dos itens](#origem-dos-itens)).

> O `Closes #N` não fecha a issue em merge para `develop`; o GitHub só fecha em merge para a branch padrão (`main`). Feche manualmente, com comentário.

## Fora da fila

Resolvidos, cancelados ou obsoletos que ainda aparecem nos planos antigos:

- **GAP-01** · obsoleto: o fluxo mudou e o hook foi removido (fase 07 dos débitos 2026-09).
- **GAP-04** · falso positivo: os e-mails já usam templates Blade desde fevereiro de 2026 (#117).
- **GAP-05** · feito no #432 (filtro de período nas listas de reservas).
- **GAP-02 e GAP-03** · feitos em agosto: a edição regenera os conflitos (commit `554e85a`) e a propagação `recurring` respeita as agendas do gestor (#302).
- **GAP-11** · feito: canais privados por espaço (#338) e recarga das listas por evento (#432). Resta trocar o canal público (S39).
- **#41** · feito no #432 (atualização em tempo real das listas; issue fechada).
- **T-34 e T-42** · cancelados: telefone obrigatório mantido (P-07) e cadastro aberto ao público (P-06).
- **T-04 e T-26 (c)** · feitas no #494 (01/11). A T-26 (a, b) segue na Onda 2.
- **Página de privacidade no release 1.5.0** · decidida em 01/11 pelo responsável: standby, fora do 1.5.0, desligada por padrão (`PRIVACY_PAGE_ENABLED=false`) no #PR-STANDBY. A retomada é o item T-17, T-18 da Onda 2.
- **S13, S15, S25, S40, S55, S62 e S63** · feitos: S13 pela T-04 (o resíduo saiu no #494), S15 e S63 pela T-25, S25 no #469, S40 no #470, S55 pela T-29 e S62 pela T-22.
- **S56** · alerta de expiração do certificado: perdeu o motivo (D-EST-16); reavaliar só se a renovação deixar de ser automática.
- **Recorrência "personalizado"** (auditoria de regras de reserva, H1) · falso positivo: comportamento projetado, documentado em [`regras-de-negocio/recorrencia.md`](./regras-de-negocio/recorrencia.md).
- **Deprecar o `ValidateReservationConflictsJob`** · cancelado: o job continua em uso.
- **Teste de carga do `ShouldBeUnique`** (áreas de foco) · descartado: coberto pelo lock de agenda do #406.
- **B20, B40 e B42** · refutados ou fechados. **DT-12** · resolvido: Laravel 12.70 em produção desde 30/10. **D-EST-21** · prejudicada, porque o trem R2 não aconteceu.
- **Calendário da estabilização v1** (trens R2 a R5 e a meta de 06/11 para a Fase 1) · vencido: o plano parou em 10/10.

## Entregas recentes

Para contexto; o histórico completo está no [`CHANGELOG.md`](../CHANGELOG.md).

- **01/11** · #494 resíduos da Onda 1 do LGPD: logs de autenticação sem parâmetros de acesso (T-04) e setor do gestor no dashboard institucional (T-26 (c)).
- **01/11** · #492 sincronização da documentação e do backlog.
- **01/11** · #491 consolidação da documentação (novo índice, roadmap, docs de domínio alinhados e backlog consolidado).
- **31/10** · #489 LGPD: payloads e logs mínimos, anonimização de conta, limites de taxa, página de privacidade (rascunho) e mensagens traduzíveis. Em staging.
- **30–31/10** · #481, #483 e #487: fronteiras de camadas, correções de UX, acessibilidade, estado vazio e anatomia de página.
- **30/10** · #485 cache de dependências e camadas Docker na CI, com o workflow `cache-warmup.yml` (em PR só de changelog, pula a suíte); #476 dependências; #475 release 1.4.4 em produção.
- **24/10** · #465 hotfix 1.4.3 (PHP 8.4.27); #469 e #470 patches de segurança e Laravel 12.70 (S25, S40); #471 hardening do Docker.
- **05–09/10** · #438 a #459: linha de base verde e onda 1 da estabilização (B1, B4, B7 a B10, B13, B17, B19, B29 a B32, B43, B46).
- **01/10** · #434 HTTP/3 desabilitado no Caddy de produção, mantendo h1 e h2.
- **30/09** · #432 débitos técnicos 2026-09: canal privado por espaço, filtro de período, tempo real nas listas, gate do PHPStan e snapshot do `conflict_cache`.
- **29–30/08** · #403 áreas de foco (relatórios com policy e cache, revalidação de conflitos) e #406 regras de reserva (sobreposição síncrona, lock, datas, auto-aprovação).

## Origem dos itens

Os planos e auditorias ficam fora do git (`docs/auditoria*` e `docs/plano-*` estão no `.gitignore`). O que falta de cada um está acima; o detalhe de execução (briefings, consultas, roteiros) fica no material local.

| Plano | Período | Situação | Itens que sobraram |
| --- | --- | --- | --- |
| Auditoria de issues e backlog anterior | ago/2026 | concluído | #46, #49, #98, #104, #107, GAP-06 a GAP-10 |
| Áreas de foco | 28/08 | concluído (#403) | AF-6.3a, AF-6.3b, S38, DEB-D2 |
| Regras de reserva | 29/08 | concluído (#406) | RR-H2, RR-H3, RR-D3, RR-F01, RR-F04, S36 |
| Débitos técnicos 2026-09 | 24–29/09 | fases 01 a 08 no #432; fase 09 parada | DEB-D2, DEB-A1, DEB-D3, DEB-R4, S39 |
| Board e roadmap | 30/09 | absorvido pela estabilização e pela LGPD | decisões D-1 a D-9 |
| Estabilização v1 | 01–10/10 | parado em 10/10; fase 0 e onda 1 entregues | Ondas 3 a 5 e decisões |
| LGPD | 31/10 | em execução; lote 1 em staging | Ondas 1 e 2 |
| i18n | 31/10–01/11 | plano revisado (rev. 3), não iniciado | Onda 6 |

## Como manter

- Item novo entra na onda certa, com ID, prioridade, esforço e critério de pronto.
- Item concluído sai daqui no mesmo PR que o entrega; atualize a data no topo. O histórico fica no `CHANGELOG.md`.
- Auditoria nova é material de trabalho local; ao terminar, o que falta entra aqui e as regras vivas vão para o documento da área. Ver [`processo/auditorias-e-planos.md`](./processo/auditorias-e-planos.md).
