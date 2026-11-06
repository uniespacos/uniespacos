## Resumo

<!-- O que muda e por quê, em 2 a 4 linhas. -->

## Tipo de mudança

- [ ] `feat`: nova funcionalidade
- [ ] `fix`: correção de bug
- [ ] `perf`: otimização
- [ ] `chore`: refatoração, dependências ou configuração
- [ ] `docs`: documentação
- [ ] `test`: testes

## Como testar

1.

## Itens do backlog

<!-- IDs de docs/backlog.md (ex.: T-46). Escreva "nenhum" se não se aplica. -->

## Validações

- [ ] `npx tsc --noEmit`
- [ ] `npx jest`
- [ ] `npm run lint:check`
- [ ] Testes de backend: `docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test`
- [ ] `vendor/bin/pint --test` (Pint)
- [ ] `composer analyse` (PHPStan)

## Privacidade

**Esta mudança coleta, exibe, exporta, compartilha ou apaga dado pessoal?**

- [ ] Não: esta PR não altera tratamento de dado pessoal.
- [ ] Sim, e os itens abaixo estão atendidos:
  - [ ] Inventário `docs/privacidade/inventario-de-dados.md` atualizado (categoria, finalidade, base legal candidata, acesso, compartilhamento e retenção).
  - [ ] Teste de privacidade ou de payload cobre o dado novo exibido, quando a mudança passa a exibir dado que antes não era visível.
  - [ ] `config/anonimizacao.php` atualizado, quando a mudança cria tabela ou coluna com dado pessoal.
  - [ ] Prazo de retenção definido, ou declarado "a definir (em aprovação)" no inventário.
  - [ ] Nenhum dado pessoal real em fixtures, logs ou documentação.

Referências: [inventário de dados](../docs/privacidade/inventario-de-dados.md) e skill [`lgpd-audit`](../.claude/skills/lgpd-audit/SKILL.md).
