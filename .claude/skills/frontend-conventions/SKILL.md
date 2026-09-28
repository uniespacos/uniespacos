---
name: frontend-conventions
description: Convenções de frontend do UniEspaços (atomic design, modais ergonômicos, formulários, gerência de estado, tokens Tailwind v4/Catppuccin, date-fns v4). Use antes de criar componente novo ou decidir onde um arquivo de UI vai.
---

# Convenções de frontend — UniEspaços

## Onde o arquivo vai (atomic design)

`resources/js/presentation/`:

- `atoms/` — elementos visuais primitivos e sem estado de domínio (`SituacaoBadge`, `UserAvatar`, `input-error`, `text-link`).
- `molecules/` — composição pequena e reutilizável entre páginas (`ResponsiveModal`, `Modal`, `FormField`, `DatePicker`, `DataTable`, `ComboboxFiltro`, `delete-item`, `PaginacaoListas`).
- `organisms/` — composição com lógica de domínio complexa, geralmente amarrada a um recurso (`GestoresEspaco`, `EspacoCard`, `MobileBottomBar`, `SetorForm`, `GerenciarGestoresModal`).
- `templates/` — estruturas de layout que envolvem páginas (`AppLayout`, `AppSidebarLayout`, `AuthSplitLayout`). `AuthLayout` ainda existe como wrapper fino de compatibilidade que delega para `AuthSplitLayout` — em código novo, use `AuthSplitLayout` diretamente.
- `pages/` — pontos de entrada renderizados pelo Inertia (`Administrativo/Usuarios/Usuarios.tsx`, `Espacos/VisualizarEspacoPage.tsx`).

`resources/js/components/ui/` é a cópia local do shadcn (`dialog.tsx`, `drawer.tsx`, `button.tsx`, `select.tsx`).
Só mexe se o motivo for consertar o primitivo em si para todo mundo — não para uma tela específica.

Fora de `presentation/`, três diretórios canônicos que toda tela nova deve considerar antes de escrever tipo, string ou assinatura de canal do zero:

- `resources/js/contracts/` — SSOT de tipos/enums de domínio (`situacao-reserva.contract.ts`, `roles.contract.ts`, etc.). Nunca duplicar union type localmente.
- `resources/js/i18n/` — motor de i18n próprio (`useTranslation()`, dicionários em `locales/pt-BR.ts` e derivados). Zero string hardcoded em PT-BR num componente.
- `resources/js/lib/auth-can.tsx` (PBAC: `<Can>`, `useCan()`) e `resources/js/lib/echo-channel-registry.ts` (registry de canais Reverb com reference-counting: `acquirePrivateChannel`/`releasePrivateChannel`).

## Modais e Diálogos: Padrão Ergonômico `<ResponsiveModal>`

Para diálogos com interação de usuário ou formulários, use obrigatoriamente a molécula híbrida **`<ResponsiveModal>`**:

```tsx
import { ResponsiveModal } from '@/presentation/molecules/ResponsiveModal';

<ResponsiveModal
  open={open}
  onOpenChange={setOpen}
  title="Editar Gestor do Espaço"
  description="Altere as permissões de gestão deste espaço."
  size="md"
>
  {/* Conteúdo do Formulário */}
</ResponsiveModal>
```

- **Mobile (`< 768px`):** Renderiza um `<Drawer>` (baseado em `vaul`) que se abre como *bottom sheet* a partir da base da tela, suportando gestos de arrasto e área de toque adaptada para o polegar.
- **Desktop (`md+` / `≥ 768px`):** Renderiza um `<Dialog>` centralizado com overlay e controle de foco.
- **Tamanhos homologados (`size`):** `'sm' | 'md' | 'lg' | 'xl'`.
- **Campos de formulário:** Utilize `FormField` (label + controle + erro em `text-sm text-destructive`) dentro do corpo do modal.
- **Confirmações destrutivas:** `<AlertDialog>` / `ConfirmDeleteDialog` continua reservado para confirmações bloqueantes (não fecha ao clicar fora, semântica de cancelamento/exclusão crítica).

## Formulário: qual mecanismo usar

O projeto estabelece regras claras conforme a natureza da interação:

- **CRUD simples ligado a uma rota Laravel** (criar/editar/deletar registro): `useForm` do `@inertiajs/react`. Provê `data`, `setData`, `errors`, `processing` e integração nativa com mensagens do `FormRequest`.
- **Formulário com validação client-side complexa** (múltiplos campos interdependentes, schemas dinâmicos): `react-hook-form` + `zod` com `@hookform/resolvers`.
- **Ação simples sem campos** (favoritar, mudar status, exclusão direta): `router.post()`, `router.put()`, `router.delete()` direto, sem `useForm`.

Não misture múltiplos mecanismos no mesmo formulário. Se uma tela simples evoluir para validação complexa no cliente, migre de forma limpa para `react-hook-form`.

## Leitura de estado do servidor

`usePage<{...}>().props` é a **fonte única de verdade** das props vindas do Inertia.
- **Proibido:** Duplicar props do servidor em `useState` local redundante (evita dados desatualizados após mutações).
- **Reatividade:** Após mutações no backend, responda com `back()` ou `redirect()` no controller; o Inertia atualiza as props da página de forma nativa e reativa.

## Cores e Theming: Tailwind v4 + Catppuccin

A estilização utiliza o **Tailwind v4 (CSS-First)** com a diretiva `@theme` e variáveis CSS semânticas definidas em `resources/css/app.css`:
- **Modo Claro (Light):** Paleta *Catppuccin Latte*.
- **Modo Escuro (Dark):** Paleta *Catppuccin Frappé*.

### Regra Inviolável de Cores
- **PROIBIDO:** Usar cores fixas como `bg-red-500`, `text-blue-600`, `#3b82f6`.
- **OBRIGATÓRIO:** Usar exclusivamente tokens semânticos:
  - `bg-background`, `text-foreground`
  - `bg-primary`, `text-primary-foreground`
  - `bg-secondary`, `text-secondary-foreground`
  - `bg-muted`, `text-muted-foreground`
  - `bg-destructive`, `text-destructive-foreground`
  - `bg-card`, `text-card-foreground`
  - `border-border`, `ring-ring`, `bg-success`
  - Sufixos de intensidade por status (`success`, `warning`, `destructive`, `info`, `neutral`): `-subtle` (fundo neutro/baixo contraste, ex.: `bg-success-subtle`) e `-accent` (destaque de maior contraste, ex.: `text-success-accent`, `bg-warning-accent`) — definidos em `resources/css/app.css`.

### Hierarquia de Botões de Ação: Destrutivo vs. Principal

- **A Regra:** Nunca usar `variant="destructive"` preenchido para o botão de **GATILHO** de uma ação irreversível (ex.: "Cancelar reserva", "Excluir espaço") quando ele competir visualmente com uma ação principal mais frequente na mesma tela (ex.: "Ver detalhes", "Editar", "Solicitar reserva"). Usar `variant="outline"` + `text-destructive-accent` no ícone e no texto do botão (não `text-destructive` puro — ver nota de acessibilidade abaixo).

- **A Exceção:** `variant="destructive"` preenchido continua correto e obrigatório no botão de **CONFIRMAÇÃO FINAL** de diálogos dedicados de exclusão/cancelamento (padrão `DeleteItem.tsx`/`ConfirmDeleteDialog`), onde a decisão destrutiva é o único propósito da tela — não há ação principal concorrente.

- **Exemplos Reais no Projeto (já implementados):**
  - **Fase 1:** `ReservaCard.tsx`, `ReservasDetalhes.tsx` — botão "Cancelar" usa `variant="outline"` + `text-destructive-accent`.
  - **Fase 2:** `EspacoCard.tsx`, `TabelaSetores.tsx`, `Unidades.tsx`, `Instituicoes.tsx`, `Modulos.tsx`, `ImageUpload.tsx` — padrão exato: `variant="outline"` + classes `text-destructive-accent hover:text-destructive-accent` no `Button`, e `text-destructive-accent` também no ícone (ex.: `Trash2`, `XCircle`, `X`).

- **Nota de Acessibilidade e Racional Técnico:**
  - **WCAG 1.4.1 (Use of Color):** Ícone + texto explícito sempre, nunca só cor. Ambas as indicações visuais devem ser claras.
  - **Contraste WCAG 1.4.3:** `text-destructive` sobre o fundo da variante `outline` FALHA no tema escuro (Frappé: 3.52:1 < 4.5:1 exigido). `text-destructive-accent` é o token semântico de maior contraste que passa em ambos os temas: Latte 8.57:1, Frappé 6.15:1 — ambos ≥ 4.5:1.
  - **Racional de Design:** Baseado em Material Design 3 (uma ação de alta ênfase/preenchida por tela), Apple HIG (cor semântica reservada ao seu papel), Nielsen Norman Group (confirmação protege a ação, não o gatilho) e Fitts's Law (tamanho de alvo de toque `min-h-[44px]` preservado independente da cor). Referência completa: `docs/auditoria-ux-hierarquia-visual/03-benchmark-padroes-externos.md`, seção 7.

## Datas e Horários: Padrão `date-fns ^4.4.0`

Com o `date-fns` v4, as importações de formatação e localidade em português seguem o padrão estrito:

```typescript
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const dataFormatada = format(parseISO(reserva.data_inicio), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
});
```

## Mapeie, não exiba valor cru do banco

Quando o backend armazena slugs (`andar-1`, `terreo`) e a UI precisa de rótulo formatado (`1º Andar`, `Térreo`), use sempre os utilitários centralizados em `resources/js/lib/utils/` (ex.: `AndarOptions.ts` → `getAndarLabelByValue()`, `getTurnoText()`).

## Qualidade, Linter e Tolerância Zero a Suppressions

- **ESLint 9 Flat Config:** Configurado com `typescript-eslint` em modo `strict-type-checked` e `stylistic-type-checked`.
- **Tolerância Zero:** Nenhuma nova supressão é permitida. Se o linter reportar erro ou warning em código novo ou alterado, a causa raiz deve ser corrigida imediatamente.
- **Comentários — Regra Rígida:** É proibido incluir comentários inline óbvios explicando "o quê" o código faz, banners decorativos ou blocos de código comentado. TSDoc só é permitido quando define contratos de props não expressáveis puramente em TypeScript.
- **Comandos de Verificação:**
  ```bash
  npx eslint resources/js     # Checagem de linter com Tolerância Zero
  npx tsc --noEmit            # Checagem estrita de tipos
  npx jest                    # Suíte completa de testes de frontend
  ```

## Antes de escrever componente novo

Sempre pesquise em `resources/js/presentation/` antes de criar um componente. Padrões como busca com debounce (`ComboboxFiltro`, `UserSearchComboBox`), modais adaptáveis (`ResponsiveModal`), tabelas paginadas (`DataTable`) e botões móveis (`MobileBottomBar`) já existem e devem ser reutilizados.
