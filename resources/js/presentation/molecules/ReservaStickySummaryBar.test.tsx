import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReservaStickySummaryBar } from './ReservaStickySummaryBar';
import { SlotReservaItem } from '@/types/reserva-stepper';

describe('ReservaStickySummaryBar', () => {
    const mockSlots: SlotReservaItem[] = [
        { id: '1', data: '2026-08-25', horario_inicio: '08:00', horario_fim: '09:00' },
        { id: '2', data: '2026-08-25', horario_inicio: '09:00', horario_fim: '10:00' },
    ];

    it('returns null when slots list is empty', () => {
        const { container } = render(<ReservaStickySummaryBar slots={[]} onConfirm={jest.fn()} onClear={jest.fn()} />);

        expect(container.firstChild).toBeNull();
    });

    it('renders total slot counter correctly', () => {
        render(<ReservaStickySummaryBar slots={mockSlots} onConfirm={jest.fn()} onClear={jest.fn()} />);

        expect(screen.getByText('2 horários selecionados')).toBeInTheDocument();
        expect(screen.getByText('Pronto para preencher a solicitação')).toBeInTheDocument();
    });

    it('handles confirm and clear button clicks', () => {
        const handleConfirm = jest.fn();
        const handleClear = jest.fn();

        render(<ReservaStickySummaryBar slots={mockSlots} onConfirm={handleConfirm} onClear={handleClear} />);

        fireEvent.click(screen.getByRole('button', { name: /limpar/i }));
        expect(handleClear).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
        expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('disables continue button when disabled prop is true', () => {
        render(<ReservaStickySummaryBar slots={mockSlots} onConfirm={jest.fn()} onClear={jest.fn()} disabled={true} />);

        expect(screen.getByRole('button', { name: /continuar/i })).toBeDisabled();
    });
});
