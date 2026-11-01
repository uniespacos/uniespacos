# Roadmap do UniEspaços

Visão de produto por versão. O histórico de entregas está no [`CHANGELOG.md`](../CHANGELOG.md); aqui ficam apenas a direção e o que vem a seguir.

## Onde estamos (v1.x)

- **Produção:** versão 1.4.4.
- **Staging:** linha 1.5.0 (`1.5.0-rc.x`), com o lote de adequação à LGPD.
- **Frentes em andamento:**
  - **LGPD:** adequação de dados pessoais, página de privacidade e limites de taxa.
  - **Estabilidade e segurança da v1:** confiabilidade dos jobs de reserva, permissões, fuso de negócio, concorrência e backup.
  - **Qualidade e testes:** testes de caracterização, relógio congelado nos testes e redução dos débitos de lint e de análise estática.
  - **Internacionalização:** todo texto que chega ao usuário no idioma escolhido (pt-BR, en, es).

Detalhe e ordem de cada frente: [`backlog.md`](./backlog.md).

## v2.0: próxima versão

**Objetivo:** ampliar os papéis de 3 para 5 e dar à gestão do campus um modelo operacional.

| Papel | Hoje | Na v2 |
| --- | --- | --- |
| Comum | Solicita reservas | Sem mudança |
| Gestor | Gerencia as agendas dos espaços vinculados | Sem mudança |
| Institucional | Gestão institucional geral | Configuração inicial e análise; deixa de conduzir o dia a dia do campus |
| Gestor de Unidade (novo) | Não existe | Conduz o campus ou unidade |
| Gestor de Espaço (novo) | Não existe | Manutenção da infraestrutura do espaço; em caso de dupla atribuição, vale a precedência espaço > módulo |

**Frentes da v2:**

- **Aprovação por urgência:** pedido urgente avaliado no mesmo dia, validado contra o expediente do espaço.
- **Setor e expediente:** setor e horário de funcionamento como base da regra de urgência e da visão do Gestor de Unidade.
- **QR Code no espaço:** o usuário lê o código para reportar um problema; antes de abrir chamado, vê um tutorial que pode resolver o caso.
- **Dashboard composto por permissão:** cada bloco aparece conforme a permissão do usuário; quem acumula papéis vê o conjunto.
- **Consolidação das rotas administrativas:** o prefixo `/institucional/*` passa a `/administrativo/*`, porque o Gestor de Unidade também vai operar essas telas (sprint 7, "consolidação retroativa").

**Situação:** a documentação preparatória (sprints 0 a 7) está na branch `docs/v2-0-documentacao-preparatoria`, ainda não mergeada. Antes de executar, faltam o re-baseline dessa documentação (E3-01) e o gate de entrada da v2; ambos em [`backlog.md`](./backlog.md).

## Depois da v2 (horizonte, sem compromisso)

Ideias sem item no backlog, sem prazo e sem design fechado:

- **PWA com notificações push:** já existem `public/manifest.json` e o banner de instalação (`InstallPwaBanner`, `usePwaInstallPrompt`). Falta o service worker, sem o qual não há push nem modo offline.
- **Exportação assíncrona de relatórios:** geração de PDF e Excel em fila, com aviso ao usuário quando o arquivo estiver pronto.
- **Sincronização com calendários:** primeiro passo como exportação para calendários externos (ex.: feed iCal).
- **Listas e buscas com virtualização:** tabelas e seletores para grandes volumes de espaços, reservas e usuários.
- **Esqueletos de carregamento:** substituir o spinner de página inteira por placeholders por página.
- **API de integração com token:** para sistemas acadêmicos e de RH. Hoje não existe `routes/api.php`; os únicos endpoints JSON são os de relatórios.
- **Alocação sugerida e previsão de demanda:** ideias iniciais; dependem de histórico de reservas e de validação com a gestão.

**Itens já com ID no backlog** (apenas referenciados aqui):

- Templates de horário configuráveis pelo gestor: **#104**.
- Busca por necessidade do espaço: **#462**.
- Painel de ocupação e mapa de calor de subutilização: **GAP-08**.

Prioridades e pendências: [`backlog.md`](./backlog.md).
