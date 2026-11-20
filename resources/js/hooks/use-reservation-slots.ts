import { type DecisaoAvaliacaoType, isDecisaoAvaliacao, SituacaoReserva } from '@/contracts';
import { assertNever } from '@/lib/utils/exhaustive';
import { mapearStatusBackendParaSlot } from '@/lib/utils/reserva-status.helpers';
import { Reserva, SlotCalendario } from '@/types';
import { parse } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useReservationSlots(reserva: Reserva) {
    const initialSlots = useMemo(() => {
        return reserva.horarios.map((horario) => {
            const dataObjeto = parse(horario.data, 'yyyy-MM-dd', new Date());
            const slotId = `${horario.data}|${horario.horario_inicio}`;
            const isLocked = horario.is_conflicted;
            const status = isLocked ? SituacaoReserva.INDEFERIDA : mapearStatusBackendParaSlot(horario.situacao);

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
                        proximoStatus = SituacaoReserva.DEFERIDA;
                        break;
                    case SituacaoReserva.DEFERIDA:
                        proximoStatus = SituacaoReserva.INDEFERIDA;
                        break;
                    case SituacaoReserva.INDEFERIDA:
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

    const handleDecisaoGlobalChange = useCallback(
        (novaDecisao: DecisaoAvaliacaoType, predicate?: (slot: SlotCalendario) => boolean) => {
            if (!isDecisaoAvaliacao(novaDecisao)) {
                return;
            }

            setSlotsSelecao((slotsAtuais) => {
                return slotsAtuais.map((slot) => {
                    if (slot.isLocked) {
                        return slot;
                    }
                    if (predicate && !predicate(slot)) {
                        return slot;
                    }
                    return { ...slot, status: novaDecisao };
                });
            });
        },
        [],
    );

    const restaurarSlotsForaDoEscopo = useCallback(
        (predicate: (slot: SlotCalendario) => boolean) => {
            const initialById = new Map<number | string, SlotCalendario['status']>(
                initialSlots.map((slot) => [slot.dadosReserva.horarioDB.id, slot.status]),
            );

            setSlotsSelecao((slotsAtuais) => {
                const precisaRestaurar = slotsAtuais.some((slot) => {
                    if (predicate(slot)) {
                        return false;
                    }
                    const statusInicial = initialById.get(slot.dadosReserva?.horarioDB.id ?? slot.id);
                    return statusInicial !== undefined && slot.status !== statusInicial;
                });

                if (!precisaRestaurar) {
                    return slotsAtuais;
                }

                return slotsAtuais.map((slot) => {
                    if (predicate(slot)) {
                        return slot;
                    }
                    const statusInicial = initialById.get(slot.dadosReserva?.horarioDB.id ?? slot.id);
                    return statusInicial === undefined ? slot : { ...slot, status: statusInicial };
                });
            });
        },
        [initialSlots],
    );

    return {
        initialSlots,
        slotsSelecao,
        avaliarSlot,
        handleDecisaoGlobalChange,
        restaurarSlotsForaDoEscopo,
    };
}
