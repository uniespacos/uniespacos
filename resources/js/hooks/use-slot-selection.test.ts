import { SlotCalendario } from '@/types';
import { act, renderHook } from '@testing-library/react';
import { addWeeks, format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useSlotSelection } from './use-slot-selection';

jest.mock('sonner', () => ({
    toast: {
        info: jest.fn(),
    },
}));

describe('useSlotSelection', () => {
    const hoje = parseISO('2026-06-02');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createSlot = (id: string, dateStr: string, status: SlotCalendario['status'] = 'solicitado'): SlotCalendario => ({
        id,
        status,
        data: parseISO(dateStr),
        horario_inicio: '08:20:00',
        horario_fim: '09:10:00',
        isLocked: false,
    });

    it('should initialize empty or with initial slots', () => {
        const { result } = renderHook(() => useSlotSelection({ hoje }));

        expect(result.current.slotsSelecao).toEqual([]);

        const initialSlot = createSlot('1', '2026-06-03');
        const { result: resultWithInit } = renderHook(() => useSlotSelection({ hoje, slotsIniciais: [initialSlot] }));

        expect(resultWithInit.current.slotsSelecao).toEqual([initialSlot]);
    });

    it('should alternate selection of a future slot', () => {
        const { result } = renderHook(() => useSlotSelection({ hoje }));
        const slot = createSlot('2026-06-03|08:20:00', '2026-06-03');

        expect(result.current.isSlotSelecionado(slot)).toBe(false);

        act(() => {
            result.current.alternarSelecaoSlot(slot);
        });

        expect(result.current.slotsSelecao).toHaveLength(1);
        expect(result.current.slotsSelecao[0].id).toBe(slot.id);
        expect(result.current.isSlotSelecionado(slot)).toBe(true);

        act(() => {
            result.current.alternarSelecaoSlot(slot);
        });

        expect(result.current.slotsSelecao).toHaveLength(0);
        expect(result.current.isSlotSelecionado(slot)).toBe(false);
    });

    it('should shift a past slot to next week and notify with toast', () => {
        const { result } = renderHook(() => useSlotSelection({ hoje }));
        const pastSlot = createSlot('2026-06-01|08:20:00', '2026-06-01');

        act(() => {
            result.current.alternarSelecaoSlot(pastSlot);
        });

        const expectedDate = addWeeks(pastSlot.data, 1);
        const expectedId = `${format(expectedDate, 'yyyy-MM-dd')}|${pastSlot.horario_inicio}`;

        expect(result.current.slotsSelecao).toHaveLength(1);
        expect(result.current.slotsSelecao[0].id).toBe(expectedId);
        expect(result.current.slotsSelecao[0].data).toEqual(expectedDate);
        expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('foi movido para o dia'));
    });

    it('should not alter selection if slot is already reserved', () => {
        const { result } = renderHook(() => useSlotSelection({ hoje }));
        const slot = createSlot('1', '2026-06-03', 'reservado');

        act(() => {
            result.current.alternarSelecaoSlot(slot);
        });

        expect(result.current.slotsSelecao).toHaveLength(0);
    });

    it('should clear selection', () => {
        const slot = createSlot('1', '2026-06-03');
        const { result } = renderHook(() => useSlotSelection({ hoje, slotsIniciais: [slot] }));

        expect(result.current.slotsSelecao).toHaveLength(1);

        act(() => {
            result.current.limparSelecao();
        });

        expect(result.current.slotsSelecao).toHaveLength(0);
    });
});

describe('useSlotSelection: intervalo com Shift e marcacao em lote', () => {
    const hoje = parseISO('2026-06-02');

    const slotEm = (dia: string, inicio: string, status: SlotCalendario['status'] = 'livre'): SlotCalendario => ({
        id: `${dia}|${inicio}`,
        status,
        data: parseISO(dia),
        horario_inicio: inicio,
        horario_fim: inicio,
        agenda_id: 1,
        isLocked: false,
        isPast: false,
    });

    const secao = [
        slotEm('2026-06-03', '07:30:00'),
        slotEm('2026-06-03', '08:20:00'),
        slotEm('2026-06-03', '09:10:00'),
        slotEm('2026-06-03', '10:00:00'),
        slotEm('2026-06-04', '08:20:00'),
    ];

    const idsSelecionados = (slots: SlotCalendario[]) => slots.map((s) => s.id);

    it('Shift+clique com a ancora selecionada seleciona todo o intervalo do mesmo dia', () => {
        const { result } = renderHook(() => useSlotSelection({ hoje }));

        act(() => {
            result.current.alternarSelecaoSlot(secao[0]);
        });
        act(() => {
            result.current.alternarSelecaoIntervalo(secao[2], secao);
        });

        expect(idsSelecionados(result.current.slotsSelecao)).toEqual([secao[0].id, secao[1].id, secao[2].id]);
    });

    it('Shift+clique com a ancora desmarcada desmarca o intervalo', () => {
        const { result } = renderHook(() => useSlotSelection({ hoje, slotsIniciais: [secao[0], secao[1], secao[2]] }));

        act(() => {
            result.current.alternarSelecaoSlot(secao[0]);
        });
        expect(idsSelecionados(result.current.slotsSelecao)).toEqual([secao[1].id, secao[2].id]);

        act(() => {
            result.current.alternarSelecaoIntervalo(secao[2], secao);
        });

        expect(result.current.slotsSelecao).toEqual([]);
    });

    it('Shift+clique em outro dia comporta-se como clique simples', () => {
        const { result } = renderHook(() => useSlotSelection({ hoje }));

        act(() => {
            result.current.alternarSelecaoSlot(secao[0]);
        });
        act(() => {
            result.current.alternarSelecaoIntervalo(secao[4], secao);
        });

        expect(idsSelecionados(result.current.slotsSelecao)).toEqual([secao[0].id, secao[4].id]);
    });

    it('Shift+clique sem ancora comporta-se como clique simples', () => {
        const { result } = renderHook(() => useSlotSelection({ hoje }));

        act(() => {
            result.current.alternarSelecaoIntervalo(secao[2], secao);
        });

        expect(idsSelecionados(result.current.slotsSelecao)).toEqual([secao[2].id]);
    });

    it('limparSelecao descarta a ancora, e o proximo Shift+clique vira clique simples', () => {
        const { result } = renderHook(() => useSlotSelection({ hoje }));

        act(() => {
            result.current.alternarSelecaoSlot(secao[0]);
        });
        act(() => {
            result.current.limparSelecao();
        });
        act(() => {
            result.current.alternarSelecaoIntervalo(secao[2], secao);
        });

        expect(idsSelecionados(result.current.slotsSelecao)).toEqual([secao[2].id]);
    });

    it('intervalo nao inclui slots reservados', () => {
        const comReservado = [secao[0], slotEm('2026-06-03', '08:20:00', 'reservado'), secao[2]];
        const { result } = renderHook(() => useSlotSelection({ hoje }));

        act(() => {
            result.current.alternarSelecaoSlot(comReservado[0]);
        });
        act(() => {
            result.current.alternarSelecaoIntervalo(comReservado[2], comReservado);
        });

        expect(idsSelecionados(result.current.slotsSelecao)).toEqual([secao[0].id, secao[2].id]);
    });

    it('definirSelecaoDeVarios marca os selecionaveis e ignora reservados', () => {
        const comReservado = [secao[0], secao[1], slotEm('2026-06-03', '09:10:00', 'reservado')];
        const { result } = renderHook(() => useSlotSelection({ hoje }));

        act(() => {
            result.current.definirSelecaoDeVarios(comReservado, true);
        });

        expect(idsSelecionados(result.current.slotsSelecao)).toEqual([secao[0].id, secao[1].id]);
    });

    it('definirSelecaoDeVarios com false desmarca apenas os slots indicados', () => {
        const { result } = renderHook(() => useSlotSelection({ hoje, slotsIniciais: [secao[0], secao[1], secao[2]] }));

        act(() => {
            result.current.definirSelecaoDeVarios([secao[0], secao[1]], false);
        });

        expect(idsSelecionados(result.current.slotsSelecao)).toEqual([secao[2].id]);
    });
});
