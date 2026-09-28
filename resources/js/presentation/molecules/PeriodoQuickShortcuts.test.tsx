import { fireEvent, render, screen } from '@testing-library/react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { PeriodoQuickShortcuts } from './PeriodoQuickShortcuts';

describe('PeriodoQuickShortcuts', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-09-28T12:00:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders all shortcut buttons', () => {
        const onSelectRange = jest.fn();
        render(<PeriodoQuickShortcuts onSelectRange={onSelectRange} />);

        expect(screen.getByRole('button', { name: 'Hoje' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '7 dias' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Este Mês' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mês Anterior' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ano Atual' })).toBeInTheDocument();
    });

    it('triggers onSelectRange for Hoje', () => {
        const onSelectRange = jest.fn();
        render(<PeriodoQuickShortcuts onSelectRange={onSelectRange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));

        const now = new Date();
        const expectedStart = format(startOfDay(now), 'yyyy-MM-dd');
        const expectedEnd = format(endOfDay(now), 'yyyy-MM-dd');

        expect(onSelectRange).toHaveBeenCalledWith(expectedStart, expectedEnd, 'hoje');
    });

    it('triggers onSelectRange for 7 dias', () => {
        const onSelectRange = jest.fn();
        render(<PeriodoQuickShortcuts onSelectRange={onSelectRange} />);

        fireEvent.click(screen.getByRole('button', { name: '7 dias' }));

        const now = new Date();
        const expectedStart = format(startOfDay(subDays(now, 7)), 'yyyy-MM-dd');
        const expectedEnd = format(endOfDay(now), 'yyyy-MM-dd');

        expect(onSelectRange).toHaveBeenCalledWith(expectedStart, expectedEnd, '7dias');
    });

    it('triggers onSelectRange for Este Mês', () => {
        const onSelectRange = jest.fn();
        render(<PeriodoQuickShortcuts onSelectRange={onSelectRange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Este Mês' }));

        const now = new Date();
        const expectedStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const expectedEnd = format(endOfMonth(now), 'yyyy-MM-dd');

        expect(onSelectRange).toHaveBeenCalledWith(expectedStart, expectedEnd, 'este_mes');
    });

    it('triggers onSelectRange for Mês Anterior', () => {
        const onSelectRange = jest.fn();
        render(<PeriodoQuickShortcuts onSelectRange={onSelectRange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Mês Anterior' }));

        const now = new Date();
        const prev = subMonths(now, 1);
        const expectedStart = format(startOfMonth(prev), 'yyyy-MM-dd');
        const expectedEnd = format(endOfMonth(prev), 'yyyy-MM-dd');

        expect(onSelectRange).toHaveBeenCalledWith(expectedStart, expectedEnd, 'mes_anterior');
    });

    it('triggers onSelectRange for Ano Atual', () => {
        const onSelectRange = jest.fn();
        render(<PeriodoQuickShortcuts onSelectRange={onSelectRange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Ano Atual' }));

        const now = new Date();
        const expectedStart = format(startOfYear(now), 'yyyy-MM-dd');
        const expectedEnd = format(endOfYear(now), 'yyyy-MM-dd');

        expect(onSelectRange).toHaveBeenCalledWith(expectedStart, expectedEnd, 'ano_atual');
    });
});
