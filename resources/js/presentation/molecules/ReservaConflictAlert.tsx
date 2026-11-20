import { useTranslation } from '@/i18n';
import { acquirePrivateChannel, releasePrivateChannel } from '@/lib/echo-channel-registry';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface SlotConflitavel {
    id?: string;
    data: string | Date;
    horario_inicio: string;
    horario_fim?: string;
}

export interface ReservaConflictAlertProps {
    espacoId: number;
    selectedSlots: readonly SlotConflitavel[];
    conflictingDates?: string[];
    onRealtimeSlotsConflict?: (slotIds: string[]) => void;
    className?: string;
}

interface ConflitoEmTempoReal {
    data: string;
    hora: string;
}

export const ReservaConflictAlert: React.FC<ReservaConflictAlertProps> = ({
    espacoId,
    selectedSlots,
    conflictingDates = [],
    onRealtimeSlotsConflict,
    className,
}) => {
    const { t, formatDate } = useTranslation();
    const [conflitoTempoReal, setConflitoTempoReal] = useState<ConflitoEmTempoReal | null>(null);
    const selectedSlotsRef = useRef(selectedSlots);
    const onRealtimeSlotsConflictRef = useRef(onRealtimeSlotsConflict);

    selectedSlotsRef.current = selectedSlots;
    onRealtimeSlotsConflictRef.current = onRealtimeSlotsConflict;

    const hasSelectedSlots = selectedSlots.length > 0;

    useEffect(() => {
        if (!espacoId || !hasSelectedSlots) return;

        const channelName = `App.Models.Espaco.${String(espacoId)}`;
        const channel = acquirePrivateChannel(channelName);
        if (!channel) return;

        const handleHorarioOcupado = (event: { data: string; horario_inicio: string }) => {
            const horaEvento = event.horario_inicio.slice(0, 5);
            const correspondentes = selectedSlotsRef.current.filter((slot) => {
                const slotDataStr = slot.data instanceof Date ? format(slot.data, 'yyyy-MM-dd') : slot.data.slice(0, 10);

                return slotDataStr === event.data && slot.horario_inicio.slice(0, 5) === horaEvento;
            });

            if (correspondentes.length === 0) return;

            setConflitoTempoReal({ data: event.data, hora: horaEvento });
            onRealtimeSlotsConflictRef.current?.(correspondentes.flatMap((slot) => (slot.id ? [slot.id] : [])));
        };

        channel.listen('.HorarioOcupadoEvent', handleHorarioOcupado);

        return () => {
            channel.stopListening('.HorarioOcupadoEvent');
            releasePrivateChannel(channelName);
        };
    }, [espacoId, hasSelectedSlots]);

    const conflitoTempoRealAtivo = useMemo(() => {
        if (!conflitoTempoReal) {
            return null;
        }

        const aindaSelecionado = selectedSlots.some((slot) => {
            const slotDataStr = slot.data instanceof Date ? format(slot.data, 'yyyy-MM-dd') : slot.data.slice(0, 10);

            return slotDataStr === conflitoTempoReal.data && slot.horario_inicio.slice(0, 5) === conflitoTempoReal.hora;
        });

        return aindaSelecionado ? conflitoTempoReal : null;
    }, [conflitoTempoReal, selectedSlots]);

    const hasStaticConflict = conflictingDates.length > 0;

    if (!conflitoTempoRealAtivo && !hasStaticConflict) return null;

    return (
        <div
            role="alert"
            aria-live="polite"
            className={cn(
                'bg-destructive/10 border-destructive-accent/30 text-destructive-accent animate-in fade-in slide-in-from-top-1 space-y-3 rounded-xl border p-3.5 text-sm duration-200',
                className,
            )}
        >
            {conflitoTempoRealAtivo && (
                <div className="flex items-start gap-2.5">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="flex-1 space-y-0.5">
                        <p className="font-semibold">{t('reservas.stepper.conflict.realtime_title')}</p>
                        <p>
                            {t('reservas.stepper.conflict.realtime_message', {
                                hora: conflitoTempoRealAtivo.hora,
                                data: formatDate(conflitoTempoRealAtivo.data, 'dd/MM/yyyy'),
                            })}
                        </p>
                    </div>
                </div>
            )}

            {hasStaticConflict && (
                <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="flex-1 space-y-0.5">
                        <p className="font-semibold">{t('reservas.stepper.conflict.static_title')}</p>
                        <p>{t('reservas.stepper.conflict.static_message', { datas: conflictingDates.join(', ') })}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReservaConflictAlert;
