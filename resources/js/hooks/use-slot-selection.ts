import { SlotCalendario } from '@/types';
import { addWeeks, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface UseSlotSelectionProps {
    hoje: Date;
    slotsIniciais?: SlotCalendario[];
}

export function useSlotSelection({ hoje, slotsIniciais = [] }: UseSlotSelectionProps) {
    const [slotsSelecao, setSlotsSelecao] = useState<SlotCalendario[]>(slotsIniciais);

    const lastInitialSlotsRef = useRef(slotsIniciais);

    useEffect(() => {
        const hasChanged =
            slotsIniciais.length !== lastInitialSlotsRef.current.length ||
            slotsIniciais.some((slot, idx) => {
                const prev = lastInitialSlotsRef.current[idx];
                return slot.id !== prev.id || slot.status !== prev.status;
            });

        if (hasChanged) {
            lastInitialSlotsRef.current = slotsIniciais;
            setSlotsSelecao(slotsIniciais);
        }
    }, [slotsIniciais]);

    const isSlotSelecionado = (slot: SlotCalendario) => slotsSelecao.some((s) => s.id === slot.id);

    const limparSelecao = () => {
        setSlotsSelecao([]);
    };

    const alternarSelecaoSlot = (slot: SlotCalendario) => {
        if (slot.status === 'reservado') {
            return;
        }

        let targetSlot = slot;
        const isPast = slot.data < hoje;
        if (isPast) {
            const novaData = addWeeks(slot.data, 1);
            targetSlot = {
                ...slot,
                data: novaData,
                id: `${format(novaData, 'yyyy-MM-dd')}|${slot.horario_inicio}`,
            };
            toast.info(`O horário de ${format(slot.data, 'EEEE', { locale: ptBR })} foi movido para o dia ${format(novaData, 'dd/MM/yyyy')}.`);
        }

        const isCurrentlySelected = slotsSelecao.some((s) => s.id === targetSlot.id);

        let novaSelecao;
        if (isCurrentlySelected) {
            novaSelecao = slotsSelecao.filter((s) => s.id !== targetSlot.id);
        } else {
            novaSelecao = [...slotsSelecao, targetSlot].sort(
                (a, b) => a.data.getTime() - b.data.getTime() || a.horario_inicio.localeCompare(b.horario_inicio),
            );
        }

        setSlotsSelecao(novaSelecao);
    };

    return {
        slotsSelecao,
        alternarSelecaoSlot,
        isSlotSelecionado,
        limparSelecao,
        setSlotsSelecao,
    };
}
