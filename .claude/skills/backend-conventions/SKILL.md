---
name: backend-conventions
description: Convenções de backend do UniEspaços (camadas, autorização, eager loading, requests). Use antes de criar controller/service/repository novo ou tocar em listagem/query.
---

# Convenções de backend — UniEspaços

## Camadas: Controller → Service → Repository

```
app/Http/Controllers/...       # fino: chama o Service, monta a resposta (Inertia::render ou redirect)
app/Services/...Service.php    # regra de negócio, orquestra repositories
app/Repositories/
    ...RepositoryInterface.php # contrato
    ...RepositoryEloquent.php  # implementação Eloquent
```

Toda interface nova precisa de binding em `app/Providers/AppServiceProvider.php`:

```php
$this->app->bind(FooRepositoryInterface::class, FooRepositoryEloquent::class);
```

Controller não fala com Eloquent direto — se você está tentado a fazer `Model::where(...)` dentro de
um Controller, esse código pertence ao Repository (ou Service, se for regra de negócio).

## Validação e autorização

- **Validação**: `FormRequest` dedicado (`app/Http/Requests/`), nunca `$request->validate()` inline
  em controller de rota já estabelecida.
- **Autorização**: Policy (`app/Policies/`) + Spatie Permission. Toda action que expõe ou altera dado
  de outro usuário chama `$this->authorize(...)` — checar só o "dono via query" não é suficiente,
  já causou regressão de IDOR neste projeto (ver `git log --grep=IDOR`).

## Eager loading é obrigatório em listagem

Isto já foi bug real, duas vezes, neste projeto:

- `UserRepositoryEloquent::getPaginatedForAdminByInstituicao()` sem `with('roles.permissions')`
  disparava 3 queries do Spatie **por usuário** listado — 400+ usuários = timeout.
- `Espaco::$appends = ['is_favorited_by_user']` sem cache por request rodava um `EXISTS` **por
  espaço**, toda vez que qualquer tela serializava uma lista de espaços — 116 queries num único
  request (ver `app/Models/Espaco.php`, `getIsFavoritedByUserAttribute()`, para o padrão de cache
  estático por request que resolveu).

Antes de fechar uma tarefa que envolve listagem: se há relação acessada dentro de `map()`/`foreach`,
ou um accessor calculado, confirme que está eager-loaded ou memorizado — não assuma que "são poucos
registros hoje" continua verdade.

## Redirect que preserva estado

Depois de update/delete disparado a partir de uma lista paginada/filtrada, prefira `back()` a
`redirect()->route(...)` fixo — senão a ação joga o usuário de volta para a página 1 sem filtro.
Exceção: quando o fluxo intencionalmente muda de tela (ex.: criar registro e ir para o show dele).

## Paginação e busca

Padrão: `->paginate(10)`. Se a tela tem busca/filtro, o filtro **tem que rodar no banco**
(`->where(...)` antes do `paginate()`), nunca filtrar o array já paginado no frontend — isso esconde
resultados que estão em outras páginas.

## Comentários — regra rígida

Nada de comentário inline explicando o que o código faz — nome de classe/método/variável já
faz esse trabalho. Isso inclui comentário de "o quê", comentário referenciando a tarefa/issue atual,
código comentado deixado para trás, e bloco de comentário decorativo separando seções.

PHPDoc é permitido, mas só quando agrega algo que a assinatura não deixa óbvio: `@throws` de exceção
não convencional, contrato de efeito colateral, uma constraint de negócio não expressável em tipo.
Método com nome e assinatura autoexplicativos não leva PHPDoc nenhum.

Antes de terminar a tarefa, rode `vendor/bin/pint` e `composer analyse` (PHPStan nível 9, com
baseline em `phpstan-baseline.neon` cobrindo dívida técnica pré-existente — código novo ou tocado
por você não pode entrar na baseline; se `analyse` reclamar de linha sua, corrija o tipo, não
adicione a linha na baseline).

## Rotas administrativas sob demanda

Dado pesado que só uma tela específica de um fluxo (ex.: modal de edição de permissões) precisa não
entra no payload da listagem — vira endpoint próprio, buscado só quando o modal abre. Ver
`InstitucionalUsuarioController::permissionContext()` como referência do padrão.
