import { Espaco, Horario, Reserva, SlotCalendario, User } from '@/types';
import { act, renderHook } from '@testing-library/react';
import { type SyntheticEvent } from 'react';
import { toast } from 'sonner';
import { useAgendaSelection } from './use-agenda-selection';

const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockReset = jest.fn();
const mockSetData = jest.fn();

jest.mock('@inertiajs/react', () => ({
    useForm: (initialValues: Record<string, unknown>) => ({
        data: initialValues,
        setData: mockSetData,
        post: mockPost,
        patch: mockPatch,
        processing: false,
        reset: mockReset,
        errors: {},
    }),
}));

jest.mock('sonner', () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
        info: jest.fn(),
    },
}));

describe('useAgendaSelection', () => {
    let mockEspaco: Espaco;
    let mockReserva: Reserva;

    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);

        mockEspaco = {
            id: 1,
            nome: 'Auditório',
            agendas: [],
            capacidade_pessoas: 100,
            descricao: '',
            imagens: [],
            main_image_index: null,
        };

        const mockHorarios: Horario[] = [
            {
                id: 1,
                data: '2026-06-03',
                horario_inicio: '08:20:00',
                horario_fim: '09:10:00',
                situacao: 'deferida',
                validation_status: 'completed',
                conflict_cache: null,
                cache_validated_at: null,
                agenda: { id: 2, turno: 'manha' },
            },
        ];

        mockReserva = {
            id: 100,
            titulo: 'Reserva Antiga',
            descricao: 'Desc Antiga',
            data_inicial: new Date('2026-06-01'),
            data_final: new Date('2026-06-30'),
            recorrencia: 'unica',
            observacao: '',
            created_at: '',
            updated_at: '',
            situacao: 'em_analise',
            horarios: mockHorarios,
            user: { id: 10, name: 'Solicitante' } as User,
        };
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('should initialize slots and data with reservation details in edit mode', () => {
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                reserva: mockReserva,
                isEditMode: true,
                semanaVisivel: new Date('2026-06-01'),
            }),
        );

        expect(result.current.formData).toEqual(
            expect.objectContaining({
                titulo: 'Reserva Antiga',
                descricao: 'Desc Antiga',
                recorrencia: 'unica',
            }),
        );

        expect(result.current.slotsSelecao).toHaveLength(1);
        expect(result.current.slotsSelecao[0]?.id).toBe('2026-06-03|08:20:00');
    });

    it('should show toast validation error on submit if no slots selected', () => {
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                isEditMode: false,
                semanaVisivel: new Date('2026-06-01'),
            }),
        );

        const preventDefault = jest.fn();
        const e = { preventDefault } as unknown as SyntheticEvent;
        act(() => {
            result.current.handleFormSubmit(e);
        });

        expect(preventDefault).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Selecione pelo menos um horário para reservar.');
    });

    it('should submit post form when not in edit mode and slots are selected', () => {
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                isEditMode: false,
                semanaVisivel: new Date('2026-06-01'),
            }),
        );

        const slot: SlotCalendario = {
            id: '2026-06-03|08:20:00',
            status: 'solicitado',
            data: new Date('2026-06-03'),
            horario_inicio: '08:20:00',
            horario_fim: '09:10:00',
            agenda_id: 2,
            isPast: false,
        };

        act(() => {
            result.current.alternarSelecaoSlot(slot);
        });

        // Set formData horarios_solicitados directly to simulate sync for submit
        result.current.formData.horarios_solicitados = [
            {
                data: '2026-06-03',
                horario_inicio: '08:20:00',
                horario_fim: '09:10:00',
                agenda: { id: 2, turno: 'manha' },
            },
        ];

        const preventDefault = jest.fn();
        const e = { preventDefault } as unknown as SyntheticEvent;
        act(() => {
            result.current.handleFormSubmit(e);
        });

        expect(mockPost).toHaveBeenCalledWith('reservas.store', expect.any(Object));
    });
});
