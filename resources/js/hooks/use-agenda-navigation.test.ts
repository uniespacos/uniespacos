import { router } from '@inertiajs/react';
import { act, renderHook } from '@testing-library/react';
import { addWeeks, format, parseISO, subWeeks } from 'date-fns';
import { useAgendaNavigation } from './use-agenda-navigation';

jest.mock('@inertiajs/react', () => ({
    router: {
        get: jest.fn(),
    },
}));

describe('useAgendaNavigation', () => {
    const routeName = 'espacos.show';
    const routeParams = { espaco: 1 };
    const semanaInicial = parseISO('2026-06-01');

    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name, params) => `${name}/${JSON.stringify(params)}`);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('should initialize visible week and default states', () => {
        const { result } = renderHook(() =>
            useAgendaNavigation({
                semanaInicial,
                routeName,
                routeParams,
            }),
        );

        expect(result.current.semanaVisivel).toEqual(semanaInicial);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.podeVoltar).toBe(true);
        expect(result.current.podeAvancar).toBe(true);
    });

    it('should update visible week when initial week prop changes', () => {
        const { result, rerender } = renderHook(
            ({ week }) =>
                useAgendaNavigation({
                    semanaInicial: week,
                    routeName,
                    routeParams,
                }),
            { initialProps: { week: semanaInicial } },
        );

        const newWeek = parseISO('2026-06-08');
        rerender({ week: newWeek });

        expect(result.current.semanaVisivel).toEqual(newWeek);
    });

    it('should navigate to the previous week', () => {
        const { result } = renderHook(() =>
            useAgendaNavigation({
                semanaInicial,
                routeName,
                routeParams,
            }),
        );

        act(() => {
            result.current.irParaSemanaAnterior();
        });

        const expectedDate = subWeeks(semanaInicial, 1);
        expect(router.get).toHaveBeenCalledWith(expect.any(String), { semana: format(expectedDate, 'yyyy-MM-dd') }, expect.any(Object));
    });

    it('should navigate to the next week', () => {
        const { result } = renderHook(() =>
            useAgendaNavigation({
                semanaInicial,
                routeName,
                routeParams,
            }),
        );

        act(() => {
            result.current.irParaProximaSemana();
        });

        const expectedDate = addWeeks(semanaInicial, 1);
        expect(router.get).toHaveBeenCalledWith(expect.any(String), { semana: format(expectedDate, 'yyyy-MM-dd') }, expect.any(Object));
    });

    it('should not navigate to the previous week if podeVoltar is false', () => {
        const dataInicial = parseISO('2026-06-01');
        const { result } = renderHook(() =>
            useAgendaNavigation({
                semanaInicial,
                routeName,
                routeParams,
                dataInicial,
            }),
        );

        expect(result.current.podeVoltar).toBe(false);

        act(() => {
            result.current.irParaSemanaAnterior();
        });

        expect(router.get).not.toHaveBeenCalled();
    });

    it('should not navigate to the next week if podeAvancar is false', () => {
        const dataFinal = parseISO('2026-06-05');
        const { result } = renderHook(() =>
            useAgendaNavigation({
                semanaInicial,
                routeName,
                routeParams,
                dataFinal,
            }),
        );

        expect(result.current.podeAvancar).toBe(false);

        act(() => {
            result.current.irParaProximaSemana();
        });

        expect(router.get).not.toHaveBeenCalled();
    });

    it('should navigate to current week on irParaSemanaAtual', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-06-15T12:00:00'));

        const { result } = renderHook(() =>
            useAgendaNavigation({
                semanaInicial,
                routeName,
                routeParams,
            }),
        );

        act(() => {
            result.current.irParaSemanaAtual();
        });

        expect(router.get).toHaveBeenCalledWith(expect.any(String), { semana: '2026-06-15' }, expect.any(Object));

        jest.useRealTimers();
    });
});
