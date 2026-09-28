---
name: testing-and-env
description: Como rodar testes, linters e comandos de dev do UniEspaços sem cair nas armadilhas do ambiente Docker vs Host e com Tolerância Zero no ESLint. Use antes de rodar artisan/testes/build.
---

# Testes e ambiente — UniEspaços

## Divisão de Ambientes: Host vs. Container Docker

Para evitar erros de resolução de rede e dependências:
- **Backend (PHP / Laravel / Composer):** Roda exclusivamente **DENTRO** do container `uniespacos-workspace-1`.
- **Frontend (Node / React / Jest / ESLint / Vite):** Roda diretamente no **HOST**.

Containers relevantes: `uniespacos-workspace-1` (artisan/composer/tests), `uniespacos-app-1` (php-fpm), `uniespacos-postgres-1` (banco; usuário e database `uniespacos`).

---

## Comandos Backend (Dentro do Container)

`php artisan` (e qualquer comando que toque o banco) no host falha com `SQLSTATE[08006] could not translate host name "postgres"`. Sempre execute via Docker:

```bash
# Executar suíte completa de testes backend
docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test

# Executar teste específico
docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test --filter=NomeDoTeste

# Lint e formatação PHP (Pint)
docker exec uniespacos-workspace-1 vendor/bin/pint          # Corrige estilo
docker exec uniespacos-workspace-1 vendor/bin/pint --test   # Apenas verifica

# Análise estática PHP (PHPStan Nível 9)
docker exec uniespacos-workspace-1 composer analyse
```

> ⚠️ **Obrigatório:** `-e APP_ENV=testing` é indispensável nos testes. Sem ele, a sessão do ambiente local vaza e os testes falham com erro 419 (CSRF).

### Armadilha: `fake()->unique()` em Factories
O `TestCase` do Laravel recria o container a cada teste, resetando o estado interno do `Faker::unique()`. Em suítes concorrentes com centenas de testes, métodos distintos podem gerar o mesmo e-mail, causando `UniqueConstraintViolationException` intermitente.  
**Correção Correta:** Fornecer entropia real no factory (ex.: `fake()->userName() . '_' . Str::random(6) . '@test.local'`), nunca usar `retry()` ou engolir a exceção.

---

## Comandos Frontend (Diretamente no Host)

Os comandos de interface e compilação TypeScript executam no host do desenvolvedor:

```bash
# Checagem estrita de tipagem TypeScript
npx tsc --noEmit

# Testes unitários e de integração de componentes (Jest + React Testing Library)
npx jest
npx jest <caminho-do-arquivo>    # Teste focado para iteração rápida

# Linter ESLint 9 Flat Config (Tolerância Zero)
npx eslint resources/js          # ou npm run lint:check (verificação pura)
npx eslint resources/js --fix    # Autofix de regras estilísticas (= npm run lint)

# Formatação Prettier (apenas nos arquivos modificados na tarefa)
npx prettier --write <arquivo>
```

---

## Linter TypeScript/React: Tolerância Zero a Suppressions

O frontend opera sob o **ESLint 9 Flat Config** com `typescript-eslint` em modo `strict-type-checked` e `stylistic-type-checked`.
- **Regra de Qualidade:** Código novo ou modificado não pode introduzir nenhuma nova supressão. Qualquer erro de linting ou tipagem deve ser resolvido na causa raiz do código.
- **Regra de Ouro:** Zero suppressões inline. Se uma regra conflita com código externo, o problema é na tipagem — não suprimindo. Relatar ao time de arquitetura para investigar.

---

## Falha de Teste Não É Para Disfarçar

Nunca mascare um teste quebrado com:
- `skip()`, `it.todo()`, `markTestIncomplete()`;
- Blocos `try/catch` engolindo exceções;
- Mocks que omitem validações reais;
- Afrouxamento indevido de asserções.

Antes de declarar uma tarefa concluída, execute a **suíte completa** (`docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test` e `npx jest`). Apenas a suíte completa identifica regressões cruzadas.

---

## Vite Servindo Módulo Vazio Após Reescrita

Após reescrever um arquivo `.tsx` integralmente, o Vite pode servir um payload vazio (~167 bytes, `sourcesContent: [""]`), causando erro no navegador: `Element type is invalid ... but got: object`.

**Diagnóstico rápido:**
```bash
curl -s http://localhost:5173/resources/js/<caminho>.tsx | wc -c
```
Se o tamanho for ~167 bytes, force a atualização tocando no arquivo:
```bash
touch <caminho>.tsx
```

---

## Usuário de Teste Descartável (Verificação Manual via Browser/CDP)

```bash
docker exec uniespacos-workspace-1 php artisan tinker --execute="
\$u = \App\Models\User::factory()->create(['email' => 'debug-temp@test.local', 'password' => bcrypt('password')]);
\$u->markEmailAsVerified();
\$u->assignRole('institucional');
"
```
*Sempre remova credenciais de teste temporárias ao concluir a inspeção.*
