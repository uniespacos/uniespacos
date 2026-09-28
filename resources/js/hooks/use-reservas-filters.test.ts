import { ModoArquivo, OrdenacaoReserva, SituacaoReserva } from '@/contracts';
import { act, renderHook } from '@testing-library/react';
import { useReservasFilters } from './use-reservas-filters';

const mockGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    router: {
        get: (...args: unknown[]) => {
            mockGet(...args);
        },
    },
}));

jest.mock('@/lib/utils', () => ({
    useDebounce: jest.fn((val: string) => val),
}));

describe('useReservasFilters', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('should initialize states with initial props', () => {
        const { result } = renderHook(() =>
            useReservasFilters({
                routeName: 'reservas.index',
                initialFilters: {
                    search: 'test',
                    situacao: SituacaoReserva.EM_ANALISE,
                    arquivo: ModoArquivo.ARQUIVADAS,
                    ordenar: OrdenacaoReserva.SITUACAO,
                },
                initialSemana: { referencia: '2026-06-02' },
            }),
        );

        expect(result.current.searchTerm).toBe('test');
        expect(result.current.selectedSituacao).toBe(SituacaoReserva.EM_ANALISE);
        expect(result.current.selectedArquivo).toBe(ModoArquivo.ARQUIVADAS);
        expect(result.current.selectedOrdenar).toBe(OrdenacaoReserva.SITUACAO);
        expect(result.current.selectedDate).toBeInstanceOf(Date);
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('should call router.get when filters change', () => {
        const { result } = renderHook(() =>
            useReservasFilters({
                routeName: 'reservas.index',
                initialFilters: {},
                initialSemana: { referencia: '2026-06-02' },
            }),
        );

        act(() => {
            result.current.setSearchTerm('sala 101');
        });

        expect(mockGet).toHaveBeenCalledWith(
            'reservas.index',
            expect.objectContaining({
                search: 'sala 101',
            }),
            expect.objectContaining({
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }),
        );
    });

    it('should omit default params from query string when equal to defaults', () => {
        const { result } = renderHook(() =>
            useReservasFilters({
                routeName: 'reservas.index',
                initialFilters: {
                    arquivo: ModoArquivo.ATIVAS,
                    ordenar: OrdenacaoReserva.DATA_SOLICITACAO,
                },
                initialSemana: { referencia: '2026-06-02' },
            }),
        );

        act(() => {
            result.current.setSelectedSituacao(SituacaoReserva.DEFERIDA);
        });

        expect(mockGet).toHaveBeenCalledWith(
            'reservas.index',
            expect.objectContaining({
                situacao: SituacaoReserva.DEFERIDA,
                arquivo: undefined,
                ordenar: undefined,
            }),
            expect.anything(),
        );
    });
});
