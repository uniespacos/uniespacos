# Templates dos entregáveis

Copie, preencha e apague o que não se aplica. IDs: achados `A-NN`, riscos `R-NN` (reaproveite R01–R14
do guia quando couber, riscos próprios do projeto começam em `R-P01`), tarefas `T-NN`.

---

## 1. Achado (`02-achados.md`)

```markdown
### A-07 — <título curto e factual>

- **Status:** CONFIRMADO | HIPÓTESE | FORA DO ALCANCE DO CÓDIGO
- **Severidade:** S1 | S2 | S3 | S4 · **Esforço:** P | M | G
- **Princípio / artigo:** necessidade (art. 6º, III) · art. 46 · …
- **Risco do catálogo:** R06 Coleção excessiva (ou R-P01 …)
- **Fase do ciclo / ativo:** coleta · sistema `app/Actions/Fortify/CreateNewUser.php`
- **Evidência:**
  - `app/Actions/Fortify/CreateNewUser.php:37` — `'phone' => ['required', …]`
  - comando: `rg -n "telefone" app resources/js` → 3 leituras, nenhuma em fluxo de reserva
- **Por que importa:** <efeito concreto para o titular, 1–3 linhas, sem ameaça>
- **O que está certo aqui (se houver):** <controle existente com evidência>
- **Correção proposta:** <o quê, não o como> → tarefa `T-12`
- **Pergunta ao encarregado/jurídico (se houver):** <vai para o arquivo 05>
```

Regras: título descreve o fato, não a opinião ("Telefone obrigatório sem uso identificado", não
"Coleta abusiva de telefone"); uma evidência por linha; HIPÓTESE lista **o que falta** para virar CONFIRMADO.

---

## 2. Linha do inventário (`01-inventario-de-dados.md`)

| Dado | Categoria (pessoal/sensível) | Titulares | Finalidade | Base legal *candidata* | Coleta | Quem acessa | Compartilha com | Cópias (cache/log/fila/backup/e-mail) | Retenção hoje | Retenção proposta | Eliminação |
|---|---|---|---|---|---|---|---|---|---|---|---|

Preencha **todas** as colunas; "desconhecido" é resposta válida e vira pergunta ao encarregado.
Acompanhe com a matriz ciclo × ativo:

| Fase \ Ativo | Base de dados | Sistema | Equipamento/infra | Pessoas (papéis) | Unidade org. | Doc/arquivo | Medidas de segurança implementadas |
|---|---|---|---|---|---|---|---|
| Coleta | | | | | | | |
| Retenção | | | | | | | |
| Processamento | | | | | | | |
| Compartilhamento | | | | | | | |
| Eliminação | | | | | | | |

---

## 3. Matriz de riscos (`03-matriz-de-riscos.md`)

Escala 5/10/15; nível = P × I; convenção local: `≤25 baixo · 50–75 moderado · ≥100 alto`.

| ID | Risco | Achados | P | I | P×I | Nível | Medidas (T-NN) | Efeito (Reduzir/Evitar/Compartilhar/Aceitar) | P res. | I res. | Residual | Aprovada pelo controlador |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

- Risco residual **alto** → registrar "consultar ANPD antes de prosseguir" (guia §2.5.2.7).
- "Aceitar" exige decisão do controlador (humano), nunca da auditoria.

---

## 4. Plano de adequação (`04-plano-de-adequacao.md`)

Estrutura: **Ondas** por prioridade, tarefas atômicas dentro. Feche cada onda com um critério de saída.

```markdown
## Onda 0 — Contenção imediata (dias)        # S1 e quick wins; sem dependência institucional
## Onda 1 — Fundação (semanas)               # inventário, RIPD v1, encarregado, aviso de privacidade, canal do titular
## Onda 2 — Controles técnicos (sprints)     # minimização, retenção/eliminação, acesso, logs, headers, criptografia
## Onda 3 — Sustentação (contínuo)           # revisão anual de RIPD, testes de regressão de privacidade, treinamento, métricas
```

Tarefa (formato que o `planner`/`master` consomem):

```markdown
### T-12 — <objetivo em uma frase>
executor: backend | frontend | docs | humano
achado: A-07 · risco: R06 · base: art. 6º, III
severidade: S2 · esforço: P · depende de: T-03 (ou "—")
arquivos:
  - app/Actions/Fortify/CreateNewUser.php
  - resources/js/presentation/...
passos:
  - <passo 1>
  - <passo 2: incluir teste com DatabaseTransactions>
pronto quando:
  - `docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test --filter=<Teste>` verde
  - `rg -n "<padrão>" <caminho>` não retorna nada
  - <comportamento observável: tela, rota, ausência de campo>
restrições: <preservar X; não rodar migrate:fresh; sem supressão de lint; sem criar PR sozinho>
```

**Padrões de tarefa reutilizáveis** (ajuste ao achado):

| Padrão | Conteúdo típico |
|---|---|
| Minimizar resposta | trocar `toArray()` por *API Resource* / `only([...])` com lista explícita; teste que afirma as chaves exatas devolvidas (`assertJsonMissing`/`assertInertia ->missing`) |
| Redigir log/Telescope | lista de redação central; `hideRequestParameters` com `password`, `email`, `telefone`; teste que loga e verifica ausência |
| Retenção | comando agendado `prune` por tabela com prazo em `config/`; teste do comando com relógio congelado (`Carbon::setTestNow`) |
| Eliminação/anonimização | serviço único que remove ou anonimiza em transação, incluindo arquivos, notificações e sessões; teste de que nenhuma referência pessoal resta |
| Acesso do titular | rota autenticada "meus dados" + exportação estruturada (JSON/CSV) escopada ao próprio usuário; Policy + teste negativo |
| Transparência | página pública de privacidade (previsão legal, finalidade, procedimentos, encarregado, canal), link no rodapé e no cadastro; chaves de i18n |
| Cabeçalhos | `add_header` CSP/nosniff/referrer no nginx **e** no Caddy; checagem por `curl -I` |
| Documental | agente `docs`: inventário, RIPD, política de retenção, runbook de incidente |
| Institucional | `executor: humano`: nomear encarregado, aprovar base legal, assinar contrato com operador, definir prazos |

Regras do plano:
- Toda tarefa de código vem **com teste** que prova o controle (princípio da prestação de contas).
- Tarefa `humano` nunca bloqueia silenciosamente o resto: indique o que o time pode fazer enquanto espera.
- Não prometa "conformidade": prometa **redução de risco medida** (residual antes/depois).
- Mudança que mexe em dado pessoal dispara atualização de `docs/` pelo agente `docs`.

---

## 5. RIPD simplificado (insumo de `01` e `03`; modelo completo do guia = Anexo I)

```markdown
# RIPD — UniEspaços (versão 0.1, <data>)

## 1. Agentes
Controlador: UESB · Operador(es): <lista> · Encarregado: <nome/cargo> · <e-mail> · <telefone>

## 2. Necessidade de elaborar
<quais gatilhos do guia §2.5.2.2 se aplicam: dado de possíveis menores, perfil comportamental,
decisão automatizada, nova tecnologia, …>

## 3. Descrição do tratamento
3.1 Natureza  — como coleta, retém, trata, usa, elimina; fontes; compartilhamento; operadores por fase; tecnologia nova; medidas atuais
3.2 Escopo    — tipos de dado (sensíveis?), volume, frequência, retenção, nº de titulares, abrangência
3.3 Contexto  — relação com os titulares; controle que têm; vulneráveis; expectativa; experiência anterior
3.4 Finalidade — resultado para o titular; benefício para a instituição/sociedade

## 4. Partes consultadas
<encarregado, jurídico, segurança, gestores, operadores — e o que cada um apontou>

## 5. Necessidade e proporcionalidade
Base legal · minimização e qualidade · controle sobre operadores · como o art. 18 é atendido ·
informação ao titular · transferência internacional

## 6. Riscos (tabela do arquivo 03)
## 7. Medidas (tabela do arquivo 03)
## 8. Aprovação
Elaborador · Encarregado · Autoridade do controlador · Autoridade do operador   (assinaturas: humano)

## 9. Revisão
Anual ou a cada mudança em finalidade, fluxo, volume, tecnologia ou incidente.
```

---

## 6. Perguntas ao encarregado/jurídico (`05-perguntas-ao-encarregado.md`)

Uma pergunta **fechada**, com o contexto técnico e a decisão que ela destrava.

```markdown
### P-03 — Prazo de retenção do histórico de reservas
Contexto: `reservas` e `horarios` ficam indefinidamente (arquivar não elimina; `archive-soft-delete-flow.md`).
Pergunta: qual prazo e qual destino (eliminar ou anonimizar) após o fim da vigência da reserva?
Destrava: T-21 (comando de retenção) e A-14.
Base citada pelo guia: art. 15–16; Lei 8.159/91 (eliminação via CPAD/TTDD).
```

Perguntas que quase sempre aparecem: base legal por tratamento; quem é o encarregado e onde publicar;
prazos por categoria; destino do histórico ao excluir usuário; contrato com SMTP/hospedagem/backup;
país dos servidores; se há menores no público; qual canal e SLA para pedidos do titular; qual normativo
estadual/institucional rege (o guia é federal); política para dumps de produção e restore em dev.

---

## 7. README da auditoria

Conteúdo mínimo: data-base e commit auditado; escopo e o que ficou de fora; método (esta skill + guia);
**placar** (nº de achados por status e severidade; nº de controles positivos); **top 5 riscos** com
residual; **limitações** (o que o código não prova; matriz do guia é figura; guia é federal e de 2020);
índice dos arquivos; próximos passos e quem decide.
