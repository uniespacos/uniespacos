import { router } from '@inertiajs/react';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedSearch } from './use-debounced-search';

jest.mock('@inertiajs/react', () => ({
    router: {
        get: jest.fn(),
    },
}));

describe('useDebouncedSearch', () => {
    let getSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        getSpy = jest.spyOn(router, 'get');
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        jest.useRealTimers();
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('does not trigger search on initial mount', () => {
        renderHook(() => useDebouncedSearch({ routeName: 'institucional.instituicoes.index', initialSearch: 'teste' }));

        jest.advanceTimersByTime(500);

        expect(getSpy).not.toHaveBeenCalled();
    });

    it('triggers debounced search when searchTerm updates', () => {
        const { result } = renderHook(() => useDebouncedSearch({ routeName: 'institucional.instituicoes.index', delay: 300 }));

        act(() => {
            result.current.setSearchTerm('campus');
        });

        expect(getSpy).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(getSpy).toHaveBeenCalledWith(
            'https://localhost/institucional/instituicoes/index',
            { search: 'campus' },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    });

    it('passes partial reload options (only) when specified', () => {
        const { result } = renderHook(() =>
            useDebouncedSearch({
                routeName: 'espacos.index',
                delay: 300,
                only: ['espacos', 'filters'],
            }),
        );

        act(() => {
            result.current.setSearchTerm('auditorio');
        });

        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(getSpy).toHaveBeenCalledWith(
            'https://localhost/espacos/index',
            { search: 'auditorio' },
            { preserveState: true, preserveScroll: true, replace: true, only: ['espacos', 'filters'] },
        );
    });
});
