# 🛡️ Guia Canônico de Regras Invioláveis, Padrões Arquiteturais e Design System

> **Documento Canônico de Referência:** `docs/REGRAS_INVIOLAVEIS_E_PADROES.md`  
> **Sistema:** UniEspaços (UESB)  
> **Stack Base:** Laravel 12 (PHP 8.4) + Inertia 2 + React 19 + TypeScript 5.8 + Tailwind v4 + PostgreSQL 16 + Laravel Reverb (WebSocket) + Docker.  
> **Finalidade:** Servir de referência universal e mandatória para prompts, agentes de IA e desenvolvedores, eliminando a necessidade de reescrever diretrizes a cada nova tarefa.

---

## 🧭 1. Como Referenciar Este Documento

Em qualquer novo prompt ou comando de execução, basta incluir:

```markdown
Siga rigorosamente as diretrizes e regras invioláveis definidas em @docs/REGRAS_INVIOLAVEIS_E_PADROES.md
```

---

## 🚫 2. Regras Invioláveis de Infraestrutura e Banco de Dados

1. **Zero Alteração no Schema do Banco de Dados:**
    - Proibido criar ou executar migrations que modifiquem tipos de colunas, constraints ou excluam campos do PostgreSQL 16 sem alinhamento prévio. O schema vigente é 100% preservado.
2. **Comandos Destrutivos Estritamente Banidos:**
    - **NUNCA executar:** `php artisan migrate:fresh`, `migrate:reset`, `db:wipe`, `cache:clear --database`.
3. **Isolamento de Testes de Backend:**
    - **NUNCA usar `RefreshDatabase` em testes.** Utilizar sempre a trait `DatabaseTransactions` (padrão em `tests/TestCase.php`).
4. **Execução Obrigatória dentro do Container Docker:**
    - Todos os comandos do Artisan e Pint rodam no container de workspace:
        ```bash
        docker exec uniespacos-workspace-1 php artisan <comando>
        docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test
        docker exec uniespacos-workspace-1 vendor/bin/pint
        ```
    - O flag `-e APP_ENV=testing` é obrigatório em testes de backend para evitar vazamento de sessão/CSRF (419).
5. **Filas, Notificações e Jobs Assíncronos:**
    - Toda `Notification` deve implementar `ShouldQueue`.
    - Chamadas a `$notifiable->notify()` dentro de Jobs devem estar sempre envolvidas em blocos `try-catch` para evitar falha silenciosa por indisponibilidade do provedor de e-mail.
    - **Reinício do Queue Worker:** O worker (`uniespacos-queue-worker-1`) não relê código quente. Sempre que Jobs, Events, Notifications ou Enums PHP forem criados ou alterados, execute:
        ```bash
        docker restart uniespacos-queue-worker-1
        ```
6. **Laravel Reverb (WebSockets):**
    - Configurar `REVERB_SCHEME=http` para comunicação interna (backend → Reverb no Docker). HTTPS é reservado apenas para a rota pública externa (Browser → Caddy → Reverb).

---

## 🎨 3. Design System, Theming & Convenções de Frontend

### 3.1 Paleta Semântica Catppuccin sob Tailwind v4 (`@theme`)

- **PROIBIDO:** Usar cores fixas/hardcoded como `bg-red-500`, `text-blue-600`, `bg-[#3b82f6]` ou classes arbitrárias de cores.
- **OBRIGATÓRIO:** Utilizar exclusivamente tokens semânticos com suporte nativo a modo Claro (_Catppuccin Latte_) e Escuro (_Catppuccin Frappé_):
    - Superfícies: `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`
    - Marca: `bg-primary`, `text-primary-foreground`
    - Secundário / Neutro: `bg-secondary`, `text-secondary-foreground`, `bg-muted`, `text-muted-foreground`
    - Acentos de Status:
        - Sucesso / Deferida: `bg-success`, `text-success-accent`, `bg-success-subtle`, `border-success-accent/30`
        - Aviso / Em Análise: `bg-warning`, `text-warning-accent`, `bg-warning-subtle`, `border-warning-accent/30`
        - Erro / Indeferida: `bg-destructive`, `text-destructive-accent`, `bg-destructive-subtle`, `border-destructive-accent/30`
        - Info / Ocupado: `bg-info`, `text-info-accent`, `bg-info-subtle`, `border-info-accent/30`
        - Inativa / Cancelada: `bg-neutral-accent`, `text-neutral-accent`, `bg-neutral-subtle`, `border-neutral-accent/30`
    - Bordas e Anéis: `border-border`, `ring-ring`

### 3.2 Modais e Diálogos: Padrão Ergonômico `<ResponsiveModal>`

- **PROIBIDO:** Instanciar primitivos `<Dialog>` diretamente para formulários ou fluxos interativos de usuário.
- **OBRIGATÓRIO:** Usar a molécula híbrida **`<ResponsiveModal>`** (`@/presentation/molecules/ResponsiveModal`):
    - **Mobile (`< 768px`):** Renderiza automaticamente `<Drawer>` (Vaul bottom-sheet adaptado para toque).
    - **Desktop (`≥ 768px`):** Renderiza `<Dialog>` centralizado com overlay e trap de foco.
    - **Tamanhos Homologados:** `'sm' | 'md' | 'lg' | 'xl'`.
- **Exceção para Ações Destrutivas:** Confirmações críticas de exclusão utilizam `<ConfirmDeleteDialog>` ou `<AlertDialog>` bloqueante.

### 3.3 Listagens Tabulares Inteligentes: Padrão `<DataTable>`

- Toda listagem administrativa ou de gestão com paginação e ordenação deve utilizar **`<DataTable>`** (`@/presentation/molecules/DataTable`):
    - Suporte nativo a alternância de visualização (`viewMode='table' | 'grid'`).
    - `autoCardViewOnMobile={true}` com template customizado `renderCard`.
    - Ações em lote via `bulkActions`.
    - Controle de visibilidade de colunas via `enableColumnVisibility`.

### 3.4 Formulários: Qual Mecanismo Usar

1. **CRUD Simples vinculado a rotas Inertia/Laravel:** Usar `useForm` do `@inertiajs/react`.
2. **Formulários com Validação Client-Side Complexa:** Usar `react-hook-form` + `zod` com `@hookform/resolvers`.
3. **Ações Diretas sem Inputs (exclusão, toggle de status):** Usar `router.post()`, `router.put()`, `router.delete()` direto.
4. **Proibido misturar mecanismos** no mesmo formulário.

### 3.5 Datas e Horários (`date-fns ^4.4.0`)

- Utilizar exclusivamente a versão 4 do `date-fns` com locale em português:

    ```typescript
    import { format, parseISO } from 'date-fns';
    import { ptBR } from 'date-fns/locale';

    const dataFormatada = format(parseISO(dataIso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    ```

### 3.6 Ergonomia Mobile e Acessibilidade (WCAG 2.2 AA)

- **Área de Toque Mínima:** Botões e elementos interativos devem possuir área mínima de 44x44px.
- **Safe Areas:** Aplicar `pb-[env(safe-area-inset-bottom)]` e `pt-[env(safe-area-inset-top)]` no `MobileBottomBar` e nos Drawers.
- **Offset de Barras Flutuantes:** Elementos fixos inferiores devem aplicar `bottom-4 right-4` no desktop e `bottom-20 right-4 left-4` no mobile (16px acima do `MobileBottomBar`).

### 3.7 Estrutura de Diretórios (Atomic Design)

- `resources/js/presentation/atoms/`: primitivos sem estado (`SituacaoBadge`, `SituacaoIcon`, `SituacaoIndicator`, `UserAvatar`).
- `resources/js/presentation/molecules/`: composições reutilizáveis (`ResponsiveModal`, `DataTable`, `SearchFilter`, `ViewModeToggle`).
- `resources/js/presentation/organisms/`: componentes ricos em domínio (`GestoresEspaco`, `EspacoCard`, `MobileBottomBar`, `ReservaStepperModal`).
- `resources/js/presentation/templates/`: esqueletos estruturais (`AppLayout`, `AuthSplitLayout`).
- `resources/js/presentation/pages/`: páginas Inertia.
- `resources/js/contracts/`: Contratos SSOT de máquinas de estado e protocolos.
- `resources/js/components/ui/`: Primitivos base do shadcn (não modificar para regras específicas de tela).

---

## 🔒 4. Tipagem Estrita, Contratos SSOT e Autorização (PBAC)

### 4.1 Tolerância Zero a Suppressions no Linter

- Nenhum `// eslint-disable...`, `// @ts-expect-error` ou `// @ts-ignore` é permitido em novo código.
  O débito existente é rastreado em duas fontes distintas, medidas em 2026-09-01 e reconferidas em
  2026-09-02 após a consolidação das Fases 01-06 do plano de qualidade:
    - **`eslint-suppressions.json`** (supressões por contagem): 92 supressões em 43 arquivos.
    - **Supressões inline:** 9 ocorrências (4 em produção, 5 em testes). Uma delas é
      `eslint-disable` de arquivo inteiro (`ssr.tsx`), de escopo indeterminado — por isso as duas
      fontes não são somáveis em um total único.
  Quitação via refatoração gradual. Para medir o débito real:
  `npm run lint:debt` (equivalente a `npx eslint resources/js --suppressions-location eslint-suppressions.empty.json`).
- **PROIBIDO:** Introduzir `any`, `// eslint-disable...`, `// @ts-expect-error` ou `// @ts-ignore`.
- Código novo ou alterado deve satisfazer o ESLint 9 (`strict-type-checked`) e TypeScript 5.8 em modo estrito.

### 4.2 Contratos SSOT em `resources/js/contracts/`

- Toda máquina de estado e enum de negócio deve ser definida com objetos `as const` e tipos derivados:
    - `situacao-reserva.contract.ts` (`SituacaoReserva`, `SituacaoHorario`)
    - `modo-arquivo.contract.ts` (`ModoArquivo`)
    - `ordenacao-reserva.contract.ts` (`OrdenacaoReserva`)
    - `validation-status.contract.ts` (`ValidationStatus`)
    - `turnos.contract.ts` (`Turno`)
    - `recorrencia.contract.ts` (`RecorrenciaReserva`)
    - `roles.contract.ts` (`SystemRole`, `RoleType`)
    - `relatorios.contract.ts` (`TipoRelatorio`, `FormatoRelatorio`)
    - `error-codes.contract.ts` (`ErrorCode`)
- **Exaustividade Estrita com `assertNever`:** Switches sobre uniões de contratos devem possuir `default: return assertNever(variavel)`.
- **Proibido uniões permissivas:** Nunca tipar como `SituacaoReservaType | string`.

### 4.3 Autorização Declarativa por Capacidades (PBAC)

- **Componente `<Can>`:** Usar `<Can permission="..." any={[...]} all={[...]} fallback={...}>` para renderização condicional de ações na UI.
- **Helpers Programáticos:** Usar `hasPermission(user, 'permissao')`, `hasAnyPermission(user, [...])` ou o hook `useCan(...)`.
- **Desacoplamento de Roles:** Proibido condicionar fluxos a nomes de papel (`isGestor = role === 'gestor'`). Avalie sempre a permissão real (ex: `reservas.avaliar`).
- **Nomes Canônicos de Roles Spatie:**
    - `ROLE_INSTITUCIONAL = 'institucional'`
    - `ROLE_GESTOR = 'gestor'`
    - `ROLE_COMUM = 'comum'` (PROIBIDO usar `'usuario'`).

### 4.4 WebSockets e Memory Management

- Conexões com canais privados do Echo/Reverb devem ser adquiridas e liberadas através do `echo-channel-registry.ts` (`acquirePrivateChannel` / `releasePrivateChannel`) dentro de `useEffect` com cleanup para prevenir vazamento de memória.

---

## 🧪 5. Comandos de Validação Contínua

Toda alteração deve ser validada e aprovada pelos 4 comandos essenciais:

```bash
# 1. Checagem de Tipagem Estrita (Host)
npx tsc --noEmit

# 2. Linter com Tolerância Zero — verificação pura, não muta código (Host)
npm run lint:check

# 3. Suíte Completa de Testes de Frontend (Host)
npx jest

# 4. Testes de Integração e Unidade Backend (Docker)
docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test
```

---

## 🌿 6. Git Workflow e Governança

- **Branch Base:** Sempre ramificar a partir de `develop`.
- **Mensagens de Commit:** Conventional Commits em português (`feat:`, `fix:`, `perf:`, `chore:`, `docs:`, `refactor:`).
- **Criação de PRs:** NUNCA abrir pull requests automaticamente (`gh pr create`). A branch deve ser commitada/pushada e o agente deve parar, aguardando validação e autorização explícita do desenvolvedor.
- **Autoria:** Não adicionar trailers de co-autoria nos commits.
