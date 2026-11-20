# Backlog — UniEspaços

> **Fonte única do que falta fazer.** Consolida os planos e auditorias de agosto a outubro de 2026, conferidos contra o código em 04/11/2026.
> **Base:** `main`, `develop` e produção na v1.7.0 (20/11/2026; `develop` pela sincronização depois do release) · staging na `1.5.0-rc.125` (mesmo código da 1.7.0).
> **Atualizado em:** 2026-11-20.

## Como ler

- **Ordem:** as ondas estão na ordem de execução. A LGPD (Ondas 1 e 2) tem precedência; itens `P1` das Ondas 3 e 4 podem correr em paralelo aos `P3` da LGPD.
- **Prioridade:** `P0` bloqueia o próximo release ou é risco imediato · `P1` alto impacto, próximo ciclo · `P2` importante, planejar · `P3` melhoria · `P4` ideia ou baixo impacto.
- **Esforço:** pequeno (até 1 dia) · médio (alguns dias) · grande (uma semana ou mais).
- **Situação:** marcador no começo do texto do item; o checkbox não muda. 🚀 código pronto = mergeado em `develop`, falta staging ou produção · 🔧 em andamento = trabalho aberto, com a branch citada no item · ⏸ parado = aguarda terceiro, com o motivo · ⏳ aguarda decisão = depende de uma decisão de [Decisões pendentes](#decisões-pendentes-não-é-código) · sem marcador = não iniciado.
- **IDs:** o primeiro é o canônico; depois do `=` vêm os nomes do mesmo item em outros planos. Famílias: `T-xx` plano LGPD · `Sxx` e `Bxx` estabilização v1 · `GAP-xx` lacunas do fluxo de reserva · `#nnn` issue do GitHub · `I18N-*` plano de i18n · `RR-*`, `AF-*` e `DEB-*` sobras dos planos de regras de reserva, áreas de foco e débitos técnicos 2026-09 · `DOC-xx` achados desta consolidação · `QA119-xx` achados do QA da rc.119 (recorrência e edição de reserva) · `UX-xx` achados da análise de UX da solicitação de espaço pelo usuário comum (19/11/2026, [análise](./processo/ux/analise-solicitacao-usuario-comum.md)) · `QA126-xx` achados do QA regressivo da `rc.126` (20/11/2026). Decisões: `F-xx` e `P-xx` (LGPD), `D-EST-xx`, `DT-xx`, `E1-xx` e `Dx` (estabilização e board de 30/09).
- **Segurança:** o repositório é público. Itens de segurança descrevem o objetivo, sem detalhe de exploração; o detalhe fica nos planos locais (ver [Origem dos itens](#origem-dos-itens)).

## Agora

- **Em produção:** v1.7.0 desde 20/11/2026 (Onda 2, parte 2, modernização/acessibilidade, performance e correções de reservas: #548 e #549). Backup manual cifrado pré-deploy (`20/11/2026`) com teste de abertura e cópia externa conferidos; fila vazia antes do deploy; sem migration. Pós-deploy OK: todos os 5 serviços na imagem `1.7.0`, `postgres:16.15` saudável e não recriado, `StopSignal` `SIGQUIT` (`app`) e `SIGTERM` (`scheduler`/`reverb`/`queue-worker`), `app:check-env` calibrado com `0 falhas` e `1 aviso` (`session_encrypt`, após rotação da credencial do banco), `config('retencao')` em `90/90/90/90/1/7/90` e `LOG_DAILY_DAYS=90` efetivos (`T-19g`), `fotos:reprocessar` concluído (`1` em ordem, `0` a reprocessar, `T-31`), `base:anonimizar --dry-run` recusado em `production` com saída `1` (`T-41`), tabelas do Telescope com `0` linhas (`T-19c`), `jobs=0`, `0` novos `failed_jobs` (os `8` existentes são de `22/10` a `13/11`), `0` erros em `storage/logs/` após o deploy e validação pública em `https://uniespacos.uesb.br` OK (fontes 100% locais `T-38`, chunks Vite e 0 erros de Console). Higiene no servidor concluída em 20/11/2026: `T-05b` executada (~5 GB liberados em disco, de 55% para 42%), backups manuais anteriores à `1.5.0` e à `1.6.0` (e dumps em texto plano na home) destruídos com `shred` (`T-23`), e `storage/backups/` tratado pelo responsável.
- **Em staging:** `1.5.0-rc.125`, mesmo código da `1.7.0` (sincronização pós-`1.7.0` via #550 e #551).
- **PR pronta para staging:** [#536](https://github.com/uniespacos/uniespacos/pull/536) (`feat/ux-solicitacao-usuario`, reconciliada em 20/11/2026 sobre a `develop` pós-`1.7.0`), com a solicitação de espaço pelo usuário comum (`UX-01` a `UX-17`, na Onda 7), preservação dos ajustes da `1.7.0` (#538, #540, #544) e correção do PHPStan nível 9.
- **Próximo passo:** após autorização do responsável, mergear a PR #536 em `develop` e publicar em staging; conferir após `03:30 UTC` de `21/11/2026` a primeira rodada da retenção em produção (`tokens_redefinicao = 0`), executar o smoke autenticado por papel em produção se ainda pendente, decidir sobre a limpeza das `104` reservas `QA%` em staging (`QA119-F3`), decidir sobre o nível de log da parada do `AgendadorLoop` (`T-19d`) e as lacunas `QA4-A11Y-01`, e seguir com a **Onda 3, parte 2** (e `T-23` aguardando a resposta da TI).
- **Verificações e passos agendados** (em ordem de data; quem pede uma verificação com data confere a data atual antes):

  | Data ou gatilho | O que fazer | Quem | ID |
  | --- | --- | --- | --- |
  | 21/11/2026 (após 03:30 UTC) | Rodar `retencao:aplicar --dry-run` em produção e confirmar que os 13 tokens de redefinição vencidos foram podados (`tokens_redefinicao = 0`) | Responsável | T-19c / T-19g |
  | Quando o responsável executar (sem data) | Smoke autenticado por papel em produção e limpeza das reservas `QA%` de staging (`104` registros, incluindo `#3687`, `#3697`, `#3771`–`#3792`), se autorizada | Responsável | QA119-F3 |
  | Quando o responsável decidir (sem data) | Decidir se `AgendadorLoop` eleva o nível de log de `agendador.parada_*` (hoje `Log::info`, suprimido por `LOG_LEVEL=warning` em staging e produção) | Responsável | T-19d |
  | Quando a TI responder (sem data) | Registrar a resposta sobre o prazo dos snapshots da VM, o destino institucional das cópias externas e o uso de staging para o ensaio de restauração | Responsável com a TI; o master registra | T-23 |
  | Depois do deploy com a #536 em staging e em produção (sem data) | Conferir que o `queue-worker-production` subiu com a imagem nova (`docker inspect queue-worker-production --format '{{.State.StartedAt}}'`, em UTC, depois do horário do deploy) e que a migration `2026_11_19_120000` foi aplicada, sem pendência. O `queue:work` não relê código | Responsável | UX-01 a UX-17 |
  | 02/05/2027 | Revisar o prazo do snapshot de auditoria: renovar com justificativa anotada ou destruir | Responsável | T-05 |

- **Parado:** trilha de backup (T-23), aguardando a TI · remoção do fallback da `RelatorioPolicy` (DEB-D2), aguardando consulta em produção.
- **Decisões que mais destravam:** pessoa do encarregado (F-01), rito e prazo de atendimento ao titular (F-08), F-05, F-06 e as perguntas da TI (T-23). Lista completa em [Decisões pendentes](#decisões-pendentes-não-é-código).

## Próximas versões (previsão)

Decidido pelo responsável em 04/11/2026: o código de cada onda sai numa PR única (branch de integração `feat/onda-N-<tema>`), e a PR de atualização do backlog também sai por onda. Cada onda vira uma versão minor, na ordem em que fechar: a que fechar primeiro leva a próxima minor (o release-please numera pela ordem de merge). Regra completa em [`processo/auditorias-e-planos.md`](./processo/auditorias-e-planos.md#backlog-reativo).

- **1.6.0** (em produção desde 05/11/2026): Onda 2, parte 1. #505, #507 e #509 (T-19, T-19b, T-20, T-21 e T-26 (a, b, d, e)).
- **1.6.1** (em produção desde 14/11/2026; Onda 3, parte 1; branch `feat/onda-3-estabilidade`, #518): S26 e S14. É patch, não minor: a parte só tem `fix`. Decidido pelo responsável em 06/11/2026: fecha antes da Onda 2 parte 2, com o número que o release-please gera, sem forçar a versão.
- **1.7.0 (em produção desde 20/11/2026)**: Onda 2, parte 2 (#525, #527, #529, #531, #534, #538, #540, #542, #544–#549). T-31, T-31c, T-35, T-41, T-19c/d/e/g/h/i, T-38, T-46, T-29 (parte a + T-29b), modernização/acessibilidade de frontend, performance e correções do fluxo de reservas. Ficam para depois da 1.7.0: T-29c, T-19f e T-35b.
- **Onda 3, parte 2 (mesma branch de integração, depois da 1.6.1)**: S42, S17, S33, S34/S35, S14b, S14c e S14d. Sai como patch se tiver só `fix`.
- **Depois:** Ondas 4, 5, 6 e 7, em ordem, uma minor por onda. Os itens que dependem de decisão institucional entram na minor da onda quando a decisão sair.
- **Aviso:** o release-please só gera versão com `feat` ou `fix`. A minor só sai se a onda tiver `feat`; uma onda só com `fix` gera patch.
- **Ordem:** a Onda 2 (parte 2) e a Onda 3 andam em paralelo. A Onda 3 parte 1 fechou primeiro, como 1.6.1 (14/11/2026); a Onda 2 parte 2 saiu como 1.7.0 (20/11/2026), e a `develop` volta a receber PR de código depois da sincronização `main` → `develop` (esta PR). Regra geral: enquanto uma versão estiver em staging aguardando produção, nenhuma PR de código entra na `develop` antes da PR `develop` → `main`.
- **Forçar versão:** se um dia for preciso, só com `release-as` no `release-please-config.json` (produção), removido depois do release. Nunca com rodapé `Release-As:` em commit: ele chega também ao release-please de staging, que pode criar na `develop` uma tag sem sufixo, e essa tag dispara o deploy de produção.

---

## Onda 1 — LGPD (concluída)

Concluída em produção: `T-05` tratada em 02/11/2026; `T-05b` (remoção segura dos logs brutos e das cópias do snapshot no servidor, liberando ~5 GB) e `T-08` (leitura agregada em produção sem abrir dados) concluídas em 20/11/2026 com a `1.7.0`. Revisão da guarda externa da `T-05` marcada para `02/05/2027` em [Agora](#agora).

## Onda 2 — LGPD: próximo lote (`P1`–`P3`)

**Código**

- [ ] **T-41** · Em produção na `1.7.0` (recusa em `production` confirmada; falta processo de uso e conferência em base não produtiva) · Comando de anonimização para bases não produtivas — `P2` · médio · lgpd
  Recusa rodar em produção. Prepara a T-01 e a T-03.
  **Em produção na `1.7.0` (#525, 20/11/2026):** comando `base:anonimizar`, com tratamento por tabela, uma transação só, lotes e um teste que exige toda tabela classificada. Roda só em local, development, staging e testing; em produção é recusado, mesmo com `--dry-run` (guarda confirmada em staging e em produção em 20/11/2026: recusado com código `1`). Uso e tabela de tratamento em [`operacao/anonimizacao-de-bases.md`](./operacao/anonimizacao-de-bases.md). Falta o processo de uso: quando rodar, quem autoriza e como conferir o resultado sem expor dado pessoal.
  **Ajuste de escopo (decisão do responsável, 06/11/2026):** `espacos.descricao` e `roles.description` não são mais anonimizadas. São conteúdo institucional e mantêm a cópia realista para testes; as tabelas `espacos` e `roles` estão em "sem dado pessoal" no config. **Confirmações do responsável (06/11/2026):** staging fica na lista de ambientes permitidos; apagar os favoritos (`espaco_user`) está ok; as descrições institucionais ficam como estão.
  **Pronto quando:** o processo de uso está aprovado pelo responsável e a execução numa base não produtiva foi conferida.
- [ ] **T-44** · Teste transversal de privacidade das páginas na CI — `P2` · médio · teste
  Depende do que ainda falta da T-26: a visibilidade do telefone para institucionais (F-06).
- [ ] **T-19d** · Em produção na `1.7.0` (parada validada em staging e sinais conferidos em produção; pendente decisão sobre `LOG_LEVEL`) · Parada limpa do agendador sem cortar a rodada de retenção — `P3` · pequeno · operação
  O `schedule:work` não trata o sinal de parada, e o Docker encerra o processo à força depois de 10 s (saída 137). Sem efeito quando nada está rodando (foi o caso em 05/11). Mas um deploy (que recria o container) ou uma parada do agendador durante a rodada das 03:30 UTC corta a retenção no meio e pode deixar a trava de sobreposição (`withoutOverlapping`, validade padrão de 24 h) ativa, o que pode pular a rodada seguinte.
  Achado em 05/11/2026.
  **Em produção na `1.7.0` (#525 + #542, 20/11/2026):** o serviço `scheduler` de produção roda `agendador:executar`, que não dispara rodada nova ao receber sinal de parada, espera as rodadas em curso até `--teto-parada` (padrão 100 s) e sai com 0. O serviço tem `stop_grace_period: 2m` e `stop_signal: SIGTERM` (tratando `SIGTERM`, `SIGINT` e `SIGQUIT`). A trava de sobreposição da retenção expira em 60 minutos (antes, 1440). O compose de desenvolvimento segue com `schedule:work` (ver OP-02).
  **Verificações em staging (`rc.124`) e produção (`1.7.0`, 20/11/2026):** sinais conferidos nos dois ambientes (`app` = `SIGQUIT`; `scheduler`, `reverb` e `queue-worker` = `SIGTERM`); em staging, `docker stop scheduler-production` no segundo `:00` encerrou em `0.529 s` com `ExitCode=0`, `cache_locks=0` e ciclo seguinte normal. **Observação:** `AgendadorLoop` grava `agendador.parada_solicitada` e `agendador.parada_concluida` via `Log::info`, suprimidos quando o ambiente usa `LOG_LEVEL=warning` (caso de staging e produção; decidir se eleva para `notice`/stdout).
  **Risco de rollback:** imagem antiga com o compose novo deixa o scheduler em loop de restart, porque o comando não existe nela. O rollback reverte imagem e compose juntos. Imagem nova com compose antigo funciona.
  **Pronto quando:** a emissão dos registros `agendador.parada_*` no nível de log do ambiente está decidida.
- [ ] **T-19f** · Pastas de armazenamento e logs no host podem ter dado pessoal fora da retenção e do `base:anonimizar` — `P3` · pequeno · lgpd
  O `storage/logs` pode conter dado pessoal. O `base:anonimizar` só avisa sobre ele e não apaga. **Levantamento em produção (`1.7.0`, 20/11/2026):** `storage/app/public/` possui apenas `avatars/` e `espacos_images/` (sem outras pastas com fotos de pessoas); `storage/backups/` tratado em 20/11/2026 (ver `T-23`). Falta registrar o tratamento de cada diretório no inventário de dados (rascunho fora do git até a T-14).
  **Pronto quando:** o tratamento de `storage/logs` e `storage/backups` está decidido e registrado no inventário de dados.

**Operação de produção (um arquivo por vez)**

- [ ] **T-06** · Endurecer o script de deploy contra configuração ausente — `P1` · pequeno · segurança
  Precisa de janela combinada (DT-08). Achado em 05/11/2026: a mensagem final do script de deploy diz "Staging deployment finished successfully!" também no deploy de produção; corrigir junto. = A-07, A-12, A-21, B22.
- [ ] **T-35b** · Chamar o `app:check-env` no deploy só como aviso — `P3` · pequeno · segurança
  Depois da T-35, na mesma janela da T-06. Só imprime o resultado do comando no log do deploy; não usa `--estrito` e não bloqueia o deploy. Achado em 06/11/2026.
  **Pronto quando:** o deploy mostra o resumo do `app:check-env` e continua mesmo com FALHA.
- [ ] **T-23** · Cópias de segurança cifradas, com retenção, cópia externa e restauração testada — `P1` · grande · operação · ⏸ parado
  Aguarda a conversa com a TI, que deve responder: prazo de guarda dos snapshots da VM (que guardam cópias antigas dos logs; vindo da T-05, sem bloqueá-la), destino institucional para cópias externas e uso de staging para o ensaio de restauração.
  **Guarda dos dados da T-05 (decisões de 02/11):** o snapshot de auditoria tem como finalidade servir de prova, caso um titular, a ANPD ou a UESB questione a limpeza da T-05. Prazo: até 02/05/2027, quando o responsável renova com justificativa anotada ou destrói. Ele fica cifrado e com o responsável; o arquivo é cifrado antes de sair do servidor e vai para um provedor de nuvem, que entra como operador de armazenamento (T-13). Só o responsável tem a senha. O backup manual anterior à 1.5.0 (a cópia do servidor e a cópia fora do servidor, com o responsável) fica até o próximo backup conferido e então é destruído. Como essa cópia externa é dado pessoal fora da infraestrutura institucional, ela precisa de lugar institucional.
  **Cifragem confirmada (02/11):** o responsável confirmou que o backup manual anterior à 1.5.0 foi cifrado antes de sair do servidor. Os dois arquivos (snapshot e backup manual) vão cifrados do lado do responsável.
  **Status (02/11):** a mensagem com as três perguntas à TI foi entregue ao responsável para envio. Aguarda resposta.
  **Falta:** lugar institucional para essa guarda (com a TI), prazo dos snapshots da VM e destino das cópias externas. Seguem em aberto as decisões T-12, T-13, D-EST-13, D-EST-23, D-EST-24 e DT-10. Até lá: backup manual antes de cada deploy, e restauração automática pelo script de rollback proibida. Em 20/11/2026: backups manuais anteriores à `1.5.0` e à `1.6.0` (e dumps em texto plano soltos na home) destruídos com `shred`; backup manual cifrado pré-`1.7.0` (`20/11/2026`) com teste de abertura e cópia externa conferidos (mantido junto com o pré-`1.6.1`); `storage/backups/` tratado pelo responsável. = D-EST-22, S16, S22, S23, S51, S71, B21, B22, B74, E1-26 a E1-28, A-07.
- [ ] **T-28** · Cabeçalhos de segurança e compressão na borda — `P2` · pequeno · segurança
  Depende da DT-13 (CSP e HSTS). = S54, DT-13, A-20, B24, B67.
- [ ] **T-37** · Reduzir o escopo de variáveis e volumes por container — `P2` · pequeno · segurança
  = S67, E2-20, A-21, B27.

**⏳ Aguardando decisão institucional** (ver [Decisões pendentes](#decisões-pendentes-não-é-código))

- [ ] **T-17, T-18 (retomada)** · Retomar a página de privacidade: levantamento de design e redesenho — `P2` · médio · produto/UI · depende do texto final (T-10, T-17, T-18 / F-01)
  Página em standby desde 01/11, por decisão do responsável: os termos estão minimamente adequados, mas a UI/UX ficou desarmônica com o design do sistema. Detalhe e condição de retomada em [`privacidade/pagina-de-privacidade.md`](./privacidade/pagina-de-privacidade.md). Primeiro passo, antes de qualquer redesenho: levantar o que já existe no projeto (tokens Catppuccin do `@theme`, átomos, moléculas e templates em `resources/js/presentation`, primitivos shadcn em `resources/js/components/ui`, e os padrões de anatomia de página e estado vazio do #487) e redesenhar a partir desse levantamento.
  **Pronto quando:** o levantamento de design está registrado no documento da área; a página está redesenhada com o texto final aprovado; com `PRIVACY_PAGE_ENABLED=true` em staging, a página, os links e o e-mail passam nos testes e no roteiro.
- [ ] **T-14, T-16** · Versionar o inventário de dados e o runbook de incidente em `docs/privacidade/` — `P2` · pequeno · docs
  Rascunhos prontos, fora do git; aguardam aprovação e a definição de papéis (T-10). O RIPD (T-15) e o registro de incidentes continuam fora do git.
- [ ] **T-39, T-40** · "Meus dados": consulta e solicitações do titular — `P2` · médio · lgpd · depende da T-12 e da F-08
  Canal decidido em 08/11/2026: o e-mail do próprio sistema (`uniespacos@uesb.edu.br`). O controlador é a UESB, que responde ao titular por esse e-mail. Os autores e responsáveis pelo sistema são o Professor Dr. Agnaldo Volpe Lovato e o graduando de Sistemas de Informação Pedro Henrique Pinheiro Lemos. Falta o rito e o prazo de resposta (F-08), e a designação formal do encarregado pela UESB (art. 41, F-01).
- [ ] **T-43** · Quem vê o nome do solicitante na agenda — `P2` · depende da F-05
- [ ] **T-10 a T-13** · Encarregado, bases legais, tabela de temporalidade e operadores — decisões institucionais
  Operador de armazenamento registrado em 02/11 (T-13): o provedor de nuvem que guarda o snapshot de auditoria da T-05 e o backup manual anterior à 1.5.0. A transferência é internacional (art. 33). Snapshot de auditoria e backup manual vão cifrados do lado do responsável, o que mitiga a transferência.
  **Prazo de guarda (decidido pelo responsável em 08/11/2026, F-03):** 90 dias para todas as categorias. O destino padrão da rotina atual é eliminar (a rotina apaga). Os padrões do código foram alinhados a 90 dias na 1.7.0 (em produção desde 20/11/2026, com `LOG_DAILY_DAYS=90` efetivo).

**Diferidas pelo responsável**

- [ ] **T-01, T-03** · Ambientes de desenvolvimento só com dados sintéticos ou anonimizados — `P1` · médio · lgpd · diferida (P-11)
  É o maior risco do plano LGPD; vale reavaliar a data. A T-41 está em produção na `1.7.0`; falta o processo de uso ([anonimização de bases](./operacao/anonimizacao-de-bases.md)). = A-01, A-02, R-P01.
- [ ] **T-33** · Orientação de privacidade nos campos de texto livre — diferida (P-14)

**Complementares**

- [ ] **T-45** · Trilha de ações administrativas sobre dados pessoais — `P3` · médio · lgpd · depende da T-12 (ver também a GAP-10).
- [ ] **T-29c** · Tempo de resposta neutro na recuperação de senha — `P3` · médio · segurança
  No "esqueci a senha" e na redefinição, o tempo de resposta ainda varia conforme a conta existe, por causa do broker de senhas do Laravel. Corrigir depende de estender o broker. Resíduo da T-29 (parte a e T-29b entraram em produção na `1.7.0` via #525).
  **Pronto quando:** a medição de tempo entre conta existente e inexistente fica dentro de uma faixa definida, com teste ou roteiro registrado.
- [ ] **T-47, T-48** · Revisões periódicas e métricas de prestação de contas — `P3` · tarefa humana e recorrente · dependem da T-15, da T-10 e da T-16.

## Onda 3 — Estabilidade e segurança da v1 (`P1`)

- [ ] **S42** · Revisar a configuração de proxies confiáveis (borda e aplicação) — `P1` · pequeno · segurança
  = B28, E1-35, D-EST-17.
- [ ] **S17** · Congelar o relógio nos testes que dependem da data real — `P2` · médio · teste
  Habilita a S33 e a S36 (a S26 entrou no #518 sem depender dela). 18 arquivos de teste PHP usam `now()` ou `today()` sem congelar (contagem de 04/11/2026); o workflow diário em `develop` só pega a falha depois que ela acontece. = B63.
  **Pronto quando:** existe um trait de congelamento em `tests/Concerns/` e a suíte passa em duas datas simuladas (dia 31 e dia 1).
- [ ] **S33** · Separar erro de domínio, erro transitório e erro pós-commit nos jobs — `P1` · grande · bug
  Decisão tomada: `tries=1` em `ProcessarCriacaoReserva` (I8). Depende da S17 (a S26, da qual também dependia, entrou no #518). = B15, B61, E1-18.
- [ ] **S14b** · Conferir o dono atual antes de reatribuir uma agenda a outro gestor — `P3` · pequeno · segurança
  Ao salvar as agendas de um gestor, uma agenda que já pertence a outro gestor pode mudar de dono sem aviso a quem a tinha. Comportamento anterior à S14. **Objetivo:** a troca de dono de agenda é explícita e o gestor anterior é avisado. Achado em 04/11/2026. Reproduzido no teste da S14 em staging (06/11/2026): uma agenda escolhida por engano no modal passou para a conta de teste sem nenhum aviso (estava sem gestor, sem prejuízo). Até a correção, quem usa o modal confere a agenda antes de salvar.
- [ ] **S14c** · A factory de espaço atribui o papel de gestor como efeito colateral — `P4` · pequeno · teste
  Isso deixava testes de permissão instáveis (o usuário do teste ganhava gestor antes da requisição). Isolar o efeito para quem precisa dele. Achado em 04/11/2026.
  **Reforço (19/11/2026):** a mesma factory promove a gestor um usuário existente sorteado, e isso causou falha intermitente num teste do fluxo de solicitação. Pronto quando a factory cria gestor próprio, sem sortear usuário existente.
- [ ] **S14d** · Aplicar no modal de permissões a regra "gestor só com agenda vinculada" — `P2` · pequeno · bug
  **Decidido pelo responsável em 08/11/2026 (B44):** o acúmulo de papéis é estado válido e não se normaliza. Regra: o usuário só é gestor se tiver ao menos uma agenda vinculada. Quem acumula papéis sem ser gestor vira gestor ao receber agenda. Quem é comum e gestor e perde todas as agendas perde o papel de gestor. A seleção múltipla de papéis no modal não foi decidida e fica em aberto (pendência menor deste item).
  **Achado no código (08/11/2026):** o vínculo pelo espaço (`EspacoService`) já segue a regra. O modal (`UserService::updatePermissions`, `atualizarPapelUnico` e `atualizarAgendasDeUsuarioComPapeisAcumulados`) não segue: (a) com papel único `gestor` e lista de agendas vazia, continua gestor; (b) com papéis acumulados que incluem `gestor`, ao perder todas as agendas continua gestor; (c) com papéis acumulados sem `gestor`, não vira gestor ao receber agenda. Regra de negócio em [autorização](./regras-de-negocio/autorizacao.md#decisão-sobre-papéis-acumulados).
  **Pronto quando:** no modal, perder a última agenda tira o papel de gestor, e a notificação de remoção sai depois do commit; receber agenda dá o papel de gestor, inclusive para quem acumula papéis; há testes de feature para os três casos.
- [ ] **S34, S35** · Alinhar os timeouts da fila e reparar reservas presas — `P2` · médio · bug
  Alvo: `retry_after` maior que o timeout do worker, que é maior que o dos jobs. Hoje os tempos estão invertidos: o job tem 360 s, e o worker e o `retry_after` têm 90 s. Começo parcial: o comando de reparo existente só cobre validações pendentes, não todos os estados presos. Depende da S33; a parte automática depende da DT-14. = B16, E1-19, E1-20.
- [ ] **QA119-F4** · Falha da edição de reserva não aparece na tela — `P2` · pequeno · observabilidade/UX
  Quando o `UpdateReservaJob` falha depois das retentativas, o solicitante só recebe a `ReservationUpdateFailedNotification`. Na tela, o botão segue em "Atualizando…" e nada indica a falha (achado do QA da rc.119). Relacionado à S33, que trata os erros dos jobs.
  **Pronto quando:** a tela da reserva mostra o estado de falha da edição sem depender da notificação, e um teste de feature cobre o caminho de falha.
- [ ] **QA126-01** · 🔧 em andamento (branch `fix/qa126-melhorias-pos-qa-rc126` — código e testes prontos, aguardando PR e revalidação de `AUT-02` e `ESP-02` em staging) · Links `http://` em staging no redirect pós-login e na paginação — `P1` · pequeno · infra + backend
  `AppServiceProvider` só forçava `URL::forceScheme('https')` quando `APP_ENV=production`, e o `Paginator::currentPathResolver` usava `$request->url()` (que lia `X-Forwarded-Proto: http` do `Caddyfile.staging`). Passa a forçar HTTPS, alinhar o `Paginator::currentPathResolver` com `URL::current()` e normalizar `url.intended` no `CustomLoginResponse` sempre que `config('app.url')` começar com `https://` (ou em `production`).
  **Pronto quando:** teste de feature garante rotas, paginação e redirect de login em `https://` com `APP_URL=https://...`, e `AUT-02` / `ESP-02` passam em staging.
- [ ] **QA126-02** · 🔧 em andamento (branch `fix/qa126-melhorias-pos-qa-rc126` — código e testes prontos, aguardando PR e revalidação de `GES-02` em staging) · Selo "Deferida" incorreto no card de avaliação dos gestores para reservas indeferidas ou parciais — `P1` · pequeno · frontend
  `AvaliacaoGestoresResumo.tsx` exibia sempre "Deferida" (verde) quando `avaliados === total`. Passa a contar `deferidos` e `indeferidos` por agenda, exibindo "Deferida" (verde), "Indeferida" (destrutivo), "Parcialmente deferida — X/Y" (âmbar) ou "Em Análise — X/Y".
  **Pronto quando:** o selo reflete a situação real nos 4 cenários (todos deferidos, todos indeferidos, misto e em análise), com chaves em `pt-BR`/`en`/`es`, teste unitário dedicado e revalidação de `GES-02` em staging.
- [ ] **QA126-03** · 🔧 em andamento (branch `fix/qa126-melhorias-pos-qa-rc126` — código e testes prontos, aguardando PR e revalidação de `REL-02`/`REL-03` em staging) · Exportação CSV de relatórios com `Content-Type` incorreto — `P1` · pequeno · backend
  `CsvExporter` chamava `Excel::download(..., Excel::CSV)` sem cabeçalhos explícitos; como o `BinaryFileResponse` inferia o MIME a partir de um arquivo temporário sem extensão `.csv`, o cabeçalho saía como `text/plain` localmente e `text/html` em staging. Passa a enviar `['Content-Type' => 'text/csv; charset=UTF-8']`, mantendo `use_bom = true` (`config/excel.php`) para leitura UTF-8 com acentuação no Excel.
  **Pronto quando:** `CsvExporter` envia `Content-Type: text/csv; charset=UTF-8` com BOM UTF-8 ativado, há teste de feature para gestor e institucional validando cabeçalhos e acentuação, e `REL-02`/`REL-03` passam em staging.

## Onda 4 — Regras de negócio e segurança (`P2`)

- [ ] **S37** · Usuário sem setor: resolução segura da instituição e aviso para completar o perfil — `P2` · pequeno · bug
  Há acessos a `setor->unidade` sem proteção para nulo (erro 500 latente). Decisão tomada: middleware de setor com 403 explicativo (D-EST-03). = B2, E1-02, E1-03.
- [ ] **S38** · Endurecer o escopo padrão dos relatórios para contas sem vínculo organizacional completo — `P2` · médio · segurança
  Negar por padrão quando o escopo não puder ser determinado. Depende da S37 (e da S36). = B5, E1-08.
- [ ] **S36** · "Hoje" no fuso de negócio (America/Bahia) nas regras de data — `P2` · médio · bug
  À noite, o usuário pode não conseguir reservar para o próprio dia, porque a validação usa UTC. Decisão tomada: regras em America/Bahia, armazenamento em UTC (D-EST-02). Depende da S17. = B3, E1-04.
- [ ] **RR-H3** · Fechar a brecha de reserva dupla sob concorrência — `P2` · médio · bug
  O lock só alcança linhas que já existem e não há restrição no banco; duas criações simultâneas no mesmo horário vazio podem passar. **Abordagem decidida pelo responsável em 08/11/2026:** lock consultivo do PostgreSQL (advisory lock) por agenda e dia.
  **Pronto quando:** um teste com duas conexões reais não grava dois horários deferidos sobrepostos.
- [ ] **B69, B71, B72** · Revisar validação e autorização dos FormRequests de atualização (espaço, módulo, unidade, instituição) — `P2` · médio · segurança
  Testes de caracterização primeiro (S30).
- [ ] **S41** · Endurecer os workflows de deploy (verificação de host, versões fixadas, origem da imagem) — `P2` · pequeno · segurança
  Inclui unificar os Caddyfiles e corrigir o `workflow_dispatch` de staging, que implanta a imagem da última RC em vez da branch escolhida (B79). Depende da D-EST-24. = B68, B79, E1-33.
- [ ] **S46 → S48–S50** · Isolamento por instituição nas operações de escrita: ADR e implementação — `P2` · grande · segurança
  Hoje há uma instituição ativa; é requisito do gate da v2. Depende da decisão E1-16 (quem edita instituições alheias). = B6, E1-16, E2-A, A-16, A-26.
- [ ] **S39** · Atualizações em tempo real de reservas só por canais privados autenticados — `P3` · médio · segurança
  Relacionado (achado em 04/11/2026): o hook do canal público só recarrega as listas para `created`, `validated` e `evaluated`; `updated` e `canceled` são publicados pelo backend, mas não atualizam a tela. Decidir junto com a troca do canal.
  Remove o canal público `reserva-channel` e o listener morto. Decisão tomada: canal privado por usuário. Depende da S26. = B14, E1-15, B66.
  **Avanço (#527, 14/11/2026):** o canal privado Echo passa a persistir entre navegações Inertia. O canal público `reserva-channel` ainda existe no código (em `ReservaEvent` e em `use-reservation-live-updates`) e segue como pendência.
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
  `EspacoService` (S18), `ConflictDetectionService` (S19), `NotificationController` (S20), exportações PDF, XLSX e CSV (S24; hoje só existe um teste mínimo de exportação em PDF), CRUD de espaços (S30), de instituição e unidade (S32), de módulo e setor (S47). Junto: B77 (editar espaço renotifica gestores; confirmar na S18) e B73 (exclusão de instituição sem erro tratado; na S32). É gate da v2. = E2-10 a E2-17.
- [ ] **AF-6.3b** · Testes de conteúdo dos 4 tipos de relatório — `P3` · médio · teste · depende da S38
- [ ] **S57, S58** · Factories autossuficientes e CI só com seeders de produção — `P3` · médio · teste
  Desde 31/10 (#489), os seeders de desenvolvimento só rodam em local, development e testing. A CI ainda roda os seeders de desenvolvimento.
  = B38, B52, I11.
- [ ] **QA119-D1** · Parâmetro `edited_week_date` sem efeito nos testes de `UpdateReservaJobTest` — `P4` · pequeno · teste
  O padrão `dados(...) + ['edited_week_date' => X]` não muda nada, porque o `+` mantém a chave da esquerda (o helper já define `edited_week_date`). Usar o parâmetro `$semanaEditada` do helper. Achado do QA da rc.119.
  **Pronto quando:** os casos de escopo `single` informam a semana pelo parâmetro do helper, e a suíte segue verde.

**Operação**

- [ ] **S21, S71** · Runbooks versionados de deploy, rollback, hotfix, sincronização `main` → `develop` e restore — `P2` · médio · docs
  Não há nenhum (o hotfix 1.4.3 foi feito sem). Base: REGRAS §3 do plano de estabilização (arquivo local). Destino: `docs/operacao/`. O restore depende da T-23. = E2-D, B65.
- [ ] **OP-01** · Numeração das release candidatas de staging parada na 1.5.0 — `P4` · pequeno · operação
  O manifesto do release-please de staging (`develop`) não acompanha as versões de produção: com a 1.6.0 em produção, staging segue em `1.5.0-rc.N` (a 1.6.1 foi para staging como rc.114), porque no modo de pré-release cada `feat` ou `fix` só aumenta o número da rc. Não quebra deploy, mas a tag de staging não diz qual versão está sendo testada. **Pronto quando:** depois de cada release em produção, a numeração de staging parte da versão seguinte (por exemplo, na PR de sincronização `main` → `develop`), com a regra escrita no runbook (S21, S71). Achado em 06/11/2026.
- [ ] **OP-02** · Conferir o pcntl e alinhar o compose de desenvolvimento com o de produção, para exercitar o `agendador:executar` localmente — `P4` · pequeno · operação
  O Dockerfile do `php-fpm` de desenvolvimento já instala a extensão pcntl, mas o compose de desenvolvimento segue com `schedule:work`. Conferido em 06/11/2026: o container `app` em uso tem pcntl, e os containers `scheduler` e `workspace` não têm (o `scheduler` foi construído antes do Dockerfile atual; o `workspace` usa outro Dockerfile). Reconstruir o `scheduler` de dev e, se for útil, trocar o comando dele para `agendador:executar`. Achado em 06/11/2026.
  **Pronto quando:** `agendador:executar` roda no container de dev e sai com 0 ao receber SIGTERM durante uma rodada.
- [ ] **QA119-F3** · Conferir e limpar as reservas de teste do QA em staging — `P4` · pequeno · operação
  Conferência até a `rc.124` concluída (20/11/2026): existem `104` reservas `QA%` em staging (incluindo `#3687`, `#3697`, `#3771`–`#3790`, `#3791` `QA4 PERF-02` e `#3792` `QA4 RES-02`). As reservas com título "QA ..." saem de staging só com autorização do responsável. Verificação na tabela de passos agendados.
  **Pronto quando:** a limpeza tem a autorização do responsável registrada e foi executada.
- [ ] **QA4-A11Y-01** · Completar paridade de `PasswordInput` e `aria-describedby` em `/settings/password` e `/register` — `P3` · pequeno · acessibilidade
  Achado no QA pré-`1.7.0` (`UI-02` em staging `rc.124`, 20/11/2026): `/settings/password` usa `<Input type="password">` sem toggle mostrar/ocultar (`aria-pressed`), e `RegisterStepPersonal` não passa `aria-invalid`/`aria-describedby` nos campos `name`/`email`/`phone` (diferente de `/login`, `/forgot-password`, `RegisterStepCredentials` e `/settings/password`).
  **Pronto quando:** `/settings/password` usa `PasswordInput` e `RegisterStepPersonal` vincula `aria-invalid`/`aria-describedby` aos respectivos `InputError`, com testes atualizados.
- [ ] **S27** · Limite de taxa, teto diário e retentativa dos e-mails de notificação — `P2` · médio · bug
  O backoff já existe (#451). Depende das perguntas A e B (tipo de conta SMTP) e da I6. = B47.
- [ ] **S29** · Limites de upload e pool do php-fpm na imagem de produção — `P2` · pequeno · operação
  Produção usa os limites padrão do PHP, abaixo do limite que a aplicação valida. Depende da pergunta D (memória do host). = B18, B75, DT-07, E1-22.
- [ ] **S28, S31** · Retrato do RBAC de produção versionado, paridade dos seeders na CI e catálogo de permissões do front — `P3` · médio · débito técnico
  O catálogo do front (`resources/js/constants/permissions.ts`) já tem os 4 tipos de relatório e `secao.relatorios`, mas faltam `relatorios.escopo-agendas` e `relatorios.escopo-instituicao`. Depende da pergunta C (exportar a matriz de produção). = B11, B12, E1-09, E1-10.

**Débitos técnicos e limpeza**

- [ ] **S64** · Reduzir as supressões do ESLint, com ratchet — `P3` · médio · débito técnico
  Reconferido em 01/11: 73 supressões em 33 arquivos no `eslint-suppressions.json` (`npm run lint:debt`), mais 6 `eslint-disable` inline: 5 `eslint-disable-next-line` em dois arquivos de teste (`hooks/use-espaco-live-updates.test.ts` e `presentation/pages/Espacos/VisualizarEspacoPage.test.tsx`) e 1 `/* eslint-disable */` em `ssr.tsx`.
  Detalhe, DEB-L1: quitar as 24 supressões de `prefer-nullish-coalescing` em 12 arquivos (pequeno). Trocar `||` por `??` muda o comportamento com string vazia; refazer a partir do `lint:debt`, caso a caso. Uma branch antiga com a tentativa existe, mas está defasada demais para reaproveitar.
- [ ] **DEB-L2** · `LoginRequest` e `AuthenticatedSessionController` são código morto — `P4` · pequeno · débito técnico
  Nenhum código usa as duas classes além delas mesmas; as rotas que as usavam estão dentro de um bloco comentado em `routes/auth.php`. O login real é o do Fortify. Remover junto com a S65, que cobre o resto de `Auth/` (conferir antes, porque o arquivo de rotas tem outras partes). Achado em 06/11/2026.
- [ ] **DEB-R4** · Reduzir o baseline do PHPStan — `P4` · grande · débito técnico
  O nível 9 está ativo e o gate impede crescimento, mas o `phpstan-baseline.neon` ainda ignora cerca de 400 erros.
- [ ] **S65, S70, B39, B49, B50** · Limpeza de código morto e de ferramentas — `P4` · médio · débito técnico
  Controllers `Auth/` e `routes/auth.php` (conferir antes: o arquivo tem rotas ativas), `docker/production/nginx`, `compose.test.yml` e `versions.txt`; Prettier com o plugin do Tailwind (B34, B48; conferir depois da atualização do Prettier); Jest em worktree com ponto no caminho (B49); resposta das rotas `show` removidas (B39).
- [ ] **DEB-D3** · Admin: `DeleteItem` genérico em Roles e `ViewModeToggle` em todas as listas — `P4` · pequeno.
- [ ] **RR-D3** · Comando de auditoria dos horários com data anterior à criação, com `--dry-run` — `P4` · pequeno · depende de decisão sobre o destino desses registros.
- [ ] **QA119-D2** · No escopo `single`, a chave do horário ignora `horario_fim` — `P4` · pequeno · débito técnico
  A identidade do horário é `agenda_id|data|horario_inicio`. Mudar só o fim, mantendo o início, mantém a linha antiga. Hoje não tem efeito, porque a grade é fixa (o início define o fim). Revisar junto com o #104, se os templates de horário entrarem. Achado do QA da rc.119.
  **Pronto quando:** a chave passa a incluir `horario_fim`, com teste de mudança só no fim; ou o #104 confirma que a grade fixa continua e o caso fica fora do escopo.
- [ ] **AF-6.3a** · Telemetria de acerto e falha do cache de relatórios — `P4` · pequeno.
  Hoje só existe o log de cache miss, em nível info, que não aparece em produção (nível warning). Não há registro de acerto.
- [ ] **S74** · Garantir a unicidade de andar por módulo no banco, com testes — `P3` · médio · débito técnico
  A regra existe só na aplicação (`StoreModuloRequest::validateAndaresUniqueness` e `updateOrCreate` em `ModuloService::update`). Não há índice único `(modulo_id, nome)` em `andars`, e não há testes de criação ou edição de módulo. Antes da migration, conferir duplicatas em produção (no banco de dev não há nenhuma).
  **Pronto quando:** há testes de feature de criação e edição de módulo; a unicidade é decidida (índice único ou só aplicação) e, se for índice, a migration roda sem duplicatas em produção.

## Onda 6 — Internacionalização (`P2`–`P4`)

Plano revisado em 01/11 (rev. 3) e ainda não iniciado. Plano e auditoria locais (ver [Origem dos itens](#origem-dos-itens)). Convenção decidida (01/11): no backend, frase em inglês como chave nos JSON de `lang/`; no front, o motor tipado de `resources/js/i18n/`. Ordem: F0 → F1 e F5 em paralelo → F2, F3, F4+6a e os lotes 6b, 6c, 6d e 6f em paralelo → 6e → F7 → consolidação. F8 só com gatilho.

- [ ] **I18N-F0** · Fundação de locale: idioma salvo no usuário e formato único — `P2` · médio
  Enum de locale único; `users.locale` com `HasLocalePreference`; a prop `locale` do Inertia sempre em `pt-BR`/`en`/`es`; remove a prop `quote`, que não é usada; `<html lang>` acompanha a troca de idioma; cria `docs/arquitetura/internacionalizacao.md` com a convenção decidida.
  **Pronto quando:** a escolha de idioma persiste entre sessões; a prop `locale` nunca sai fora de `pt-BR`/`en`/`es`; `<html lang>` muda junto com o idioma; há testes cobrindo.
- [ ] **I18N-F1** · Arquivos de idioma, validação e testes de paridade — `P2` · médio · depende da F0
  `lang/pt_BR/` no lugar de `lang/pt/` e `lang/pt.json`; `lang/en` e `lang/es` completos; `es.json` com as chaves do framework que faltam (e-mails de senha e verificação); nomes de campo em `validation.attributes`; FormRequests e Rules traduzíveis; testes genéricos de paridade e de chave usada no lugar das listas manuais.
  **Pronto quando:** a validação em `es` sai em espanhol, e remover uma chave de `es.json` faz um teste falhar.
- [ ] **I18N-F1b** · Mensagens de redefinição de senha em `es` e `en` — `P3` · pequeno · depende da F1
  `lang/es` e `lang/en` não têm `passwords.php`. As mensagens de redefinição caem no `pt`, que é o idioma de fallback. Entra junto com a F1 (paridade dos arquivos de idioma). Achado em 06/11/2026.
  **Pronto quando:** `lang/es` e `lang/en` têm `passwords.php` com as mesmas chaves de `pt`, e o teste de paridade da F1 cobre o arquivo.
- [ ] **I18N-F5** · Infraestrutura do front: plural, datas por locale e pseudo-locale — `P2` · médio · depende da F0
  Plural no motor; date-fns e formatos de data pelo locale ativo (hoje há `ptBR` importado em 7 arquivos e 14 formatos `dd/MM` fixos em 9 arquivos, contagem de 04/11/2026); ordenação pelo locale; textos dos primitivos de UI; dicionários divididos por namespace; pseudo-locale só em dev; testes com o motor real no lugar de mocks; script de inventário versionado.
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
  Inclui os textos fixos do modal de permissões (título, botão de salvar e mensagem de erro).
  Um PR por lote: o PR remove do inventário só os arquivos deste lote.
  **Pronto quando:** o inventário não lista arquivos do lote, e as traduções en/es foram revisadas por uma pessoa.
- [ ] **I18N-6d** · Textos do front: reservas e agenda (cerca de 57 strings, incluindo a validação do formulário de reserva) — `P3` · médio · depende da F5
  Um PR por lote: o PR remove do inventário só os arquivos deste lote.
  Inclui também os textos fixos de reserva e avaliação ainda pendentes no inventário (= `QA119-F6`). A validação de `useReservaStepper.ts` (iniciada com `error_*` na #538 e unificada em `reservas.stepper.errors.*` na #536), a formatação de datas dos passos do modal (`StepHorariosRecorrencia.tsx` e `StepRevisaoConfirmacao.tsx`, `R-13`), o conector de período (`reservas.stepper.period_to` em `ReservaInfoCard.tsx`, `B-03`), o `SituacaoBadge` e o parecer de conflito em `AvaliarReservaPage.tsx` (`#540`), bem como o modal de 2 passos (detalhes, revisão e tela de sucesso), a agenda e as mensagens de conflito na #536 estão traduzidos em `pt-BR`, `en` e `es`. Falta o inventário dos demais arquivos do lote.
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

- [ ] **UX-01 a UX-17** · 🔧 em andamento (branch `feat/ux-solicitacao-usuario`; PR #536 reconciliada sobre a `develop` pós-`1.7.0`, pronta para merge e publicação em staging) · Solicitação de espaço pelo usuário comum com menos esforço — `P2` · médio · produto/UX
  Achados da análise de UX de 19/11/2026 ([análise](./processo/ux/analise-solicitacao-usuario-comum.md)), com o que a branch entrega: UX-01 busca por disponibilidade (filtro "Quando?" e selo "N horários livres") · UX-02 campos que o backend descartava (migration e exibição) · UX-03 célula da agenda acessível por teclado · UX-04 modal em dois passos · UX-05 descrição opcional, alinhada ao backend · UX-06 CTA "Enviar solicitação" e tela de sucesso · UX-07 Shift+clique e marcar o turno · UX-08 hover neutro e seleção em `primary` · UX-09 subtítulo próprio por passo no modal · UX-10 conflitos por slot, com remoção · UX-11 atalho duplicado · UX-12 capacidade numérica · UX-13 hierarquia da agenda · UX-14 consistência visual, i18n e tamanhos · UX-15 contraste no tema escuro · UX-16 card sem controles aninhados · UX-17 alvos de toque de 40 a 44 px.
  **Pronto quando:** a branch passa em `npx tsc --noEmit`, `npm run lint:check`, `npx jest`, Pint, PHPStan nível 9 e nos testes de backend; a PR entra na `develop`; e o roteiro de solicitação em staging não tem regressão. O número da PR entra na própria PR (regra 2).

- [ ] **#107** · Mostrar na agenda as solicitações em análise — `P2` · médio · feature
  Requisito "Must" do escopo original. Decidir o público: solicitante ou gestor (D-2). Armadilha: não ampliar o `ConflictDetectionService` para `em_analise`, porque a avaliação passaria a indeferir automaticamente; usar um serviço à parte.
  Achado do QA da rc.119 (obs. 1 e 9): um horário com solicitação pendente de outro usuário não aparece nem avisa quem solicita, e o envio é aceito. Ficam duas pendentes concorrentes no mesmo horário, e a decisão cai toda no gestor. = QA119-F2.
  **Pronto quando:** quem solicita vê, antes de enviar, que há pendência no mesmo horário, sem nome de terceiro enquanto a F-05 não for decidida; e um teste cobre o aviso.
- [ ] **GAP-10** · Trilha de auditoria das avaliações (quem, quando e por quê) — `P2` · médio · feature
  A reavaliação sobrescreve avaliador e justificativa. Bloqueia o #46; é o requisito 14 da v2. Ver também a T-45.
- [ ] **#98** · Versão de build no rodapé, só para administradores — `P2` · pequeno · feature. = S68, E2-I.
- [ ] **#46** · Edição de título e descrição da reserva com autorização do gestor — `P3` · grande · decisão primeiro
  Fazer um brainstorm das regras (D-3) e reescrever a issue. Depende da GAP-10. A D-EST-09 sugere fechar ou redefinir.
- [ ] **#104** · Templates de horário configuráveis pelo gestor — `P3` · grande · ADR primeiro (D-5)
  A label `P0` do GitHub não reflete o plano ("fora da 2.0", D-EST-09). O template precisa ser respeitado por `HorarioDisponivel` e `ConflictDetectionService`; destrava a DEB-A1.
- [ ] **GAP-09** · Fluxo para reserva parcialmente deferida — `P3` · médio · decisão primeiro
  Resumo de horários deferidos e indeferidos, com ação sobre os indeferidos. Inclui decidir se `ReservaPolicy::update` permite editar reserva com horário já avaliado (GAP-06).
- [ ] **QA119-F1** · ⏳ aguarda decisão · Feriados na recorrência: a expansão não considera feriados — `P3` · médio · regra de negócio
  O QA da rc.119 (M-05) criou uma reserva de 1 mês que incluiu 08/12, marcado como feriado no período. O código não trata feriado. Falta decidir se a data é pulada, se o solicitante é avisado ou se o feriado é ignorado, e de onde vem o calendário (nacional, estadual ou municipal). Decisão em [Decisões pendentes](#decisões-pendentes-não-é-código).
  **Pronto quando:** a decisão está registrada na tabela de decisões; se ela exigir mudança, a expansão e a revisão aplicam a regra, com teste para uma recorrência que cruza feriado.
- [ ] **#49** · Ir para a sala anterior ou a próxima a partir da agenda — `P3` · pequeno · depende da D-4 (andar ou módulo; ordem).
- [ ] **#462** · Busca de salas por necessidade (recursos e capacidade) — `P3` · grande · depende de modelar recursos e equipamentos.
  **Avanço parcial (19/11/2026, branch `feat/ux-solicitacao-usuario`):** capacidade (campo numérico "Quantas pessoas?") e disponibilidade por data e turno (filtro "Quando?") estão resolvidas. Recursos e equipamentos seguem pendentes.
- [ ] **GAP-07** · Indicador de progresso para o solicitante depois de criar a reserva — `P4` · médio
  A lista já recarrega por evento; a D-EST-18 deixa para a 2.x.
  **Avanço parcial (19/11/2026, branch `feat/ux-solicitacao-usuario`):** a tela de sucesso dentro do modal responde "o que acontece agora" logo depois de criar, com "Ver minhas reservas" e "Fazer outra solicitação". O indicador de progresso depois disso segue aberto.
- [ ] **GAP-08** · Hora de pico, mapa de calor e série histórica nos relatórios — `P4` · médio.
- [ ] **QA119-F5** · Grade de edição não mostra as ocorrências propagadas — `P4` · pequeno · UX
  Na edição com escopo "Todas as ocorrências", a grade do primeiro passo (Detalhes; o modal tem dois passos desde 19/11/2026: Detalhes e Revisão) mostra só o horário clicado. O efeito da propagação nas demais semanas aparece só na revisão. Achado do QA da rc.119. Regra em [`regras-de-negocio/recorrencia.md`](./regras-de-negocio/recorrencia.md#51-escopo-recurring-todas-as-ocorrências).
  **Pronto quando:** a grade ou a lista do passo Detalhes mostra as ocorrências que a propagação vai alterar antes do envio, e um teste cobre a prévia.
- [ ] **UX-18** · Link "Ver detalhes" do tooltip da reserva não recebe foco pelo Tab — `P2` · pequeno · acessibilidade
  Trocar o tooltip por Popover, que abre pelo foco e pelo toque. Achado da análise de UX de 19/11/2026.
  **Pronto quando:** o link "Ver detalhes" é alcançável por Tab, e um teste cobre a abertura pelo teclado.
- [ ] **UX-19** · Nome "UESB" fixo no termo de responsabilidade e como fallback no card do espaço — `P3` · pequeno · bug
  O nome deve vir da instituição, no lugar do texto fixo.
  **Pronto quando:** o termo e o card mostram o nome da instituição do espaço, e um teste cobre uma instituição com outro nome.
- [ ] **UX-20** · Conflito em tempo real só é observado no passo Revisão, e o alerta fica até reabrir o modal — `P3` · pequeno · bug
  Depois de remover o slot em conflito, o alerta segue visível até o modal ser fechado e aberto de novo.
  **Pronto quando:** remover o slot em conflito tira o alerta na hora, e um teste cobre o caso.
- [ ] **UX-21** · Textos do modal de solicitação fora do i18n: chaves `period_recurrence` e `recurrence_pattern` sem namespace próprio, e placeholder e "Limpar data" do DatePicker fixos em PT-BR — `P3` · pequeno · i18n
  Pode entrar junto com a I18N-6d ou ser item próprio, conforme o lote.
  **Pronto quando:** nenhuma chave dessas fica fora do namespace e nenhum texto fixo, com paridade em `pt-BR`, `en` e `es`.
- [ ] **UX-22** · "Hoje" do filtro "Quando?" usa o fuso do navegador, não America/Bahia — `P3` · pequeno · bug
  Ligar à S36 (fuso de negócio). O backend já usa America/Bahia; falta o front. Perto da meia-noite, a data mínima pode diferir.
  **Pronto quando:** o front usa o fuso de negócio, e um teste cobre a data à noite com relógio congelado.
- [ ] **UX-23** · Tela de detalhes do calendário (`CalendarReservationDetails`) sem Shift+clique nem marcar o turno — `P4` · pequeno · decisão
  Decidir se a tela ganha os atalhos de seleção ou se fica fora do escopo.
  **Pronto quando:** a decisão está registrada aqui, e, se for fazer, há item de execução.
- [ ] **QA126-04** · Foto de perfil inválida sem mensagem de erro — `P2` · pequeno · frontend
  Em `settings/profile.tsx`, selecionar arquivo que não é imagem ou excede o tamanho limite deve manter a foto anterior, exibir erro traduzido em `pt-BR`/`en`/`es` e limpar o input.
  **Pronto quando:** validação client-side e testes em `profile.test.tsx` passam, mantendo validação do backend (`FotoPerfilTest`), e `CFG-02` é revalidado em staging.
- [ ] **QA126-05** · Mensagem de sucesso enganosa na auto-aprovação do gestor — `P2` · pequeno · frontend + i18n
  Variar a mensagem da tela de sucesso do `ReservaStepperModal` conforme a situação da reserva criada (`deferida`, `parcialmente_deferida` ou `em_analise`) em `pt-BR`/`en`/`es`.
  **Pronto quando:** `ReservaStepperModal.test.tsx` cobre as três situações e `GES-04` é revalidado em staging.
- [ ] **QA126-06** · Textos residuais sem tradução em `en` e `es` e teste de paridade de chaves — `P2` · médio · frontend + i18n
  Traduzir literais em PT-BR detectados no QA da `rc.126` (`QUA-02`: "até" em intervalos, dias da semana abreviados por locale, "Lista", "Ações", breadcrumbs de Espaços/Painel Inicial/Avaliar Reserva, "Todos los Andares", "Adicionar/Remover Favoritos", `aria-label="Fechar"`) e criar teste automatizado de paridade de chaves entre `pt-BR`, `en` e `es`.
  **Pronto quando:** o teste de paridade de chaves passa na suíte Jest e `QUA-02` é revalidado em staging sem textos em português (exceto `UX-19`).
- [ ] **QA126-07** · Rótulos incorretos e atalhos "Em breve" no módulo institucional — `P3` · pequeno · frontend
  Corrigir badge de andar na listagem de módulos, breadcrumb de edição de espaço, textos de Espaços em `/institucional/roles` e botões "Usuários"/"Configurações" no dashboard institucional.
  **Pronto quando:** rótulos e atalhos estão coerentes e cobertos por testes de frontend.
- [ ] **QA126-08** · Alerta de conflito na Revisão para recorrência (`SOL-08`) e filtro de reservas por sobreposição de intervalo (`EDI-01`) — `P3` · médio · frontend + backend
  Garantir detecção de conflito prévia na Revisão considerando todas as datas expandidas da recorrência (sem regredir `UX-20`) e alterar o filtro `data_inicio`/`data_fim` de `/reservas` para sobreposição de intervalos (`data_inicial <= fim_filtro AND data_final >= inicio_filtro`).
  **Pronto quando:** testes de frontend e de feature no backend cobrem a expansão com conflito e o filtro por sobreposição de intervalo.
- [ ] **QA126-09** · Ruído de console no logout (WebSocket) e fallback de `UserAvatar` para caminho inválido — `P3` · pequeno · frontend
  Desconectar o Echo/Reverb antes do `POST /logout` para eliminar `WebSocket is already in CLOSING or CLOSED state` e evitar requisição quebrada em `UserAvatar` quando `profile_pic` não for um caminho válido de imagem.
  **Pronto quando:** testes unitários cobrem a desconexão no logout e o fallback do `UserAvatar`.

## Futuro — v2.0

- [ ] **E3-01** · Re-baseline da documentação da v2 — `P3` · grande · decisão
  A documentação preparatória está na branch `docs/v2-0-documentacao-preparatoria`, não mergeada e escrita sobre a rc.71. Precisa aplicar o ADENDO-V2 antes de entrar na `develop`, já no padrão de nomes de `docs/`. Escopo da v2: Gestor de Unidade e Gestor de Espaço, dashboard composto, setor e expediente, aprovação por urgência, QR Code e chamados, consolidação retroativa (sprints 0 a 7).
  **Gate da v2:** 14 dias de v1 estável · fuso de negócio (S36) · isolamento de escrita (S48–S50) · staging anonimizado (E3-03, T-41) · restore testado nos últimos 30 dias (T-23) · jobs sem falha por broadcast (S26) · testes de caracterização (B26).
- [ ] **PR #397** · Módulo de chamados: fica aberto, sem prazo — `P2` · pequeno · decidido
  **Decidido pelo responsável em 08/11/2026:** a PR fica aberta, sem ação e sem prazo; não é problema. A recomendação dos planos (fechar como substituído e reimplementar na v2, sprint 6) deixa de ser pendência. Aberta desde 26/08, sem revisão, com conflitos em 83 arquivos. = D-EST-05, D-7, A-06.
- [ ] **T-30** · Reforçar a autenticação de perfis administrativos — `P2` · médio · segurança · v2
  **Decidido pelo responsável em 08/11/2026 (F-12):** o 2FA obrigatório para institucionais e gestores vai para a v2; implementar se for simples. = A-10, P-13, P-18.
- [ ] **V2-MNT** · Levantar o requisito do Painel do Mantenedor (saúde da fila, erros e alertas) — `P3` · decisão/requisito
  **Decidido pelo responsável em 08/11/2026:** o rastreador de erros (D-EST-01) e o canal de alerta (D-EST-15) viram requisito de um Painel do Mantenedor na v2, sem travar agora. O requisito cobre as S44 e S45 abaixo.
- [ ] **S44, S45** · Health-check da fila e rastreador de erros — `P2` · médio · operação · escopo do V2-MNT
  Hoje uma falha de fila só aparece por reclamação. Ligadas ao V2-MNT (Painel do Mantenedor), sem travar agora. = B23, E1-30, E1-31.

---

## Decisões pendentes (não é código)

### Institucionais (LGPD)

| Decisão | Quem decide | Destrava |
| --- | --- | --- |
| F-01 · Pessoa que ocupa o encarregado (o canal do titular já está decidido, ver F-08). Os responsáveis pelo sistema estão definidos (autores, ver F-08), mas a designação formal do encarregado pela UESB (art. 41) continua pendente, junto com o prazo e o rito de resposta da F-08 | gestão da UESB | T-10, texto final da política (T-17, T-18), runbook (T-16) |
| F-08 · Rito e prazo de resposta ao titular. Canal decidido em 08/11/2026: o e-mail do próprio sistema (`uniespacos@uesb.edu.br`), da UESB como controladora. Os autores e responsáveis pelo sistema são o Professor Dr. Agnaldo Volpe Lovato e o graduando de Sistemas de Informação Pedro Henrique Pinheiro Lemos. A LGPD fixa prazo próprio para a resposta ao titular (art. 19); o número ainda não foi definido | encarregado | T-10, T-39, T-40, T-48 |
| F-02 · Bases legais e norma estadual | jurídico | T-11, T-14, T-15 |
| F-04 · Reservas históricas: temporalidade da CPAD ou anonimização | encarregado e arquivo | T-12, T-25 |
| F-05 · Quem vê o nome do solicitante na agenda | responsável e encarregado | T-43 |
| F-06 · Quem, além do gestor da reserva, vê o telefone | responsável | visibilidade do telefone para institucionais (resíduo da T-26) |
| F-07 · Menores de idade com cadastro aberto | gestão da UESB | RIPD |
| F-09 · Responsável técnico e guardião do registro de incidentes. Provável: os autores do sistema, a confirmar (ver F-08) | gestão da UESB | T-16 |
| F-10 · Provedor SMTP, proxy da borda e guarda de logs de acesso; contratos com GitHub e com o provedor de fontes (a T-38 removeu o provedor externo com o deploy da 1.7.0 em 20/11/2026); operador de armazenamento do snapshot e do backup manual (registrado em 02/11, com transferência internacional; snapshot e backup manual vão cifrados do lado do responsável) | TI e gestão da UESB | T-13, T-23, T-38 |
| F-11 · O art. 15 do Marco Civil se aplica? | jurídico | confirma a T-20 |
| F-13 · Texto e guarda dos campos livres | encarregado | T-33 |
| F-14 · Conferir os binários de `docs/UniEspaço Web/` | responsável | H-05 e reorganização da pasta |
| Manter diferidas ou antecipar a T-01 e a T-03 | responsável | maior risco do plano LGPD |

### Produto e técnica (responsável)

| Decisão | Destrava |
| --- | --- |
| D-EST-13 e DT-10 · Backup: destino, retenção, cifragem e staging para o ensaio (com a TI) | T-23 |
| D-EST-23 e D-EST-24 · Efeitos do backup parado; liberar a S34 e a S41 a S43 com backup manual | Ondas 3 e 4 |
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
| B39 · O que as rotas `show` removidas devem responder | S65 |
| RR-D3 · Destino dos horários com data anterior à criação | RR-D3 |
| QA119-F1 · Feriados na recorrência: pular a data, avisar ou ignorar; fonte do calendário (nacional, estadual ou municipal) | QA119-F1 (Onda 7) |

## Gestão do repositório (não é código)

- [ ] Comentar o fechamento das issues #48 e #102 (fechadas sem comentário). A #41 já foi tratada (entrega no #432 comentada no GitHub e label `wontfix` removida). A validação manual com dois navegadores (T6.6) nunca foi registrada.
- [ ] Alinhar as labels: #104 está `P0` (o plano pede ADR antes e deixa fora da 2.0); #107 está `P4` (requisito "Must" original); #98 e #462 estão sem prioridade.
- [ ] As 18 issues do plano de estabilização (`criar-issues.sh`) nunca foram criadas. Este backlog passa a ser a fonte: fechar o milestone vazio "Estabilização v1 — Fase 1" e abrir issue só quando o item entrar em execução.
- [ ] Limpar as branches remotas antigas. Análise por conteúdo de 04/11/2026 (não por `git branch -r --merged`: o repo usa squash merge): das 33 branches antigas, 30 estão absorvidas por `develop`, pelas PRs consolidadoras #286, #386, #394, #399, #401, #406, #415, #422 e #481. Podem ser apagadas, aguardando autorização. Mais cerca de 10 branches de PRs mergeadas em novembro e a branch de notas do release-please de 04/10 também podem sair. Fora da limpeza: `feat/tickets-module` (PR #397 aberta), `docs/v2-0-documentacao-preparatoria` (até o E3-01) e `refactor/melhorias-arquitetura-ux-frontend` (rascunho da #481, já absorvida; confirmar com o dono).
- [ ] Decidir a política de testes dos executores: suíte completa a cada tarefa (hoje) ou só testes focados por tarefa, com suíte completa uma vez, pelo master, no fim do plano. Uma branch antiga com a segunda política nunca entrou. Se adotada, reaplicar nos agentes, nos espelhos e na skill de testes. — `P3` · pequeno · processo
- [ ] Arquivar os planos locais concluídos (ver [Origem dos itens](#origem-dos-itens)).

> O `Closes #N` não fecha a issue em merge para `develop`; o GitHub só fecha em merge para a branch padrão (`main`). Feche manualmente, com comentário.

## Fora da fila

Resolvidos, cancelados ou obsoletos que ainda aparecem nos planos antigos:

- **GAP-01** · obsoleto: o fluxo mudou e o hook foi removido (fase 07 dos débitos 2026-09).
- **GAP-04** · falso positivo: os e-mails já usam templates Blade desde fevereiro de 2026 (#117).
- **GAP-05** · feito no #432 (filtro de período nas listas de reservas).
- **GAP-02 e GAP-03** · feitos em agosto: a edição regenera os conflitos (#313) e a propagação `recurring` respeita as agendas do gestor (#302).
- **GAP-11** · feito: canais privados por espaço (#338) e recarga das listas por evento (#432). Resta trocar o canal público (S39).
- **#41** · feito no #432 (atualização em tempo real das listas; issue fechada).
- **T-34 e T-42** · cancelados: telefone obrigatório mantido (P-07) e cadastro aberto ao público (P-06).
- **T-04 e T-26 (c)** · feitas no #494 (01/11). A T-26 (a, b) foi feita no #507.
- **Página de privacidade no release 1.5.0** · decidida em 01/11 pelo responsável: standby, fora do 1.5.0, desligada por padrão (`PRIVACY_PAGE_ENABLED=false`) no #496. A retomada é o item T-17, T-18 da Onda 2.
- **S13, S15, S25, S40, S55, S62 e S63** · feitos: S13 pela T-04 (o resíduo saiu no #494), S15 e S63 pela T-25, S25 no #469, S40 no #470, S55 pela T-29 e S62 pela T-22.
- **S56** · alerta de expiração do certificado: perdeu o motivo (D-EST-16); reavaliar só se a renovação deixar de ser automática.
- **Recorrência "personalizado"** (auditoria de regras de reserva, H1) · falso positivo: comportamento projetado, documentado em [`regras-de-negocio/recorrencia.md`](./regras-de-negocio/recorrencia.md).
- **Deprecar o `ValidateReservationConflictsJob`** · cancelado: o job continua em uso.
- **Teste de carga do `ShouldBeUnique`** (áreas de foco) · descartado: coberto pelo lock de agenda do #406.
- **B20, B40 e B42** · refutados ou fechados. **DT-12** · resolvido: Laravel 12.70 em produção desde 30/10. **D-EST-21** · prejudicada, porque o trem R2 não aconteceu.
- **Calendário da estabilização v1** (trens R2 a R5 e a meta de 06/11 para a Fase 1) · vencido: o plano parou em 10/10.
- **N-08** (foco retido dentro do modal no QA da `rc.120`) · comportamento esperado: retenção de foco (*focus trap*) nativa do Radix Dialog conforme WCAG 2.1 / WAI-ARIA Dialog APG; não é defeito.

## Entregas recentes

Para contexto; o histórico completo está no [`CHANGELOG.md`](../CHANGELOG.md).

- **20/11 (reconciliada sobre `develop` pós-`1.7.0`)** · #536 `feat/ux-solicitacao-usuario` (aberta em 19/11/2026; pronta para merge em `develop` e publicação em staging): solicitação de espaço com menos esforço para o usuário comum (`UX-01` a `UX-17`), reconciliada com os ajustes da `1.7.0` (#538, #540, #542, #544, #545 e #550) e correção do PHPStan nível 9 (`ListarEspacosRequest`, `EspacoRepositoryEloquent` e `HomeService`). Filtro de disponibilidade por data e turno na lista, agenda acessível por teclado (`<button>` nativo) com Shift+clique e marcar o turno, modal em 2 passos com tela de sucesso, e público estimado, categoria e aceite do termo gravados (migration aditiva `2026_11_19_120000` validada em 6 rodadas contra o estado de staging), preservando todos os fixes de recorrência/edição/a11y/i18n da `1.7.0`. Pendências novas registradas: `UX-18` a `UX-23`.
- **20/11** · #550 sincronização `main` → `develop` depois da `1.7.0` e fechamento dos itens operacionais em produção no backlog (`v1.5.0-rc.125` em staging).
- **20/11** · #548 e #549 release `1.7.0` em produção (Onda 2 parte 2 + performance/modernização/acessibilidade e correções de reservas: #525–#547). Backup manual cifrado pré-deploy com teste de abertura e cópia externa conferidos; fila vazia antes do deploy; sem migration. Pós-deploy OK: todos os 5 serviços na imagem `1.7.0`, `postgres:16.15` saudável e não recriado, `StopSignal` `SIGQUIT`/`SIGTERM` (`T-19d`), `app:check-env` com `0 falhas` e `1 aviso` (`session_encrypt`, após rotação da credencial do banco), `config('retencao')` em `90/90/90/90/1/7/90` e `LOG_DAILY_DAYS=90` efetivos (`T-19g`), `fotos:reprocessar` executado (`1` em ordem, `0` pendentes, `T-31`), `base:anonimizar --dry-run` recusado em `production` (`T-41`), tabelas do Telescope com `0` linhas (`T-19c`), `jobs=0`, `0` novos `failed_jobs` (os `8` existentes são de `22/10` a `13/11`), `0` erros em `storage/logs/` pós-deploy, `queue-worker` processando normalmente e validação pública em `https://uniespacos.uesb.br` OK (`T-38` fontes locais, chunks Vite, 0 erros de Console). Higiene no servidor concluída no mesmo dia: `T-05b` executada (~5 GB liberados, de 55% para 42% de uso em `/`), backups pré-`1.5.0`/`1.6.0` (e dumps em texto plano soltos na home) destruídos com `shred` (`T-23`), e `storage/backups/` tratado. Fecham: `T-05b`, `T-08`, `T-31`, `T-35`, `T-19c`, `T-19g`, `T-38`, `T-46`, `T-29` (parte a + `T-29b`), `S73`, `S72`, `RR-H2`, `RR-F01`, `RR-F04`, `S26c`, `DOC-01`, `DOC-02`.
- **20/11** · #547 QA completo pré-`1.7.0` em staging (`v1.5.0-rc.124`, #545 e #546 mergeadas em `develop`): Bloco 1 (`OP-01`–`OP-06`) executado via SSH/CLI — containers na imagem `1.5.0-rc.124`, sinais `SIGTERM`/`SIGQUIT` corretos, parada de `scheduler-production` no ciclo `:00` com `ExitCode=0` em `0.529 s`, `cache_locks=0` e ciclo seguinte normal (ressalva: `AgendadorLoop` usa `Log::info`, suprimido por `LOG_LEVEL=warning` em staging), `app:check-env` revisado (17 `OK`, 3 `FALHA` de staging, 1 `AVISO`), `retencao:aplicar --dry-run` (90/90/90/90/1/7/90 dias; `LOG_DAILY_DAYS="14"` no `.env` de staging), `fotos:reprocessar --dry-run`, `base:anonimizar --dry-run` recusado em `APP_ENV=production` e `failed_jobs` sem novas falhas (`11` pré-existentes, `jobs=0`). Bloco 2 validado no navegador (`main@phplemos.dev`, `request@gmail.com` e `phplemos.dev@gmail.com`): `SEC-01`–`03`, `PRIV-01` (0 fontes externas), `PRIV-02` (EXIF/GPS `1200x900` reprocessado para `800x600` sem metadados; `fotos:reprocessar --dry-run` incrementou `já em ordem` para `2`), `PERF-01`, `PERF-02` (sino `+1` em tempo real de `89` para `90` sem duplicata após 4 navegações Inertia), `RES-01` (`403` intencional para `institucional` por revogação de `reservas.atualizar`), `RES-02` (auto-deferimento + sino in-app), `UI-01` (Latte/Frappé sem FOUC) e `UI-02` (`/login`, `UserSearchComboBox` sem botões aninhados e modais `375x812` em `dvh`, registrando `QA4-A11Y-01` para `/settings/password` e `RegisterStepPersonal`).
- **19/11** · #545 `fix/ci-staging-workflow-dispatch-tag` e #546 `chore(develop): release 1.5.0-rc.124` (mergeadas em `develop` em 19/11/2026): expõe `image_tag` (`steps.meta_app.outputs.version`) no job `build-and-push` de `.github/workflows/cicd-staging.yml` e passa a usá-la tanto no `Deploy to Staging via SSH` quanto na promoção da tag `:staging` (incluindo `workflow_dispatch`), destravando o deploy limpo da `v1.5.0-rc.124` em staging. Validado na CI (`Tests` e `CI/CD - Staging`).
- **19/11** · #544 `fix/reserva-validation-test-determinismo` (mergeada em `develop` em 19/11/2026): corrige falha observada na CI (`v1.5.0-rc.123`, run `44630192052`) em `ReservaValidationTest::it_accepts_valid_or_null_publico_estimado_in_store_and_update` (e previne o mesmo padrão em `it_rejects_invalid_publico_estimado_in_store_and_update`), fixando `$gestor` separado em `Agenda::factory()->create(['user_id' => $gestor->id])`, `situacao` inicial `EM_ANALISE` e datas distintas por iteração no loop do `store`, além de `assertRedirect()`. Validado: Pint (`424` arquivos), PHPStan nível 9 (`220/220`) e `ReservaValidationTest` executado 3 vezes seguidas sem falha.
- **19/11** · #542 `fix/deploy-scheduler-sigquit-e-ssh-keepalive` (mergeada em `develop` em 19/11/2026, `rc.123`; complemento de `T-19d` pré-`1.7.0`): correção da queda com exit `255` no `Deploy to Staging via SSH` (runs `44625843070` da `rc.122` e tentativa 1 da `rc.120`). A imagem base `php:8.4.27-fpm` define `STOPSIGNAL SIGQUIT`; como `AgendadorExecutarCommand` só instalava handler para `SIGTERM`/`SIGINT`, o `Recreate` do `scheduler` segurava 2 min aguardando `SIGKILL` enquanto o túnel SSH via `cloudflared` sem keepalive desconectava por inatividade antes de `php artisan up`. Inclui `SIGQUIT` em `AgendadorExecutarCommand::sinaisDeParada()`, `stop_signal: SIGTERM` para `scheduler`, `reverb` e `queue-worker` no `compose.prod.yml` (preservando `SIGQUIT` no `app` / `php-fpm`), keepalive SSH (`ServerAliveInterval 15`, `ServerAliveCountMax 12`) em `cicd-staging.yml` e `cicd-production.yml`, atualização de `docs/operacao/deploy-e-segredos.md` e `docs/arquitetura/erros-e-logs.md`, e teste de regressão em `tests/Unit/Console/DeployShutdownConfigTest.php`. Validado: 813 testes de backend (5.457 asserções), Pint (424 arquivos), PHPStan nível 9 (220/220) e validação sintática YAML de `compose.prod.yml` e dos workflows.
- **19/11** · #540 `fix/qa3-ajustes-pre-main` (mergeada em `develop` em 19/11/2026, `rc.122`; complemento da `1.7.0` pré-merge para `main`): correções das divergências reais e observações de i18n levantadas pelo QA regressivo completo (`QA3`) em staging após a #538. Inclui quebra de título contínuo sem estouro horizontal a `375 px` em `ReservaInfoCard` (`min-w-0` no contêiner/flex item) e `AvaliarReservaPage` (`A-07`), tradução do conector de período via `reservas.stepper.period_to` em `StepRevisaoConfirmacao` e `ReservaInfoCard` (`B-03`), uso de `SituacaoBadge` no cabeçalho de `AvaliarReservaPage` (Obs. 1) e chave `reservas.avaliacao.parecer_conflito_linha` nos 3 idiomas (`pt-BR`/`en`/`es`) para o parecer pré-preenchido de conflito (Obs. 2, avança `I18N-6d`). Confirmado que `C-06` (`403` para solicitante comum ao editar reserva parcialmente avaliada) é comportamento intencional de `ReservaPolicy::update()`. Validado: `npx tsc --noEmit`, `npm run lint:check` (sem supressão nova) e 132 suítes / 768 testes de frontend (`npx jest`); sem alterações em PHP.
- **19/11** · #538 `fix/qa-rc120-ajustes-pre-main` (mergeada em `develop` em 19/11/2026, `rc.121`, validada pelo QA regressivo `QA3` em staging; complemento da `1.7.0`): correções dos achados do QA completo da `rc.120`. Bloco 1: escopo `single` restrito à semana visível na UI/payload e preservação de alterações individuais na reavaliação em `AvaliarReservaJob` (`E-13`/`#3742`), remoção de `"Solicitante: undefined"` e atualização da nota de conflito em `pt-BR`/`en`/`es` (`C-10`–`C-12`/`W-02`), poda de horários excedentes ao encurtar recorrência no `/edit` (`E-11`/`#3737`), validação de `publico_estimado` (`1..5000` inteiro opcional) no front e no back (`W-09`), limite de `descricao` alinhado para `2000` e quebra de strings contínuas (`W-07`/`#3766`), navegação por teclado em `CalendarSlotCell` e anel de foco nos botões do modal (`W-10`/`#3763`) e unificação do badge de situação incluindo `inativa` (`#3743`/`#3769`/`#3770`). Bloco 2: preservação de quebras de linha em `ReservaInfoCard` (`W-08`), intervalo `min..max` dos slots resultantes na revisão da edição `single` (`R-04`), formatação de datas via `useTranslation().formatDate` nos passos do modal (`R-13`, avança `I18N-6d`), notificação/e-mail `ReservationCreatedNotification` adaptados para reservas auto-deferidas/parciais (`W-02`/`#3760`), eager loading de `agenda.user` e `avaliador` em `ReservaRepositoryEloquent` (corrigindo `"Gestor não definido"`) e `cancelada_descricao` neutra nos 3 idiomas. `N-08` registrado em [Fora da fila](#fora-da-fila) como comportamento esperado (WCAG focus trap). Redução de débito: `-1` supressão no `eslint-suppressions.json` e `-5` ocorrências resolvidas no `phpstan-baseline.neon`. Validado: 810 testes de backend, Pint, PHPStan nível 9, `npx tsc --noEmit`, 132 suítes / 758 testes de frontend e ESLint (`lint:check`) sem supressão nova.
- **19/11** · #534 `fix/qa-rc119-recorrencia` (mergeada em `develop` em 19/11/2026, `rc.120`, em staging com deploy do responsável no mesmo dia; complemento da 1.7.0): correções do QA da rc.119. E-02: `UpdateReservaJob` (escopo single) compara por agenda, data e horário de início e ignora slots de outras semanas (antes violava o índice único e fazia rollback sem aviso). E-01: `propagarEdicaoRecorrente` aplica a edição de "Todas as ocorrências" às semanas futuras do período. P-04: data inicial somente leitura e regra `DataDoHorarioNoPeriodo` (Store e Update recorrente). C-02/C-03 e **RR-F01 concluída**: mensagem de conflito traduzível com data e faixa, sem "em análise", e toast de 8 s. Revisão conta os horários que serão gravados (`expandirHorariosRecorrencia`), i18n do modal, cabeçalho "Manhã" e detalhes respeitando `?semana=`. Roteiro de reteste e fluxos não convencionais em `docs/processo/qa/roteiro-reservas-lacunas.md`; itens novos QA119-F1 a F6, D1 e D2. Validado: 803 testes de backend, Pint, `npx tsc --noEmit`, 130 suítes / 722 testes de frontend e ESLint sem supressão nova; PHPStan fica com a CI.
- **19/11** · #537 backlog: registro do merge da #534 (correções do QA da rc.119), staging na rc.120 e próximo passo de rodar o roteiro de QA das reservas em staging.
- **16/11** · #533 backlog: registro do merge da #527, da #529 e da #531 (complementos da 1.7.0), staging na rc.119 e próximo passo de validar a 1.7.0 em staging.
- **15/11** · #531 `fix/recorrencia-selecao-multi-semana` (mergeada em `develop` em 15/11/2026, `rc.119`; CI completa verde, incluindo os testes de Feature com Postgres): ajustes do fluxo de solicitação em múltiplas semanas e itens do backlog (`RR-H2`, `S73`, `S72`, `RR-F04`, `S26c`, `DOC-01`, `DOC-02`). Inclui conversão das opções de `RecorrenciaReserva` para chaves tipadas de `i18n` em `pt-BR`/`en`/`es`, preservação de seleções explícitas em semanas futuras do mesmo dia da semana em `ExpansaoHorariosService`, validação síncrona de conflitos em todas as datas geradas pela expansão da recorrência em `HorarioDisponivel` (`RR-H2`, respeitando `edit_scope === 'single'` e seleções explícitas), autorização de `UpdateModuloRequest` exigindo `modulos.atualizar` (`S73`), remoção do código legado `UniqueNormalizedFloorName` e `Andar::normalizarNome()` (`S72`), renomeação da prop `conflictCache` para `conflicts` em `ConflictAlertBox` (`RR-F04`), verificação exata de `InvalidarCacheRelatoriosAoAtualizarReserva` via `Event::getRawListeners()` em `RelatorioServiceCacheTest` (`S26c`), exclusão de `docs` no `.dockerignore` (`DOC-01`), sincronização de `GEMINI.md` com `CLAUDE.md` (`DOC-02`) e atualização da documentação de domínio (`recorrencia.md`, `validacao.md`, `cache-de-conflitos.md`).
- **15/11** · #529 `fix/fluxo-reserva-multi-semana-e-performance` (mergeada em `develop` em 15/11/2026, `rc.118`; itens do backlog: nenhum; CI completa verde: Tests, Backend Tests, Frontend Lint & Types e Frontend Tests): correção da solicitação, edição, detalhes e avaliação de reservas com horários em várias semanas e/ou vários turnos. Datas `YYYY-MM-DD` tratadas sem deslocamento de fuso (`parseDataLocal`); `data_final` cobre o maior slot selecionado; deduplicação por agenda, data e horário em `ExpansaoHorariosService`; `data_inicial` e `data_final` atualizadas depois do insert em `ProcessarCriacaoReserva`; modais de gestor e solicitante sem o filtro de uma só semana (`findWithWeekSlots`, `findForGestorModal`, `getEditData` e `getForGestorReview`); ordenação por `TURNOS_ORDENADOS`. Performance: `React.memo` em `CalendarSlotCell`, `useCallback` em `CalendarShiftSection` e refs no listener Echo de `ReservaConflictAlert`. Remoção de 2 supressões antigas do `eslint-suppressions.json`.
- **14/11** · #527 `fix/reserva-cancelada-e-performance` (mergeada em `develop` em 14/11/2026, `rc.117`; complemento da 1.7.0 após a #525): T-31c concluída (asserções exatas por linha em `ReprocessarFotosDePerfilTest` e `profile_pic` vazio por padrão em `UserSeeder` e `UserFactory`), correção do erro 403 ao abrir reserva cancelada por link de notificação (`ReservaPolicy::viewForGestor` vs. `evaluateForGestor`, aviso informativo em `AvaliarReservaPage`, `ReservasDetalhes` e `ReservasList`, traduções em `pt-BR`/`en`/`es` e atualização de `docs/regras-de-negocio/autorizacao.md`) e otimizações de performance do Mozilla Profiler (persistência do canal privado Echo entre navegações Inertia em `app.tsx`, validação de caminho e cache de falha em `UserAvatar`, remoção do debounce na troca de aba e preload dos gráficos em `useDadosRelatorio`, `manualChunks` por família no `vite.config.ts`, memoização em `AppSidebar`, compressão de `espaco.png` em 55% e `loadMissing` de permissões em `HandleInertiaRequests`). Avança a S39 (canal privado Echo persistido; o canal público `reserva-channel` segue). Validado em 14/11/2026 sobre a `develop` (`rc.116`): 765 testes de backend (`--exclude-group=pre-existing`, 5.228 asserções), Pint (419 arquivos), PHPStan nível 9 (220/220), `npx tsc --noEmit`, ESLint (`lint:check`, sem supressão nova), 127 suítes / 668 testes de frontend e `npm run build` OK.
- **14/11** · #525 e #526 Onda 2, parte 2 e modernização de frontend (mergeadas em `develop`, em staging como `1.5.0-rc.116`, base da 1.7.0): T-19e (jobs pendentes não reservados apagados após 90 dias; conferência do `.env` em produção segue via T-19g), T-19h (alerta `jobs_pendentes_antigos` ignora jobs reservados), T-19i (teste dos padrões de `config/retencao.php` e `config/logging.php` sem variáveis de ambiente), T-38 (fonte Instrument Sans servida localmente via `@fontsource/instrument-sans`; provedor externo deixa de operar com o deploy da 1.7.0, ver F-10), T-46 (bloco de privacidade no template de PR e skills), T-29b (aviso e link de redefinição no cadastro com e-mail existente) e modernização de frontend (viewport dinâmico `dvh`, `text-scale`, `color-scheme` e tokens Latte/Frappé no boot, `<search>`, foco visível e `aria-pressed` em senhas, vínculo de erro `aria-describedby`, `aria-sort`/`scope="col"` em tabelas, `UserSearchComboBox` sem controles aninhados, `prefers-reduced-motion`, `fetchPriority` em imagens e `text-balance`/`text-pretty`). Também entregam o código na #525 e seguem com passos pós-deploy em staging/produção: T-31 (`fotos:reprocessar`), T-35 (`app:check-env`), T-41 (`base:anonimizar`), T-19c, T-19d (`agendador:executar`), T-19g (padrões em 90 dias) e T-29 (parte a). Validado no merge com a `develop` 1.6.1: 764 testes de backend (5.213 asserções), Pint (419 arquivos), PHPStan nível 9 (220/220), `npx tsc --noEmit`, ESLint (`lint:check`, sem supressão nova), 127 suítes / 664 testes de frontend e `modern-web-guidance` (0 achados).
- **14/11** · #523 sincronização `main` → `develop` depois da 1.6.1 e backlog do release.
- **14/11** · #521 e #522 release 1.6.1 em produção (Onda 3, parte 1: #518, S26 e S14). Backup manual cifrado antes do deploy, com teste de abertura completo e cópia externa conferidos; fila vazia antes do deploy. Pós-deploy OK: app, queue worker, scheduler, reverb e web na imagem 1.6.1, com o banco saudável e não recriado; o deploy recriou o queue worker com a imagem nova, então o reinício explícito não foi necessário; ambiente de produção com debug e manutenção desligados; retenção agendada às 03:30 UTC, com 0 erros nos logs do agendador, do app e do worker em 15 min e `failed_jobs` vazio nos 30 min seguintes. Smoke por papel e teste do modal com dois papéis OK. Sem migration. Mitigação I4 retirada: o responsável avisou os institucionais em 14/11/2026 de que a orientação de não salvar o modal de quem tem dois papéis deixou de valer (S14).
- **06/11** · #520 backlog: 1.6.1 validada em staging (rc.114; S26 com o Reverb parado e S14 com o modal de dois papéis), S14b reproduzida no teste e item novo OP-01.
- **06/11** · #518 Onda 3, parte 1 (vai na 1.6.1): S26 e S14 concluídas. S26: ponto único de publicação do evento de reserva, chamado por último e depois do commit nos 5 pontos (4 jobs e o cancelamento); falha do broadcaster vira aviso no log, sem falhar o job, pular notificação ou regravar a validação de conflitos; a invalidação do cache de relatórios passa para o evento de domínio `ReservaAlterada`. S14: o modal de permissões não troca nem remove papel de quem tem mais de um, e só muda as agendas tiradas ou incluídas; papéis acumulados aparecem só para leitura; notificações de gestor só em transição real, depois do commit. Validado em 06/11/2026 com a `develop` da rc.113: 621 testes de backend (suíte normal e semeada), 662 de frontend, Pint, PHPStan e ESLint sem erros e sem supressão nova. Seguem na tabela de passos: a conferência do queue worker no deploy (S26) e a retirada da mitigação I4 depois do deploy em produção (S14). Seguem em aberto: S14b, S14c e a decisão B44.
- **06/11** · T-19 primeira rodada de retenção em produção conferida pelo responsável por volta das 10:40 na Bahia (13:40 UTC, depois das 03:30 UTC): o agendador não registrou nenhum erro nas últimas 12 h (janela que inclui a rodada) e a simulação seguinte deu 0 notificações lidas antigas (eram 2.957 antes da rodada), 0 de cache, 0 sessões e 0 logs diários. A simulação não conta jobs falhos nem lotes (só informa que a limpeza seria executada), então a poda dos 197 jobs falhos não foi medida; só a contagem à parte provaria isso, e nenhum item depende dela. Rotina diária seguindo sem intervenção.
- **06/11** · #517 backlog: conferência da primeira rodada de retenção em produção (T-19), staging na rc.113 e decisão de lançar a Onda 3 parte 1 como 1.6.1.
- **05/11** · #513 e #514 release 1.6.0 em produção (Onda 2, parte 1: #505, #507 e #509). Pós-deploy OK nos serviços de app, worker, reverb e web, com o banco saudável (recriado para aplicar o limite de logs da T-20, com dados intactos); debug e modo de manutenção desligados; o deploy recriou o worker com a imagem nova, e o reinício explícito não foi necessário; rotina de retenção no agendamento das 03:30 UTC, com 0 erros nos logs. Smoke por papel: reserva de teste criada pela conta comum e indeferida pelo gestor (indeferida, não aprovada, porque aprovar indeferiria horários de terceiros em conflito); a notificação chegou em tempo real ao gestor e ao solicitante, sem recarregar a página. Simulação de retenção aprovada pelo responsável: 2.957 notificações lidas há mais de 90 dias e 197 jobs falhos há mais de 30 dias. Agendador religado depois da aprovação; primeira rodada em 06/11/2026, 03:30 UTC (conferência na tabela de verificações). Sincronização `main` → `develop`: #515.
- **05/11** · T-19 e T-20 concluídas em produção (#505, na 1.6.0). T-19b concluída por decisão do responsável em 05/11/2026, sem execução em produção: a simulação em staging (02/11) deu 0 justificativas a trocar, e o responsável dispensou a simulação e a execução em produção.
- **05/11** · #512 backlog: estado da rc.112, auditoria de 04/11 e regra de PR por onda.
- **03/11** · #510 release candidata rc.112 em staging (#507 e #509), com deploy e teste feitos pelo responsável.
- **02/11** · #509 T-26 (d, e): broadcast de notificações só com campos públicos (sem IDs internos) e remoção da rota JSON sem uso. Reiniciar o queue worker depois do deploy.
- **02/11** · #508 backlog: estado da Onda 2 sincronizado, bloco de verificações e passos agendados em "Agora" e regras novas do backlog reativo (estado completo no backlog, atualização na hora e conferência da data).
- **02/11** · #507 T-26 (a, b): a prop compartilhada de notificações sai com lista branca de campos e o badge usa a contagem real de não lidas; decisões sobre a guarda do snapshot da T-05 e do backup manual (T-05b, T-13, T-23).
- **02/11** · #506 release candidata rc.111 (`develop`, com o #505 e o agendador) em staging. O #507 entra na próxima release candidata.
- **02/11** · #505 T-21: documentação de retenção e logs igual à configuração real. Na mesma PR, o código da T-19, da T-19b e da T-20 (seguem abertas até os passos em staging e produção).
- **02/11** · #504 backlog: registro do snapshot de auditoria e da guarda da T-05 (T-05b, T-13 e T-23).
- **02/11** · T-05 logs antigos de produção tratados: movidos para fora do alcance da aplicação, tokens de longa duração invalidados e código conferido; a cópia segue até 16/11 (T-05b). Na PR de sincronização: #502.
- **02/11** · #500 e #501 release 1.5.0 em produção (lote LGPD, congruência de UI/UX e resíduos da Onda 1), com smoke por papel e reinício do worker OK; sincronização `main` → `develop`: #502.
- **01/11** · validação manual em staging da rc.109 (lote LGPD, 29 passos em 6 blocos): tudo OK, feita pelo responsável. Registro: #499.
- **01/11** · #496 página de privacidade em standby: desligada por padrão, links ocultos nas telas e no e-mail (fora do 1.5.0).
- **01/11** · #494 resíduos da Onda 1 do LGPD: logs de autenticação sem parâmetros de acesso (T-04) e setor do gestor no dashboard institucional (T-26 (c)).
- **01/11** · #492 sincronização da documentação e do backlog.
- **01/11** · #491 consolidação da documentação (novo índice, roadmap, docs de domínio alinhados e backlog consolidado).
- **01/11** · #497 skill `lgpd-audit` versionada e regra de backlog reativo nos agentes (`docs/processo/auditorias-e-planos.md`).
- **31/10** · #489 LGPD: payloads e logs mínimos, anonimização de conta, limites de taxa, página de privacidade (rascunho) e mensagens traduzíveis. Em staging.
- **30–31/10** · #481, #483 e #487: fronteiras de camadas, correções de UX, acessibilidade, estado vazio e anatomia de página.
- **30/10** · #485 cache de dependências e camadas Docker na CI, com o workflow `cache-warmup.yml` (em PR só de changelog, pula a suíte); #476 dependências; #475 release 1.4.4 em produção.
- **24/10** · #465 hotfix 1.4.3 (PHP 8.4.27); #469 e #470 patches de segurança e Laravel 12.70 (S25, S40); #471 hardening do Docker.
- **04–05/10** · #438 a #459: linha de base verde e onda 1 da estabilização (B1, B4, B7 a B10, B13, B17, B19, B29 a B32, B43, B46).
- **01/10** · #434 HTTP/3 desabilitado no Caddy de produção, mantendo h1 e h2.
- **30/09** · #432 débitos técnicos 2026-09: canal privado por espaço, filtro de período, tempo real nas listas, gate do PHPStan e snapshot do `conflict_cache`.
- **29–30/08** · #403 áreas de foco (relatórios com policy e cache, revalidação de conflitos) e #406 regras de reserva (sobreposição síncrona, lock, datas, auto-aprovação).

## Origem dos itens

Os planos e auditorias ficam fora do git (`docs/auditoria*` e `docs/plano-*` estão no `.gitignore`). O que falta de cada um está acima; o detalhe de execução (briefings, consultas, roteiros) fica no material local.

| Plano | Período | Situação | Itens que sobraram |
| --- | --- | --- | --- |
| Auditoria de issues e backlog anterior | ago/2026 | concluído | #46, #49, #98, #104, #107, GAP-06 a GAP-10 |
| Áreas de foco | 28/08 | concluído (#403) | AF-6.3a, AF-6.3b, S38, DEB-D2 |
| Regras de reserva | 29/08 | concluído (#406) | RR-H3, RR-D3, S36 |
| Débitos técnicos 2026-09 | 24–29/09 | fases 01 a 08 no #432; fase 09 parada | DEB-D2, DEB-A1, DEB-D3, DEB-R4, S39 |
| Board e roadmap | 30/09 | absorvido pela estabilização e pela LGPD | decisões D-1 a D-9 |
| Estabilização v1 | 01–10/10 | parado em 10/10; fase 0 e onda 1 entregues | Ondas 3 a 5 e decisões |
| LGPD | 31/10 | em execução; lote 1 em staging | Ondas 1 e 2 |
| i18n | 31/10–01/11 | plano revisado (rev. 3), não iniciado | Onda 6 |

## Como manter

- Item novo entra na onda certa, com ID, prioridade, esforço e critério de pronto.
- Item concluído sai daqui no mesmo PR que o entrega; atualize a data no topo. O histórico fica no `CHANGELOG.md`.
- Auditoria nova é material de trabalho local; ao terminar, o que falta entra aqui e as regras vivas vão para o documento da área. Ver [`processo/auditorias-e-planos.md`](./processo/auditorias-e-planos.md).
