---
name: known-pitfalls
description: Armadilhas e bugs pré-existentes do UniEspaços. Carregue quando investigar problema ou implementar feature que toca código relacionado.
---

# Armadilhas conhecidas — UniEspaços

## Caminho Órfão no `phpstan-baseline.neon`

**Sintoma:** `composer analyse` (PHPStan Nível 9) falha acusando erro de baseline:
```
Invalid entry in ignoreErrors:
Path "/var/www/app/Http/Controllers/AndarController.php" is neither a directory, nor a file path, nor a fnmatch pattern.
```

**Raiz:** O baseline do PHPStan armazena caminhos fixos de arquivos. Quando um arquivo com erros suprimidos é deletado ou refatorado/movido para outra camada, a referência permanece no baseline sem alvo correspondente em disco.

**Diagnóstico:**
```bash
docker exec uniespacos-workspace-1 composer analyse
```

**Resolução:** Localizar a linha correspondente ao arquivo deletado dentro de `phpstan-baseline.neon` e remover manualmente a entrada órfã, ou regenerar a baseline se expressamente instruído pelo desenvolvedor.

---

## Aviso de Atributos DOM em Mocks de Teste React 19 (Inertia Link)

**Sintoma:** Warnings no console durante a execução do Jest (`console.error`):
```
React does not recognize the 'preserveState' (or 'preserveScroll', 'only', 'as') prop on a DOM element.
```

**Raiz:** No React 19, a validação de atributos repassados para elementos HTML nativos (`<a>`, `<button>`) é estrita. Mocks simplificados de `@inertiajs/react` que repassam todas as props (`<a {...props} />`) vazam propriedades proprietárias do Inertia para o DOM.

**Diagnóstico:** Executar `npx jest` e inspecionar warnings em testes de componentes que utilizam paginação ou navegação (ex.: `PaginacaoListas.test.tsx`).

**Resolução:** Nos mocks de teste de `Link`, desestruturar as props exclusivas do Inertia antes de repassar para o elemento HTML:
```tsx
jest.mock('@inertiajs/react', () => ({
    Link: ({ children, href, preserveState, preserveScroll, only, ...rest }: any) => (
        <a href={href} {...rest}>{children}</a>
    ),
}));
```

---

## Vite servindo módulo vazio após reescrita

**Sintoma:** Tela em branco com erro no console: `Element type is invalid ... but got: object`.

**Contexto:** Depois de reescrever um `.tsx` por completo (principalmente após `prettier --write`), o dev server às vezes passa a servir aquele módulo **vazio** (~167 bytes, `sourcesContent: [""]`), mesmo que o arquivo em disco esteja íntegro.

**Diagnóstico:**
```bash
curl -s http://localhost:5173/resources/js/<caminho>.tsx | wc -c
```

Se vier ~167 bytes ou bem menor que o esperado, é isso — não é bug de import/export.

**Resolução:** `touch <arquivo>` para forçar recompilação.

**Prevenção:** Evite reformatar (prettier) arquivo inteiro imediatamente após reescrevê-lo em bloco — deixe o dev server estabilizar primeiro (30s) ou reinicie Vite.

---

## Queue worker não relê código após alteração

**Sintoma:** Alteração em Job, Event, Notification ou classe usada por eles **não executa** — código antigo continua rodando como se nada tivesse mudado, sem erro nenhum.

**Raiz:** `queue:work` carrega a aplicação inteira na memória ao subir. Qualquer mudança de código só passa a valer **após restart do worker**.

**Diagnóstico:** Comparar data de restart do worker com data do commit:
```bash
docker inspect uniespacos-queue-worker-1 --format '{{.State.StartedAt}}'
```

Se o commit é mais recente que StartedAt (em UTC), é isso.

**Resolução:**
```bash
docker restart uniespacos-queue-worker-1
```

**Para broadcasts:** Separar problema de backend de problema de frontend:
```bash
docker logs uniespacos-reverb-1 | grep "Broadcasting To"
```

Se não aparecer a mensagem esperada, o problema está no backend (Job/Event não disparou). Se aparecer, o problema é no frontend (listener não está ouvindo).

---

## N+1 em listagem por eager loading faltante

**Antecedentes:** Dois bugs reais neste projeto causados por falta de eager loading:

1. **UserRepositoryEloquent::getPaginatedForAdminByInstituicao()** sem `with('roles.permissions')`: disparava 3 queries Spatie **por usuário**. Com 400+ usuários, dava timeout.

2. **Espaco::$appends = ['is_favorited_by_user']** sem cache por request: rodava um `EXISTS` **por espaço**, em toda serialização de lista de espaços. Um único request gerou 116 queries.

**Como detectar:** Usar DevTools ou `dd(DB::getQueryLog())` em listagem. Se o número de queries cresce linearmente com o número de registros, é N+1.

**Resolução padrão:**

```php
// Ruim: carrega 1 query de usuários + N queries de roles/permissions
$users = User::paginate(10);
$users->map(fn($u) => $u->roles); 

// Bom: carrega 1 + 1 (roles) + 1 (permissions)
$users = User::with('roles.permissions')->paginate(10);
$users->map(fn($u) => $u->roles); 
```

Para accessor calculado que acessa relação:

```php
// Ruim
class Espaco extends Model {
    protected $appends = ['is_favorited'];
    
    function getIsFavoritedAttribute() {
        return $this->favoritos()->exists(); // 1 query por registro
    }
}

// Bom: eager-load e cache por request
class Espaco extends Model {
    function getIsFavoritedAttribute() {
        static $cache = [];
        return $cache[$this->id] ??= $this->favoritos()->exists();
    }
}
```

**Checklist antes de fechar tarefa de listagem:**
- [ ] Há `with(...)` para toda relação acessada dentro de `map()`/`foreach`?
- [ ] Accessor calculado tem cache estático por request?
- [ ] Rodei `DB::getQueryLog()` e contei — é fixo (eager-loaded) ou cresce com registros (N+1)?

---

## IDOR: autorização insuficiente em controller

**Antecedente:** Regressão real neste projeto — controller checava "dono via query" mas não passava por Policy.

**Exemplo ruim:**
```php
// Insuficiente — se $request->user() conseguir adivinhar o ID de outro usuário
$espaco = Espaco::where('id', $id)->where('user_id', $request->user()->id)->first();
return response()->json($espaco);
```

**Padrão correto:**
```php
// Sempre passar por Policy
$espaco = Espaco::findOrFail($id);
$this->authorize('view', $espaco); // se falhar, lança AuthorizationException
return response()->json($espaco);
```

**Checklist antes de fechar tarefa de controller:**
- [ ] Toda action que expõe ou altera dado de outro usuário chama `$this->authorize(...)`?
- [ ] Query não é o guard — é só um otimização (ex.: `where('user_id', ...)`)?

---

## Container Reverb parado causa falhas intermitentes na suíte de testes

**Sintoma:** Falhas aleatórias e aparentemente não relacionadas entre execuções:
- `ReservaArquivamentoTest > cancelar reserva ativa continua notificando` falha com status `'failed'` em vez de `'completed'`
- `ValidateReservationConflictsJobTest` falha esperando `'completed'` mas recebendo `'failed'`
- O conjunto de testes que falha **muda entre execuções** — não é determinístico.

**Raiz:** O container `uniespacos-reverb-1` está parado. Quando um Job ou Notification tenta fazer broadcast via Reverb, a conexão falha com:
```
BroadcastException: Pusher error: cURL error 6: Could not resolve host: reverb
```
Essa exceção não é capturada no job, derruba a execução e marca o job como `'failed'`. Como a exception não menciona "Reverb" no nome do teste, o problema parece ser de lógica de negócio.

**Diagnóstico:**
```bash
docker ps -a --format '{{.Names}}\t{{.Status}}' | grep uniespacos
```

Procure por `Exited` em qualquer linha. Se `uniespacos-reverb-1` aparecer com status `Exited`, é isso.

**Resolução:**
```bash
docker start uniespacos-reverb-1
docker exec uniespacos-workspace-1 getent hosts reverb
```

Confirme que `reverb` resolve e o container está em `running`. Com o Reverb no ar, a suíte fecha em 256 passed / 0 failed.

---

## Reverb vs. comunicação interna

**Regra:** `REVERB_SCHEME=http` para comunicação interna (backend → Reverb, dentro do Docker). HTTPS só no caminho externo (browser → Caddy → Reverb).

**Contexto:** Reverb roda em HTTP interno. Se você forçar HTTPS na URL interna, vai dar SSL error mesmo que o certificado Caddy esteja correto.

**Quando mexer:** Se implementar broadcast ou WebSocket, confirme que o backend está usando `http://reverb:8080` (ou equivalente em .env), não `https://`.
