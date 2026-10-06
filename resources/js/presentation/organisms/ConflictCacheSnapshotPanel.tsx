/**
 * ConflictCacheSnapshotPanel - Exibe snapshot histórico de conflitos detectados pelo job
 *
 * Este componente exibe o cache de conflitos gravado por ValidateReservationConflictsJob
 * no momento em que a reserva foi processada. É informação secundária e pode estar
 * desatualizada — nunca é fonte de verdade. Para conflitos atualizados, consulte
 * ConflictAlertBox (que renderiza todosOsConflitos recalculado ao vivo).
 *
 * Renderiza como painel colapsado por padrão. Retorna null se o snapshot for vazio.
 */

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTranslation } from '@/i18n';
import type { ConflictInfo } from '@/types';
import { ChevronDown, Clock } from 'lucide-react';
import { useState } from 'react';

interface ConflictCacheSnapshotPanelProps {
    snapshot: Record<string, ConflictInfo> | null | undefined;
}

export function ConflictCacheSnapshotPanel({ snapshot }: ConflictCacheSnapshotPanelProps): React.ReactNode | null {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    if (!snapshot || Object.keys(snapshot).length === 0) {
        return null;
    }

    const conflicts = Object.entries(snapshot);

    return (
        <div className="border-border rounded-lg border bg-card p-4">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <button
                        type="button"
                        className="text-foreground hover:text-primary flex w-full items-center justify-between transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Clock className="text-muted-foreground h-4 w-4" />
                            <h3 className="font-semibold">
                                {t('reservas.gestor.conflict_cache_snapshot_title', {
                                    count: conflicts.length,
                                })}
                            </h3>
                        </div>
                        <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${
                                isOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 space-y-2 pt-2">
                    <ul className="space-y-2">
                        {conflicts.map(([horarioId, conflict]) => (
                            <li key={horarioId} className="text-muted-foreground text-sm">
                                <span className="font-medium text-foreground">
                                    {conflict.conflito_reserva_titulo}
                                </span>
                                {' — '}
                                <span>
                                    {t('reservas.gestor.conflict_with_user', {
                                        user: conflict.conflito_user_name,
                                    })}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <p className="text-muted-foreground mt-3 text-xs">
                        {t('reservas.gestor.conflict_cache_snapshot_note')}
                    </p>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
