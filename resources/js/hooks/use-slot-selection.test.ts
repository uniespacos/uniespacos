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
