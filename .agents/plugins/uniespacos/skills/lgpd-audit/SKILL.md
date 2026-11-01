---
name: lgpd-audit
description: Auditoria crítica de código e de governança do UniEspaços contra a LGPD, baseada no Guia de Boas Práticas LGPD (Comitê Central de Governança de Dados, v2.0, ago/2020), com geração de plano de adequação priorizado. Use ao auditar privacidade/dados pessoais, antes de criar feature que colete, exiba, exporte, compartilhe ou apague dado de pessoa, ao montar RIPD/inventário de dados, ou ao priorizar adequação à LGPD.
---

# Auditoria LGPD — UniEspaços

Skill de **método + conhecimento**. Ela não declara o projeto conforme ou não conforme: ensina a
produzir uma auditoria com evidência e um plano executável. O conteúdo do guia está em
`reference/`; carregue só o que a fase pedir.

## Postura

Seja crítico. O padrão é **"não demonstrado"**, não "provavelmente ok". LGPD cobra
*responsabilização e prestação de contas* (art. 6º, X): conformidade que não dá para comprovar
com código, configuração ou documento conta como lacuna.

Regras de conduta (inegociáveis):

1. **Evidência obrigatória.** Todo achado cita `arquivo:linha` ou comando + saída. Sem evidência, o
   achado vira "hipótese" e entra numa lista separada.
2. **Três status, nunca mais.** `CONFIRMADO` (viu no código/config), `HIPÓTESE` (indício, falta
   confirmar), `FORA DO ALCANCE DO CÓDIGO` (depende de decisão jurídica/institucional: base legal,
   encarregado, prazo de retenção, contrato com operador). Não invente resposta para o terceiro.
3. **Conclusão jurídica não é sua.** Você aponta o risco técnico e a pergunta que o encarregado/jurídico
   da UESB precisa responder. Base legal, tabela de temporalidade e contratos são decisão deles.
4. **Registre também o que está bom**, com evidência. Auditoria que só lista defeito não serve para
   priorizar nem para prestar contas.
5. **Somente leitura.** A auditoria não altera código, banco ou ambiente. Correções viram tarefas.
6. **Nunca abra dados reais.** Há dumps `.sql` na raiz do repositório (ver
   `reference/pontos-de-partida.md`). Inspecione **só o esquema** (`grep -n "CREATE TABLE"`), jamais
   linhas de dados. Ler `COPY public.users ...` é, em si, um tratamento de dado pessoal sem finalidade.
7. Respeite as regras invioláveis do projeto: nada de `migrate:fresh`, `db:wipe`, `RefreshDatabase`.

## Fluxo

```
F0 Escopo  →  F1 Inventário  →  F2 Princípios  →  F3 Direitos do titular
   →  F4 Segurança  →  F5 Governança  →  F6 Risco  →  F7 Plano
```

| Fase | Pergunta central | Fonte |
|---|---|---|
| F0 Escopo | Quais fluxos/telas/jobs entram? Qual a data-base e o commit auditado? | `git rev-parse HEAD` |
| F1 Inventário | Que dado pessoal existe, onde nasce, onde mora, para quem vai, quando morre? | `reference/pontos-de-partida.md`, `reference/guia-lgpd.md` §Ciclo de vida |
| F2 Princípios | Cada um dos 10 princípios do art. 6º é demonstrável no código? | `reference/checklist-e-sondas.md` §A |
| F3 Direitos | O titular consegue exercer cada direito do art. 18 por algum canal? | `reference/checklist-e-sondas.md` §B |
| F4 Segurança | Art. 46: acesso, vazamento, log, backup, criptografia, retenção técnica | `reference/checklist-e-sondas.md` §C |
| F5 Governança | Existem encarregado, política, RIPD, registro de operações, plano de incidente? | `reference/checklist-e-sondas.md` §D |
| F6 Risco | Probabilidade × impacto de cada risco, residual após medida | `reference/guia-lgpd.md` §RIPD + escala abaixo |
| F7 Plano | O que fazer, em que ordem, quem executa, como saber que acabou | `reference/templates.md` |

### F1 — Inventário (faça primeiro, tudo depende dele)

Monte a tabela **dado × ativo × fase do ciclo** (coleta, retenção, processamento,
compartilhamento, eliminação). Para cada dado: finalidade, base legal *candidata*, quem acessa, quem
recebe, onde é copiado (cache, fila, log, Telescope, broadcast, e-mail, relatório, backup) e prazo de
retenção. **Cópias esquecidas são onde mora o risco**; procure-as ativamente.

### F6 — Escala de risco

Escala do guia: probabilidade e impacto valem 5 (baixo), 10 (moderado) ou 15 (alto); nível = P × I.
O guia mostra a matriz só como figura. Esta skill adota, como **convenção local**:
`≤ 25 baixo` · `50–75 moderado` · `≥ 100 alto`. Risco residual **alto** após as medidas exige consulta à
ANPD antes de seguir (guia, §2.5.2.7). Use o catálogo R01–R14 (`reference/guia-lgpd.md`) como ponto de
partida, não como limite: acrescente riscos que o projeto tem e o catálogo não prevê.

### Severidade do achado (para ordenar o plano)

| Sev. | Critério |
|---|---|
| **S1 Crítico** | Exposição ou perda de dado pessoal possível hoje, sem pré-condição rara; ou obrigação legal inexistente com dado em produção |
| **S2 Alto** | Princípio violado de forma sistêmica (coleta excessiva, retenção sem fim, sem canal de direito) |
| **S3 Médio** | Controle existe mas é incompleto, inconsistente ou não comprovável |
| **S4 Baixo** | Melhoria de higiene, sem risco concreto identificado |

Combine severidade com esforço (P/M/G) e dependência (código, documento, decisão institucional) para
ordenar. **Quick wins de S1/S2 vêm antes de qualquer projeto grande.**

## Entregáveis

Gravar em `docs/auditoria-lgpd-<AAAA-MM-DD>/`, no mesmo padrão das auditorias existentes em `docs/`
(`README.md` + arquivos numerados):

```
README.md                      resumo executivo, escopo, commit, limitações
01-inventario-de-dados.md      tabela dado × ativo × ciclo (F1)
02-achados.md                  achados com evidência (F2–F5), formato em templates.md
03-matriz-de-riscos.md         P × I, residual, medidas (F6)
04-plano-de-adequacao.md       tarefas priorizadas por executor (F7)
05-perguntas-ao-encarregado.md tudo que é FORA DO ALCANCE DO CÓDIGO
```

Modelos de cada arquivo (achado, linha de plano, RIPD simplificado, perguntas): `reference/templates.md`.

## Plano de adequação → execução

O plano usa o formato que o `planner`/`master` já consomem (`executor`, `objetivo`, `arquivos`,
`passos`, `pronto quando`). Cada tarefa:

- é atômica e verificável (comando de teste, grep que deve voltar vazio, tela que deve existir);
- tem `executor: backend | frontend | docs | humano` (`humano` = decisão institucional, contrato, nomeação);
- aponta o achado de origem (`A-07`) e o artigo/princípio da LGPD;
- respeita as regras do projeto (testes com `DatabaseTransactions`, Notification `ShouldQueue`,
  zero supressão de lint, PR só quando o usuário autorizar).

Mudança que altere regra de dados pessoais deve disparar o agente `docs` (ver tabela no `master`):
`models-business-rules.md`, `authorization-policies.md`, `notifications-and-channels.md`.

## Limites do guia (leia antes de citar)

- É de **ago/2020**, escrito para a **Administração Pública Federal**. A UESB é autarquia estadual:
  Fala.BR, GTA/CGU, CCD/TTDD do Arquivo Nacional e IN GSI/PR nº 1/2020 valem aqui como **referência por
  analogia**, não como obrigação direta. Cabe ao jurídico dizer qual normativo estadual/institucional manda.
- **Não cobre** o que a ANPD regulamentou depois (comunicação de incidente, encarregado, agentes de
  pequeno porte, dosimetria). Se for citar, marque "fora do guia — conferir vigência".
- Tem imprecisões editoriais (ex.: título "4.1.2 Privacidade desde a concepção" repetido, que é *por
  padrão*; LAI datada "2018" em vez de 2011). Não propague.
- A matriz probabilidade × impacto (Fig. 2) e os diagramas de ciclo de vida são imagens; o texto
  extraído não os contém.

Detalhe do que o guia diz, por tema: `reference/guia-lgpd.md`.
