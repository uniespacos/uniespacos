import { fireEvent, render, screen } from '@testing-library/react';
import { ViewModeToggle } from './ViewModeToggle';

describe('ViewModeToggle', () => {
    it('renders both options with correct labels', () => {
        render(<ViewModeToggle viewMode="table" onViewModeChange={jest.fn()} />);

        expect(screen.getByRole('button', { name: /visualização em lista/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /visualização em cards/i })).toBeInTheDocument();
    });

    it('calls onViewModeChange when clicking on inactive mode', () => {
        const handleModeChange = jest.fn();
        render(<ViewModeToggle viewMode="table" onViewModeChange={handleModeChange} />);

        const cardsButton = screen.getByRole('button', { name: /visualização em cards/i });
        fireEvent.click(cardsButton);

        expect(handleModeChange).toHaveBeenCalledWith('grid');
    });
});
