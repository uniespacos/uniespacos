import { assertNever } from '@/lib/utils/exhaustive';
import { mapearStatusBackendParaSlot } from '@/lib/utils/reserva-status.helpers';
import { Reserva, SlotCalendario } from '@/types';
import { parse } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';

export function useReservationSlots(reserva: Reserva) {
    const initialSlots = useMemo(() => {
        return reserva.horarios.map((horario) => {
            const dataObjeto = parse(horario.data, 'yyyy-MM-dd', new Date());
            const slotId = `${horario.data}|${horario.horario_inicio}`;
            const isLocked = horario.is_conflicted;
            const status = isLocked ? 'indeferida' : mapearStatusBackendParaSlot(horario.situacao);

            return {
                id: slotId,
                status,
                data: dataObjeto,
                horario_inicio: horario.horario_inicio,
                horario_fim: horario.horario_fim,
                isPast: false,
                isLocked,
                dadosReserva: {
                    horarioDB: horario,
                    autor: reserva.user?.name ?? 'Indefinido',
                    reserva_titulo: reserva.titulo,
                },
                isShowReservation: true,
            };
        });
    }, [reserva]);

    const [slotsSelecao, setSlotsSelecao] = useState<SlotCalendario[]>(initialSlots);
    const lastInitialSlotsRef = useRef(initialSlots);

    useEffect(() => {
        const hasChanged =
            initialSlots.length !== lastInitialSlotsRef.current.length ||
            initialSlots.some((slot, idx) => {
                const prev = lastInitialSlotsRef.current[idx];
                return slot.id !== prev.id || slot.status !== prev.status;
            });

        if (hasChanged) {
            lastInitialSlotsRef.current = initialSlots;
            setSlotsSelecao(initialSlots);
        }
    }, [initialSlots]);

    const avaliarSlot = (slotClicado: SlotCalendario) => {
        if (slotClicado.isLocked) return;

        setSlotsSelecao((slotsAtuais) => {
            return slotsAtuais.map((slot) => {
                if (slot.id !== slotClicado.id) {
                    return slot;
                }
                let proximoStatus: SlotCalendario['status'];
                switch (slot.status) {
                    case 'solicitado':
                    case 'selecionado':
                        proximoStatus = 'deferida';
                        break;
                    case 'deferida':
                        proximoStatus = 'indeferida';
                        break;
                    case 'indeferida':
                    case 'livre':
                    case 'reservado':
                        proximoStatus = 'solicitado';
                        break;
                    default:
                        return assertNever(slot.status);
                }
                return { ...slot, status: proximoStatus };
            });
        });
    };

    const handleDecisaoGlobalChange = (novaDecisao: 'deferida' | 'indeferida') => {
        setSlotsSelecao((slotsAtuais) => {
            return slotsAtuais.map((slot) => {
                if (slot.isLocked) {
                    return slot;
                }
                return { ...slot, status: novaDecisao };
            });
        });
    };

    return {
        initialSlots,
        slotsSelecao,
        avaliarSlot,
        handleDecisaoGlobalChange,
    };
}
