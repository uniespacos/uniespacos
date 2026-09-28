import { Reserva } from '@/types';
import { useForm } from '@inertiajs/react';
import { act, renderHook } from '@testing-library/react';
import { useAvaliarReserva } from './use-avaliar-reserva';

jest.mock('@inertiajs/react', () => ({
    useForm: jest.fn(),
}));

interface MockFormShape {
    data: Record<string, unknown>;
    setData: jest.Mock;
    errors: Record<string, string>;
    processing: boolean;
    patch: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
}

describe('useAvaliarReserva', () => {
    let mockForm: MockFormShape;
    let mockReserva: Reserva;

    beforeEach(() => {
        mockReserva = {
            id: 123,
            titulo: 'Reserva Teste',
            descricao: 'Descrição',
            situacao: 'em_analise',
            data_inicial: new Date(),
            data_final: new Date(),
            recorrencia: 'unica',
            observacao: 'obs',
            created_at: '',
            updated_at: '',
            horarios: [],
        };

        mockForm = {
            data: {
                situacao: 'em_analise',
                motivo: '',
                observacao: 'obs',
                horarios_avaliados: [],
                evaluation_scope: 'recurring',
            },
            setData: jest.fn(),
            errors: {},
            processing: false,
            patch: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
        };

        (useForm as jest.Mock).mockReturnValue(mockForm);
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('should initialize form with reservation details', () => {
        const { result } = renderHook(() => useAvaliarReserva({ reserva: mockReserva }));
        expect(result.current.form.data.situacao).toBe('em_analise');
        expect(result.current.form.data.observacao).toBe('obs');
    });

    it('should call form.submit on submitEvaluation', () => {
        const { result } = renderHook(() => useAvaliarReserva({ reserva: mockReserva }));
        const preventDefault = jest.fn();
        const e = { preventDefault } as unknown as React.SyntheticEvent;

        act(() => {
            result.current.submitEvaluation(e);
        });

        expect(preventDefault).toHaveBeenCalled();
        expect(mockForm.patch).toHaveBeenCalledWith('gestor.reservas.update', expect.any(Object));
    });
});
