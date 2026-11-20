/**
 * ConflictAlertBox - Exibe conflitos de horários detectados para o gestor
 *
 * Este componente mostra os conflitos calculados no momento em que a página
 * foi carregada via ConflictDetectionService (síncrono a cada acesso via props
 * todosOsConflitos vinda de getForGestorReview()). Horários em conflito com
 * outra reserva deferida ficam bloqueados para aprovação e são indeferidos
 * automaticamente na avaliação.
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/i18n';
import type { ConflictInfo } from '@/types';
import { AlertTriangle } from 'lucide-react';

interface ConflictAlertBoxProps {
    conflicts: Record<string, ConflictInfo> | null | undefined;
}

export function ConflictAlertBox({ conflicts }: ConflictAlertBoxProps): React.ReactNode | null {
    const { t } = useTranslation();

    if (!conflicts || Object.keys(conflicts).length === 0) {
        return null;
    }

    const conflictEntries = Object.entries(conflicts);

    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
                <div className="space-y-2">
                    <p className="font-semibold">{t('reservas.gestor.conflicts_detected', { count: conflictEntries.length })}</p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                        {conflictEntries.map(([horarioId, conflict]) => (
                            <li key={horarioId}>
                                <span className="font-medium">{conflict.conflito_reserva_titulo}</span>
                                {conflict.conflito_user_name ? (
                                    <>
                                        {' — '}
                                        <span>
                                            {t('reservas.gestor.conflict_with_user', {
                                                user: conflict.conflito_user_name,
                                            })}
                                        </span>
                                    </>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs opacity-75">{t('reservas.gestor.conflicts_note')}</p>
                </div>
            </AlertDescription>
        </Alert>
    );
}
