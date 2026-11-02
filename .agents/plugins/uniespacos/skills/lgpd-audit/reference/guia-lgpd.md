# Conhecimento prático do Guia LGPD (APF, v2.0, ago/2020)

Resumo operacional, organizado para auditoria. Os números de artigo são da Lei 13.709/2018; as
seções entre parênteses são do guia. O que **não** está no guia vem marcado com ⚠ **fora do guia**.

## 1. Papéis

- **Controlador**: quem decide finalidade e meios. Aqui: a pessoa jurídica UESB (representada pela
  autoridade que decide). *Quem tem autonomia decisória é controlador; quem só executa sob ordem é operador.*
- **Operador**: trata dados em nome do controlador (agente público, ou empresa contratada). No
  UniEspaços, provedor de e-mail, hospedagem/nuvem, backup e qualquer SaaS que receba dado são
  **operadores em potencial** — exigem contrato/instrumento com obrigação de seguir a LGPD.
- **Encarregado** (art. 5º, VIII; art. 41): canal entre controlador, titulares e ANPD. Identidade e
  contato **devem ser públicos** (art. 41, §1º): nome, cargo, localização, horário, telefone e e-mail
  específicos.
- **Tratamento** = qualquer operação: coleta, produção, recepção, classificação, utilização, acesso,
  reprodução, transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação,
  avaliação, modificação, comunicação, transferência, difusão, extração. **Ver a tela com o dado já é
  "acesso"; logar o dado é "armazenamento"; mandar por e-mail é "transmissão".**

## 2. Dado pessoal: o que conta

- **Dado pessoal** (art. 5º, I): informação relacionada a pessoa natural **identificada ou
  identificável**. "Identificável" inclui identificação indireta por cruzamento. Nome, e-mail,
  telefone, CPF, endereço, foto, IP: todos são dado pessoal. Dado **objetivo ou subjetivo**: "fulano é
  confiável" também é.
- Um dado se relaciona à pessoa se (i) é sobre ela, (ii) serve para avaliá-la/seu comportamento, ou
  (iii) afeta seus interesses ou direitos. **Histórico de quem reservou o quê, quando, e quem avaliou,
  é dado sobre comportamento.**
- **Sensível** (art. 5º, II): origem racial/étnica, convicção religiosa, opinião política, filiação a
  sindicato ou organização religiosa/filosófica/política, saúde, vida sexual, genético, biométrico.
  Biométrico e genético são sempre sensíveis; atributo biográfico é sensível conforme o conteúdo.
  Tratamento só em situações indispensáveis, e **o ônus de provar a indispensabilidade é do controlador**.
- **Armadilha de campo livre**: texto digitado pelo usuário (descrição/justificativa de reserva,
  nome de evento) pode revelar dado sensível por inferência (culto, ato sindical, reunião partidária,
  atendimento de saúde). Campo livre sem orientação nem limitação é risco de coleta excessiva.
- **Anonimizado** (art. 12): não permite mais associação direta ou indireta, considerados meios
  técnicos razoáveis; sai do escopo da lei. **Se é reversível, é pseudonimizado e continua sendo dado
  pessoal.** Hash de e-mail sem sal, ID sequencial mantendo tabela de correspondência, "mascarar"
  mantendo outros campos que identificam: tudo isso é pseudonimização no máximo.
- **Pseudonimização**: só atribuível ao titular com informação adicional guardada **separada,
  controlada e segura**. Criptografia conta, se a chave estiver separada.
- Atributos do Decreto 10.046/2019: biográficos (nome, nascimento, filiação, endereço, vínculos),
  biométricos, genéticos, cadastrais (CPF, NIS, título...). Todos são dado pessoal.

## 3. Princípios (art. 6º) — o que cada um exige de um sistema

Além de enquadrar numa base legal, **todos** os princípios têm de ser respeitados (guia §2.1).

| Princípio | Exigência | Como se manifesta em sistema |
|---|---|---|
| Finalidade | Propósito legítimo, específico, explícito e informado, sem uso posterior incompatível | Cada campo coletado tem uma finalidade registrada; dado não é reutilizado para outra coisa (ex.: relatório de "comportamento") |
| Adequação | Tratamento compatível com a finalidade informada, no contexto | Tela/e-mail/relatório mostra o dado só no contexto para o qual foi coletado |
| Necessidade | Mínimo necessário; dados pertinentes, proporcionais e **não excessivos** | Campo obrigatório que ninguém usa; `SELECT *`; `toArray()` expondo coluna além da tela; coleta de IP/UA sem uso |
| Livre acesso | Consulta facilitada e **gratuita** sobre forma, duração e integralidade dos dados | Tela onde o titular vê todos os seus dados e por quanto tempo ficam |
| Qualidade | Exatidão, clareza, relevância, atualização | Titular consegue corrigir; validação de entrada; rotina de verificação contínua |
| Transparência | Informação clara, precisa e acessível sobre o tratamento e os agentes | Aviso de privacidade acessível, identificação do controlador/encarregado |
| Segurança | Medidas técnicas e administrativas contra acesso não autorizado e destruição/perda/alteração/comunicação/difusão acidental ou ilícita | Ver §7 |
| Prevenção | Medidas para prevenir dano | Análise de risco antes de feature nova (RIPD); limite de exposição por padrão |
| Não discriminação | Sem fins discriminatórios ilícitos ou abusivos | Nenhum score/filtro que prejudique grupo; decisão automatizada revisável |
| Responsabilização e prestação de contas | Demonstrar medidas **eficazes** e sua eficácia | Documentos, logs de auditoria, testes automatizados que provam o controle |

## 4. Bases legais (art. 7º; sensível: art. 11)

O guia lista 11 hipóteses. **Não existe caso geral**: avalie caso a caso, **documente** e informe o
titular da hipótese aplicável (mudar depois abala a confiança e a prestação de contas).

| # | Hipótese | Notas do guia para o setor público |
|---|---|---|
| 1 | Consentimento | Só quando as demais forem descartadas. Livre, inequívoco, informado, por finalidade, **revogável a qualquer momento** de forma gratuita e facilitada; autorização genérica é **nula**; ônus da prova é do controlador (guardar o registro); cláusula destacada. Novo compartilhamento exige novo consentimento. |
| 2 | Obrigação legal/regulatória | Precisa identificar a norma e a competência do órgão; **obrigação por contrato não vale**. Informar o titular da norma. |
| 3 | Execução de políticas públicas (art. 7º, III + arts. 23–30) | Controlador pessoa jurídica de direito público. Exige identificar o instrumento que define a política e a competência legal; informar o titular; **indicar encarregado**; dispensa consentimento mas **não** dispensa princípios nem direitos. |
| 4 | Estudos por órgão de pesquisa | Anonimizar sempre que possível; sem transferir a terceiros. |
| 5 | Execução de contrato/procedimentos preliminares | Necessário ao contrato do qual o titular é parte. |
| 6 | Exercício de direitos em processo | Informar o titular com destaque. |
| 7 | Proteção da vida/incolumidade física | Titular impossibilitado de consentir. |
| 8 | Tutela da saúde | Só profissional/serviço de saúde/autoridade sanitária. |
| 9 | Legítimo interesse | **Órgão público não deve usá-lo** para política pública ou competência própria; só para finalidade diversa. Exige dados estritamente necessários, transparência, possível RIPD. |
| 10 | Proteção do crédito | — |
| 11 | Prevenção à fraude e segurança do titular (sensível, autenticação em cadastro eletrônico) | Só se não houver outro meio de identificar sem dado sensível (ex.: biometria). |

**Hipótese de trabalho para o UniEspaços (a validar com o jurídico, não é conclusão):** cadastro e uso
para reserva de espaço da universidade tende a se apoiar em **política pública/competência legal
(7º, III + art. 23)**, eventualmente combinada com **obrigação legal (7º, II)**. Isso **dispensa
consentimento**, mas obriga: informar finalidade/previsão legal/procedimentos publicamente (art. 23, I),
ter encarregado (art. 23, II), garantir os direitos do art. 18 e cumprir os 10 princípios. Se o projeto
pedir "consentimento" por hábito, pergunte se ele é de fato livre e revogável; consentimento falso é pior
que nenhum.

## 5. Direitos do titular (art. 18 e correlatos)

O titular pode requerer, **sem custo**: (I) confirmação de que há tratamento; (II) acesso aos dados;
(III) correção de dado incompleto/inexato/desatualizado; (IV) anonimização, bloqueio ou eliminação de
dado desnecessário, excessivo ou ilícito; (V) portabilidade; (VI) eliminação de dado tratado com
consentimento (exceto art. 16); (VII) informação sobre com quem houve uso compartilhado;
(VIII) informação sobre a possibilidade de não consentir e suas consequências; (IX) revogação do
consentimento. Mais: revisão de decisão unicamente automatizada, com informação dos critérios (art. 20).

No poder público, **prazos e procedimentos seguem legislação específica** (LAI, Lei 9.784/99; o guia
sugere o rito mais célere da Lei 13.460/2017 como padrão e Fala.BR como canal federal). Respostas:
imediata e simplificada, ou declaração completa no prazo legal indicando **origem dos dados,
inexistência de registro, critérios e finalidade**. O titular escolhe resposta eletrônica segura ou
impressa. Quando não puder atender, o controlador informa que não é o agente (e indica quem é) ou
explica as razões de fato/direito.

Mesmo dispensado o consentimento, o titular pode **exigir o cumprimento de todas as obrigações**
(art. 7º, §6º). Dado do exercício de direito **não pode ser usado contra o titular**.

**Eliminação no setor público (art. 16, I):** se o tratamento se funda em obrigação legal/política
pública, a conservação é autorizada e o titular normalmente não pode exigir apagamento — mas isso **não
dispensa** definir prazo, motivo e eliminação ao fim. Documentos arquivísticos seguem a Lei 8.159/91:
eliminação passa por CPAD e tabela de temporalidade (TTDD), nunca por `DELETE` ad hoc.

## 6. Término do tratamento e eliminação (art. 15–16)

Termina quando: finalidade alcançada ou dado deixou de ser necessário; fim do período de tratamento;
revogação/pedido do titular (resguardado o interesse público); ordem da ANPD. Aí os dados **devem ser
eliminados**, salvo: obrigação legal/regulatória; estudo por órgão de pesquisa (anonimizado quando
possível); transferência a terceiro dentro dos requisitos; uso exclusivo do controlador, anonimizado e
sem acesso de terceiro.

**Para auditoria:** "arquivar" (soft delete, flag) **não é eliminar**. Procure: existe prazo de
retenção por tabela? Existe rotina que de fato elimina/anonimiza? O dado eliminado sai também de
cache, fila, log, Telescope, backup, broadcast e relatórios gerados?

## 7. Segurança (art. 46, art. 6º VII) e privacidade desde a concepção

Art. 46: medidas técnicas e administrativas aptas a proteger de acesso não autorizado e de destruição,
perda, alteração, comunicação ou tratamento inadequado/ilícito, **desde a concepção até a execução**
(§2º). Confidencialidade, integridade e disponibilidade durante todo o ciclo, incluindo **destruição
segura, criptografia apropriada, controle de acesso forte e registro (log)**.

**Privacy by Design — 7 princípios (Cavoukian)**, na leitura do guia:
1. Proativo, não reativo — prevenir antes do incidente; métodos para reconhecer projeto ruim antecipadamente.
2. Privacidade como padrão — máxima proteção sem ação do titular.
3. Incorporada ao projeto — parte da arquitetura, não remendo; avaliações de impacto documentadas.
4. Funcionalidade total — sem falsa dicotomia privacidade × funcionalidade/segurança.
5. Segurança ponta a ponta — sem lacuna na proteção em todo o ciclo; "sem segurança forte não há privacidade".
6. Visibilidade e transparência — "confie, mas verifique": responsabilização, abertura, conformidade verificável.
7. Respeito pelo usuário — padrões fortes, avisos claros, interfaces amigáveis, acesso e correção pelo titular.

**Privacy by Default** (liga ao princípio da necessidade): especificar finalidade; limitar a coleta;
**minimizar** (começar com interações não identificáveis; minimizar vinculações); limitar uso, retenção
e divulgação (reter só o necessário e depois eliminar com segurança). **Em dúvida, presunção de
privacidade e princípio da precaução: configuração padrão = a mais protetora.** Acesso: nem todo usuário
deve ter acesso ilimitado e por tempo indeterminado a todo dado pessoal.

Frameworks recomendados pelo guia para medir controles: ISO/IEC 27001, 27002 (14 seções de controles),
27005 (risco), 27701 (privacidade), 29151, 29134 (avaliação de impacto), 31000, CIS Controls;
IN GSI/PR nº 1/2020 (obrigatória para a APF); e-ARQ Brasil / RDC-Arq (CONARQ) para documentos
arquivísticos.

## 8. Ciclo de vida e ativos (cap. 3)

Fases: **Coleta → Retenção → Processamento → Compartilhamento → Eliminação**. *Acesso* atravessa todas.
Ativos: **bases de dados, documentos, equipamentos, locais físicos, pessoas, sistemas, unidades
organizacionais**. Método do guia: para cada fase, listar os ativos envolvidos; depois, para cada
ativo, verificar **quais medidas de segurança estão realmente implementadas** (verde/vermelho). Nuvem
conta: o serviço contratado é um ativo da fase de retenção e de eliminação.

Dados em documentos arquivísticos: a LGPD se aplica ao dado, mas o documento segue a gestão documental.

## 9. Transparência ativa e publicidade (§2.4)

Pessoa jurídica de direito público deve publicar, em linguagem clara e atualizada: **previsão legal,
finalidade, procedimentos e práticas** de cada tratamento (art. 23, I); identidade e contato do
encarregado (art. 41, §1º); hipótese de dispensa de consentimento para dado **sensível** (art. 11, §2º);
versões resumidas dos RIPD; canal para petições (arts. 18 e 20). Dados de difusão obrigatória devem sair
em **formato interoperável e estruturado** (art. 25). Na descrição do serviço público digital, dizer
quais dados são usados e a base legal.

**Para o UniEspaços (aplicação, não do guia):** a transparência vale também *dentro do produto*:
aviso de privacidade acessível no cadastro e no rodapé, e contato do encarregado.

## 10. Crianças e adolescentes (art. 14)

Melhor interesse; consentimento específico e em destaque de pelo menos um dos pais/responsável, com
esforço razoável para verificar. Exceções: contatar os pais ou proteger a criança (uso único, sem
armazenar nem repassar); exercício de direitos/registros públicos. **Relevância para o projeto:**
contexto universitário pode ter menor de 18 (programas de extensão, ensino médio integrado). Se o
cadastro for aberto, pergunte se há controle de idade.

## 11. Compartilhamento (arts. 25–26)

Dentro da Administração, para política pública: previsto em lei, dispensa consentimento específico,
**mas o órgão que coleta deve informar com quem compartilha**; quem recebe justifica com política
pública específica. Fora da Administração: comunicar o titular; **mudança de finalidade ou novo
compartilhamento exige nova comunicação** (e, se a base for consentimento, novo consentimento).
Notificações por e-mail e relatórios exportados são compartilhamento/difusão: avalie quem recebe e o quê.

⚠ **Fora do guia (conferir):** transferência internacional (art. 33) — SaaS, CDN, fontes, analytics,
provedores de e-mail com servidores no exterior; o guia só menciona "salvaguardas" como item do RIPD.

## 12. RIPD — Relatório de Impacto (§2.5, Anexo I)

Documento do controlador (art. 5º, XVII) que descreve tratamentos que podem gerar risco às liberdades
civis e direitos fundamentais e as medidas/salvaguardas/mitigação. **Conteúdo mínimo (art. 38, par.
único):** tipos de dados coletados, metodologia de coleta e de garantia de segurança, análise das medidas
de mitigação. Elaborar **antes** do tratamento, na fase inicial do projeto. A ANPD pode exigir a qualquer
momento. **Revisar anualmente ou a cada mudança relevante.**

**Quando fazer/atualizar** (lista do guia): nova tecnologia/serviço com dado pessoal ou sensível;
rastreamento de localização ou **perfil comportamental**; dado sensível; **decisão automatizada** com
efeito para o titular; dado de criança/adolescente; tratamento que cause dano se vazar; legítimo
interesse; mudança de lei/política/fluxo de dados/finalidade/volume; reforma administrativa; falha de
segurança ou nova preocupação pública.

**Etapas:** 1) identificar controlador, operador, encarregado (+ e-mail e telefone); 2) justificar a
necessidade do RIPD; 3) descrever o tratamento — **natureza** (como coleta, retém, trata, usa, elimina;
fonte; com quem compartilha; operadores e em que fases; tecnologia nova; medidas atuais), **escopo**
(tipos de dado, quais sensíveis, volume, frequência, retenção, nº de titulares, área geográfica),
**contexto** (relação com os titulares, controle que eles têm, vulneráveis, expectativa deles, experiência
anterior), **finalidade** (resultado para o titular, benefício para o órgão/sociedade); 4) partes
consultadas; 5) necessidade e proporcionalidade (base legal, qualidade/minimização, controle do operador,
art. 18, informação ao titular, transferência internacional); 6) riscos (P × I); 7) medidas
(**Reduzir, Evitar, Compartilhar, Aceitar**; risco residual; aprovada sim/não); 8) aprovação (elaborador,
encarregado, controlador, operador); 9) revisão.

**Catálogo de riscos do guia (Tabela 5)** — P/I/nível exemplificativos:

| ID | Risco | P | I | P×I |
|---|---|---|---|---|
| R01 | Acesso não autorizado | 10 | 15 | 150 |
| R02 | Modificação não autorizada | 10 | 15 | 150 |
| R03 | Perda | 5 | 15 | 75 |
| R04 | Roubo | 5 | 15 | 75 |
| R05 | Remoção não autorizada | 5 | 15 | 75 |
| R06 | Coleção excessiva | 10 | 10 | 100 |
| R07 | Informação insuficiente sobre a finalidade | 10 | 15 | 150 |
| R08 | Tratamento sem base legal/consentimento | 10 | 15 | 150 |
| R09 | Falha em considerar direitos do titular (ex.: acesso) | 5 | 15 | 75 |
| R10 | Compartilhar com terceiros fora da APF sem consentimento | 10 | 15 | 150 |
| R11 | Retenção prolongada sem necessidade | 10 | 5 | 50 |
| R12 | Vinculação/associação indevida, direta ou indireta, ao titular | 5 | 15 | 75 |
| R13 | Falha/erro de processamento (script que atualiza dado errado, ausência de validação de entrada) | 5 | 15 | 75 |
| R14 | Reidentificação de dados pseudonimizados | 5 | 15 | 75 |

Exemplo de medidas do guia para R01: controle de acesso lógico, desenvolvimento seguro, segurança em
redes (residual 5×10 = 50).

## 13. Incidentes e evidências

O guia manda: **plano de comunicação de incidentes** (celeridade, padronização, responsáveis);
**documentar violações e incidentes** para análise periódica de risco; conscientização contínua.

⚠ **Fora do guia (conferir vigência e prazos antes de citar):** art. 48 da LGPD (comunicar ANPD e titular
em prazo razoável) e a regulamentação posterior da ANPD sobre comunicação de incidente de segurança.

## 14. Sanção e responsabilidade (contexto para priorizar)

O titular pode representar à ANPD, a órgãos de defesa do consumidor ou ir a juízo, individual ou
coletivamente, se a petição não for respondida com agilidade, clareza e completude. Infração por órgão
público atrai RIPD (arts. 31–32). Há responsabilidade por dano (art. 42). ⚠ **Fora do guia:** sanções do
art. 52 (advertência, publicização, bloqueio/eliminação de dados, multa — esta última com regime próprio
para o setor público). Use isto para justificar prioridade, não para ameaçar.

## 15. Normas citadas no Anexo II (para saber o que autoriza tratamento)

Lei 9.507/97 (habeas data); 9.784/99 (processo administrativo); 12.527/2011 (LAI) e Decreto 7.724/2012;
12.965/2014 (Marco Civil — guarda de registros de acesso) e Decreto 8.771/2016; Decreto 8.936/2016
(serviços digitais); Lei 13.444/2017 (ICN); 13.460/2017 (direitos do usuário de serviço público) e
Decreto 9.492/2018; Decreto 9.278/2018 (identidade); Lei 13.709/2018 (LGPD) e 13.853/2019 (ANPD);
Decreto 9.723/2019 (CPF); Decreto 10.046/2019 (governança de compartilhamento). **Marco Civil é
relevante ao projeto:** logs de acesso a aplicação têm regra própria de guarda, que convive com a
minimização da LGPD; deixe a decisão de prazo com o jurídico.
