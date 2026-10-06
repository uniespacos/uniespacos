# Conflict Cache — Contrato de Snapshot Histórico

## Visão Geral

O `conflict_cache` é um **snapshot histórico** de conflitos detectados no momento em que `ValidateReservationConflictsJob` processa uma reserva. É uma coluna `json` nullable na tabela `reservas` (migration `2025_09_14_235335_add_validation_fields_to_reservas_table.php`), exposta na interface do gestor como informação secundária de auditoria — **nunca é fonte de verdade**.

**Contraste crítico:** A fonte de verdade atual é `ConflictDetectionService::findConflictsFor()`, chamada ao vivo dentro de `ReservaService::getForGestorReview()` a cada carregamento da página do gestor, cujo resultado é consumido como prop `todosOsConflitos` no componente `ConflictAlertBox` (que bloqueia/informa as ações do gestor).

## Origem e Escritura

### Tabela: `reservas.conflict_cache`

- **Tipo:** JSON nullable
- **Migração:** `2025_09_14_235335_add_validation_fields_to_reservas_table.php`
- **Escrita:** `app/Jobs/ValidateReservationConflictsJob::handle()`
- **Frequência:** Uma vez por reserva, após criação ou edição (job é despachado assincronamente)

### Job: `ValidateReservationConflictsJob`

```php
namespace App\Jobs;

class ValidateReservationConflictsJob implements ShouldBeUnique, ShouldQueue
{
    public function handle(ConflictDetectionService $conflictService): void
    {
        // Marca como "processing"
        $this->reserva->update(['validation_status' => 'processing']);
        
        // Recalcula conflitos ao vivo neste momento
        $conflitos = $conflictService->findConflictsFor($this->reserva->id);
        
        // Grava snapshot na coluna conflict_cache
        $this->reserva->update([
            'conflict_cache' => $conflitos,
            'validation_status' => 'completed',
        ]);
        
        // Dispara evento para UI (broadcast, etc.)
        ReservaEvent::dispatch('validated', $this->reserva->id, ...);
    }
}
```

**Pontos-chave:**
- Job é único por reserva ID (`uniqueId()` = `"validate-conflicts-{$reserva->id}"`) — evita duplicação na fila.
- TTL de unicidade: 1 hora (`uniqueFor()` = 3600 segundos) — suficiente para completar, evita chave orfã.
- Em caso de falha, marca `validation_status = 'failed'` e reloga erro.

## Consumo (Leitura)

### Backend: `ReservaService::getForGestorReview()`

```php
public function getForGestorReview(Reserva $reserva, User $gestor, string $weekRef): array
{
    // Recalcula conflitos ao vivo (fonte de verdade)
    $conflitosMap = $this->conflictService->findConflictsFor($reserva->id);
    
    // Retorna ambos: snapshot + recálculo
    return [
        'reserva' => $reserva,
        'semana' => ['referencia' => $reference],
        'todosOsConflitos' => $conflitosMap,  // ← FONTE DE VERDADE
        'conflictCacheSnapshot' => $reserva->conflict_cache,  // ← SNAPSHOT
    ];
}
```

**Observação:** A prop `conflictCacheSnapshot` é o valor bruto da coluna `conflict_cache` do banco. Não é recalculada; é apenas exposta como dado histórico.

### Frontend: Tipagem TypeScript

No arquivo `resources/js/types/index.d.ts`:

```typescript
/**
 * Informação de conflito de horário.
 *
 * Pode vir de duas fontes:
 * 1. `todosOsConflitos` (prop vinda de ConflictDetectionService::findConflictsFor())
 *    — Recálculo ao vivo a cada carregamento de página, fonte de verdade atual.
 * 2. `conflict_cache` (snapshot gravado por ValidateReservationConflictsJob no banco)
 *    — Snapshot histórico do momento em que o job processou a reserva, pode estar desatualizado.
 *
 * Em caso de discrepância, confie em `todosOsConflitos`.
 */
export interface ConflictInfo {
    horario_checado_id: number;
    conflito_reserva_titulo: string;
    conflito_user_name: string;
}

export interface Reserva {
    // ... outros campos ...
    
    /**
     * Snapshot do cache de conflitos gravado por ValidateReservationConflictsJob
     * no momento em que a reserva foi processada. Pode estar desatualizado;
     * não é fonte de verdade (a verdade é `todosOsConflitos` recalculado ao vivo).
     * Apenas informativo/auditoria.
     */
    conflict_cache?: Record<string, ConflictInfo> | null;
}
```

### Frontend: Componente `ConflictCacheSnapshotPanel`

Arquivo: `resources/js/presentation/organisms/ConflictCacheSnapshotPanel.tsx`

**Responsabilidade:** Renderizar o snapshot histórico como painel colapsável, fechado por padrão.

**Comportamento:**
- Prop: `snapshot: Record<string, ConflictInfo> | null | undefined`
- Retorna `null` se snapshot estiver vazio ou nulo (não renderiza nada).
- Se há conflitos, renderiza como painel com ícone `Clock`, título i18n e lista colapsável.
- Dentro do painel colapsado, há aviso explícito (i18n) indicando que é snapshot histórico, pode estar desatualizado.

**Renderização em contexto:**

Arquivo: `resources/js/presentation/pages/Reservas/Gestor/AvaliarReservaPage.tsx`

```tsx
// Conflitos ao vivo (fonte de verdade, bloqueia ações)
<ConflictAlertBox conflictCache={todosOsConflitos} />

// Snapshot histórico (informativo, não bloqueia)
<ConflictCacheSnapshotPanel snapshot={conflictCacheSnapshot} />
```

O `ConflictCacheSnapshotPanel` é renderizado **logo abaixo** do `ConflictAlertBox`, deixando claro que é uma camada de auditoria secundária.

## Strings de Internacionalização (i18n)

Três locales: `pt-BR`, `en`, `es`

**Chaves de tradução:**
- `reservas.gestor.conflict_cache_snapshot_title` — Título do painel (ex: "Snapshot de Conflitos Detectados")
- `reservas.gestor.conflict_cache_snapshot_note` — Nota de aviso (ex: "Este snapshot foi capturado no momento do processamento. Pode estar desatualizado.")

## Divergência Esperada Entre Snapshot e Recálculo

**Cenário comum:** Uma reserva `A` é criada ou editada → job dispara e grava snapshot de conflitos com a reserva `B`. Mais tarde, a reserva `B` é cancelada. Agora:

- **`conflict_cache` da reserva `A`:** Ainda contém o conflito com `B` (snapshot antigo).
- **`todosOsConflitos` (recálculo ao vivo):** Não contém mais o conflito (porque `B` foi cancelada).

**Isto é esperado e não é bug.** O snapshot é um histórico do que foi detectado naquele momento.

**Ação recomendada para o usuário/gestor:** Confiar em `todosOsConflitos` (exibido em `ConflictAlertBox`) para tomar decisões. O `ConflictCacheSnapshotPanel` é puramente informativo — ajuda a entender "o que havia no backend quando processou?", útil em auditorias ou investigação de comportamento passado.

## Harmonização do Filtro de Revalidação no Cancelamento

### Contexto

Quando uma reserva é **cancelada**, seus horários são liberados (marcados `inativa`). Qualquer outra reserva que tenha horários conflitantes naqueles slots e esteja em estado `indeferida` ou `parcialmente_deferida` deve ser **revalidada** — isto é, um novo `ValidateReservationConflictsJob` é despachado para ela, permitindo que a ausência do conflito anterior seja detectada e possivelmente aprovada.

### Filtro Anterior (Incompleto)

Antes da fase 04, o filtro de revalidação era:

```php
private function revalidateConflictedReservations(Collection $horariosLiberados): void
{
    $reservasParaRevalidar = Reserva::query()
        ->where('validation_status', 'completed')
        ->where('situacao', SituacaoReservaEnum::INDEFERIDA->value)  // ← SÓ INDEFERIDA
        ->whereHas('horarios', /* ... slots liberados ... */)
        ->select('id')
        ->get();
    
    // Dispara ValidateReservationConflictsJob para cada uma
}
```

**Problema:** Reservas em estado `parcialmente_deferida` não eram revalidadas. Se uma reserva tivesse 3 horários e 2 fossem deferidos (parcialmente), e um cancelamento liberasse um slot conflitante com o 3º, essa reserva não seria revalidada — o 3º horário continuaria indeferido indefinidamente.

### Filtro Harmonizado (Atual)

A partir da fase 04 (linha 274-276 em `ReservaService.php`):

```php
private function revalidateConflictedReservations(Collection $horariosLiberados): void
{
    $reservasParaRevalidar = Reserva::query()
        ->where('validation_status', 'completed')
        ->whereIn('situacao', [
            SituacaoReservaEnum::INDEFERIDA->value,
            SituacaoReservaEnum::PARCIALMENTE_DEFERIDA->value,  // ← ADICIONADO
        ])
        ->whereHas('horarios', /* ... slots liberados ... */)
        ->select('id')
        ->get();
    
    // Dispara ValidateReservationConflictsJob para cada uma
}
```

**Alinhamento com fluxo de aprovação:** O job `AvaliarReservaJob::triggerConflictRevalidation()` já revalidava `em_analise` e `parcialmente_deferida`. Agora o cancelamento também inclui `parcialmente_deferida`, criando simetria.

### Teste de Cobertura

Arquivo: `tests/Feature/ReservaCancelamentoAdminTest.php`

Novo teste: `test_cancelamento_revalida_reservas_parcialmente_deferidas_que_compartilham_slot()`

**Objetivo:** Validar que uma reserva `B` em estado `parcialmente_deferida` é revalidada quando uma reserva `A` que compartilha um slot é cancelada.

**Fluxo do teste:**
1. Cria dois usuários (`dono_a`, `dono_b`) e um gestor com agenda em um espaço.
2. Cria reserva `A` (dono_a), `situacao = deferida`, com um horário `deferida` num slot específico.
3. Cria reserva `B` (dono_b), `situacao = parcialmente_deferida` e `validation_status = completed`,
   com um horário `indeferida` no **mesmo** slot (data/horário) do horário de `A`.
4. Cancela `A` (via `DELETE /reservas/{A}`), o que libera o slot que `A` ocupava.
5. **Verifica:** `A` fica `inativa` no banco.
6. **Verifica:** `ValidateReservationConflictsJob` foi despachado para `B` (a reserva `parcialmente_deferida`
   que compartilhava o slot liberado) — prova de que o `whereIn` harmonizado alcança esse estado,
   o que o filtro anterior (`where` único em `INDEFERIDA`) não fazia.

## Resumo de Contratos

| Aspecto | Detalhes |
|---------|----------|
| **Origem** | Coluna `conflict_cache` (JSON) na tabela `reservas`, escrita por `ValidateReservationConflictsJob` |
| **Frequência de escrita** | Assincronamente após criação/edição da reserva (disparado no job) |
| **Consumo backend** | `ReservaService::getForGestorReview()` expõe como prop `conflictCacheSnapshot` |
| **Consumo frontend** | Componente `ConflictCacheSnapshotPanel` renderiza o snapshot em painel colapsável |
| **Fonte de verdade** | `ConflictDetectionService::findConflictsFor()` recalculado ao vivo em `todosOsConflitos` |
| **Divergência esperada** | Sim; snapshot pode estar desatualizado se reservas foram criadas/canceladas após o snapshot |
| **Impacto em decisões do gestor** | Zero — gestor confia em `ConflictAlertBox` (que usa `todosOsConflitos`) para bloquear/aprovar |
| **Propósito do snapshot** | Auditoria, investigação histórica, transparência do que o backend viu naquele momento |

---

## Referências Cruzadas

- [`docs/models-business-rules.md`](./models-business-rules.md) — Seção `Reserva`, campos `validation_status` e `conflict_cache`
- [`docs/core-workflow-report.md`](./core-workflow-report.md) — Fluxo de avaliação e cascata de situações
- [`docs/validation-rules.md`](./validation-rules.md) — Regras de validação de disponibilidade
