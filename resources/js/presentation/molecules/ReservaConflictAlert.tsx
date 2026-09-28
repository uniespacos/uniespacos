import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { acquirePrivateChannel, releasePrivateChannel } from '@/lib/echo-channel-registry';
import { SlotReservaItem } from '@/types/reserva-stepper';

export interface ReservaConflictAlertProps {
    espacoId: number;
    selectedSlots: (SlotReservaItem | { data: string | Date; horario_inicio: string; horario_fim?: string })[];
    conflictingDates?: string[];
    onConflictDetected?: (hasConflict: boolean) => void;
    className?: string;
}

export const ReservaConflictAlert: React.FC<ReservaConflictAlertProps> = ({
    espacoId,
    selectedSlots,
    conflictingDates = [],
    onConflictDetected,
    className,
}) => {
    const [realtimeConflictMessage, setRealtimeConflictMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!espacoId || selectedSlots.length === 0) return;

        const channelName = `App.Models.Espaco.${String(espacoId)}`;
        const channel = acquirePrivateChannel(channelName);
        if (!channel) return;

        const handleHorarioOcupado = (event: { data: string; horario_inicio: string }) => {
            const hasMatch = selectedSlots.some((slot) => {
                const slotDataStr = slot.data instanceof Date ? slot.data.toISOString().slice(0, 10) : slot.data.slice(0, 10);
                const slotHoraStr = slot.horario_inicio.slice(0, 5);
                const eventHoraStr = event.horario_inicio.slice(0, 5);

                return slotDataStr === event.data && slotHoraStr === eventHoraStr;
            });

            if (hasMatch) {
                const msg = `O horário das ${event.horario_inicio.slice(0, 5)} em ${event.data} acabou de ser reservado por outro usuário.`;
                setRealtimeConflictMessage(msg);
                onConflictDetected?.(true);
            }
        };

        channel.listen('.HorarioOcupadoEvent', handleHorarioOcupado);

        return () => {
            channel.stopListening('.HorarioOcupadoEvent');
            releasePrivateChannel(channelName);
        };
    }, [espacoId, selectedSlots, onConflictDetected]);

    const hasStaticConflict = conflictingDates.length > 0;
    const hasAnyConflict = Boolean(realtimeConflictMessage) || hasStaticConflict;

    useEffect(() => {
        if (hasAnyConflict) {
            onConflictDetected?.(true);
        }
    }, [hasAnyConflict, onConflictDetected]);

    if (!hasAnyConflict) return null;

    return (
        <div
            role="alert"
            aria-live="polite"
            className={`bg-destructive/10 border-destructive-accent/30 text-destructive-accent animate-in fade-in slide-in-from-top-1 space-y-2 rounded-xl border p-3.5 text-xs duration-200 ${className ?? ''}`}
        >
            {realtimeConflictMessage && (
                <div className="flex items-start gap-2.5">
                    <AlertCircle className="text-destructive-accent mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex-1">
                        <span className="font-semibold">Conflito em Tempo Real: </span>
                        <span>{realtimeConflictMessage}</span>
                    </div>
                </div>
            )}

            {hasStaticConflict && (
                <div className="flex items-start gap-2.5">
                    <AlertTriangle className="text-destructive-accent mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex-1">
                        <span className="font-semibold">Conflito de Horários Existente: </span>
                        <span>
                            Já constam reservas deferidas para as datas:{' '}
                            <strong className="underline underline-offset-2">{conflictingDates.join(', ')}</strong>. Ajuste os horários para prevenir
                            indeferimentos automáticos.
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReservaConflictAlert;
