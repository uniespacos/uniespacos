import { Horario, Reserva, User } from '@/types';
import { act, renderHook } from '@testing-library/react';
import { useReservationSlots } from './use-reservation-slots';

describe('useReservationSlots', () => {
    const mockReserva = (horarios: Horario[]): Reserva => ({
        id: 1,
        titulo: 'Teste',
        descricao: 'Desc',
        situacao: 'em_analise',
        data_inicial: new Date(),
        data_final: new Date(),
        recorrencia: 'unica',
        observacao: '',
        created_at: '',
        updated_at: '',
        user: { id: 1, name: 'User Teste' } as User,
        horarios,
    });

    it('should map reservation schedules to initial slots correctly', () => {
        const horarios: Horario[] = [
            {
                id: 10,
                data: '2026-06-03',
                horario_inicio: '08:20:00',
                horario_fim: '09:10:00',
                situacao: 'em_analise',
                is_conflicted: false,
                validation_status: 'completed',
                conflict_cache: null,
                cache_validated_at: null,
                agenda: { id: 2, turno: 'manha' },
            },
            {
                id: 11,
                data: '2026-06-04',
                horario_inicio: '09:10:00',
                horario_fim: '10:00:00',
                situacao: 'deferida',
                is_conflicted: true,
                validation_status: 'completed',
                conflict_cache: null,
                cache_validated_at: null,
                agenda: { id: 2, turno: 'manha' },
            },
        ];

        const { result } = renderHook(() => useReservationSlots(mockReserva(horarios)));

        expect(result.current.initialSlots).toHaveLength(2);

        expect(result.current.initialSlots[0]?.id).toBe('2026-06-03|08:20:00');
        expect(result.current.initialSlots[0]?.status).toBe('solicitado');
        expect(result.current.initialSlots[0]?.isLocked).toBe(false);

        expect(result.current.initialSlots[1]?.id).toBe('2026-06-04|09:10:00');
        expect(result.current.initialSlots[1]?.status).toBe('indeferida');
        expect(result.current.initialSlots[1]?.isLocked).toBe(true);
    });

    it('should alternate status of non-locked slots on avaliarSlot', () => {
        const horarios: Horario[] = [
            {
                id: 10,
                data: '2026-06-03',
                horario_inicio: '08:20:00',
                horario_fim: '09:10:00',
                situacao: 'em_analise',
                is_conflicted: false,
                validation_status: 'completed',
                conflict_cache: null,
                cache_validated_at: null,
                agenda: { id: 2, turno: 'manha' },
            },
            {
                id: 11,
                data: '2026-06-04',
                horario_inicio: '09:10:00',
                horario_fim: '10:00:00',
                situacao: 'em_analise',
                is_conflicted: true,
                validation_status: 'completed',
                conflict_cache: null,
                cache_validated_at: null,
                agenda: { id: 2, turno: 'manha' },
            },
        ];

        const { result } = renderHook(() => useReservationSlots(mockReserva(horarios)));

        const firstSlot = result.current.slotsSelecao[0];
        const lockedSlot = result.current.slotsSelecao[1];

        act(() => {
            result.current.avaliarSlot(firstSlot);
        });
        expect(result.current.slotsSelecao[0]?.status).toBe('deferida');

        const deferidoSlot = result.current.slotsSelecao[0];
        act(() => {
            result.current.avaliarSlot(deferidoSlot);
        });
        expect(result.current.slotsSelecao[0]?.status).toBe('indeferida');

        const indeferidoSlot = result.current.slotsSelecao[0];
        act(() => {
            result.current.avaliarSlot(indeferidoSlot);
        });
        expect(result.current.slotsSelecao[0]?.status).toBe('solicitado');

        act(() => {
            result.current.avaliarSlot(lockedSlot);
        });
        expect(result.current.slotsSelecao[1]?.status).toBe('indeferida');
    });

    it('should change status of all non-locked slots on handleDecisaoGlobalChange', () => {
        const horarios: Horario[] = [
            {
                id: 10,
                data: '2026-06-03',
                horario_inicio: '08:20:00',
                horario_fim: '09:10:00',
                situacao: 'em_analise',
                is_conflicted: false,
                validation_status: 'completed',
                conflict_cache: null,
                cache_validated_at: null,
                agenda: { id: 2, turno: 'manha' },
            },
            {
                id: 11,
                data: '2026-06-04',
                horario_inicio: '09:10:00',
                horario_fim: '10:00:00',
                situacao: 'em_analise',
                is_conflicted: true,
                validation_status: 'completed',
                conflict_cache: null,
                cache_validated_at: null,
                agenda: { id: 2, turno: 'manha' },
            },
        ];

        const { result } = renderHook(() => useReservationSlots(mockReserva(horarios)));

        act(() => {
            result.current.handleDecisaoGlobalChange('deferida');
        });

        expect(result.current.slotsSelecao[0]?.status).toBe('deferida');
        expect(result.current.slotsSelecao[1]?.status).toBe('indeferida');
    });
});
