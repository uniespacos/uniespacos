import { aplicarSelecaoDeSlots, ordenarSelecaoSlots, slotsDoIntervaloShift } from '@/lib/utils/slot-calendario';
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
    const ancoraRef = useRef<SlotCalendario | null>(null);

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
        ancoraRef.current = null;
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

        const novaSelecao = isCurrentlySelected
            ? slotsSelecao.filter((s) => s.id !== targetSlot.id)
            : ordenarSelecaoSlots([...slotsSelecao, targetSlot]);

        ancoraRef.current = targetSlot;
        setSlotsSelecao(novaSelecao);
    };

    const alternarSelecaoIntervalo = (slot: SlotCalendario, candidatos: SlotCalendario[]) => {
        const ancora = ancoraRef.current;
        const intervalo = ancora ? slotsDoIntervaloShift(candidatos, ancora, slot) : null;

        if (!ancora || !intervalo) {
            alternarSelecaoSlot(slot);
            return;
        }

        const selecionar = slotsSelecao.some((s) => s.id === ancora.id);

        ancoraRef.current = slot;
        setSlotsSelecao((atual) => aplicarSelecaoDeSlots(atual, intervalo, selecionar));
    };

    const definirSelecaoDeVarios = (slots: SlotCalendario[], selecionar: boolean) => {
        setSlotsSelecao((atual) => aplicarSelecaoDeSlots(atual, slots, selecionar));
    };

    return {
        slotsSelecao,
        alternarSelecaoSlot,
        alternarSelecaoIntervalo,
        definirSelecaoDeVarios,
        isSlotSelecionado,
        limparSelecao,
        setSlotsSelecao,
    };
}
