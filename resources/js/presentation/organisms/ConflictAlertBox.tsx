/**
 * ConflictAlertBox - Exibe conflitos de horários detectados para o gestor
 *
 * Este componente mostra os conflitos calculados no momento em que a página
 * foi carregada via ConflictDetectionService (síncrono a cada acesso via props
 * todosOsConflitos vinda de getForGestorReview()). O dado reflete a detecção
 * mais fresca e é puramente informativo — não bloqueia o deferimento.
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/i18n';
import type { ConflictInfo } from '@/types';
import { AlertTriangle } from 'lucide-react';

interface ConflictAlertBoxProps {
    conflictCache: Record<string, ConflictInfo> | null | undefined;
}

export function ConflictAlertBox({ conflictCache }: ConflictAlertBoxProps): React.ReactNode | null {
    const { t } = useTranslation();

    if (!conflictCache || Object.keys(conflictCache).length === 0) {
        return null;
    }

    const conflicts = Object.entries(conflictCache);

    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
                <div className="space-y-2">
                    <p className="font-semibold">
                        {t('reservas.gestor.conflicts_detected', { count: conflicts.length })}
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                        {conflicts.map(([horarioId, conflict]) => (
                            <li key={horarioId}>
                                <span className="font-medium">{conflict.conflito_reserva_titulo}</span>
                                {' — '}
                                <span>
                                    {t('reservas.gestor.conflict_with_user', {
                                        user: conflict.conflito_user_name,
                                    })}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs opacity-75 mt-2">
                        {t('reservas.gestor.conflicts_note')}
                    </p>
                </div>
            </AlertDescription>
        </Alert>
    );
}
