---
name: memory-management
description: Protocolo de otimização de contexto usando a ferramenta MCP ai-memory. OBRIGATÓRIO no início de qualquer ciclo de planejamento e na conclusão de etapas lógicas.
---

# Protocolo de Gerenciamento de Memória (ai-memory)

Como você não possui um sensor nativo para saber quando atingiu o limite de tokens da janela de contexto, adotamos uma abordagem orientada a eventos lógicos de desenvolvimento para manter o contexto enxuto, utilizando a ferramenta MCP `ai-memory`.

## READ_TRIGGER
**Quando:** Ao iniciar o planejamento de uma nova task.
**Ação:** O `planner` (ou o agente responsável pelo planejamento) deve obrigatoriamente consultar o `ai-memory` para carregar as decisões arquiteturais vigentes e o contexto do projeto. Use a tool de leitura fornecida pelo MCP do `ai-memory` para buscar informações antes de investigar o código.

## WRITE_TRIGGER
**Quando:** Ao concluir uma etapa funcional lógica (ex: finalizar uma rota/controller no backend, integrar um formulário no frontend) ou após 5 turnos seguidos de resolução de bugs.
**Ação:** O `master` deve acionar a ferramenta de MCP do `ai-memory` para consolidar o estado atual, gravando as decisões, mudanças recentes e os próximos passos.

## REFRESH_PROTOCOL
**Quando:** Após a execução do WRITE_TRIGGER.
**Ação:** Se a sessão atual já envolveu múltiplas leituras de arquivos, execução de testes extensos ou resolução de erros complexos, o contexto provavelmente está degradando. Neste caso, o `master` deve pausar o fluxo e recomendar ao usuário com a seguinte mensagem exata:
"Estado salvo no ai-memory. Por favor, encerre esta sessão e inicie uma nova para limparmos a janela de contexto."
