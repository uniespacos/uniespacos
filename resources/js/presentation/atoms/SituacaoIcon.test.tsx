import { render } from '@testing-library/react';
import { SituacaoIcon } from './SituacaoIcon';
import { SituacaoReserva } from '@/contracts/situacao-reserva.contract';

describe('SituacaoIcon', () => {
    it.each([
        [SituacaoReserva.EM_ANALISE, 'text-warning-accent'],
        [SituacaoReserva.PARCIALMENTE_DEFERIDA, 'text-info-accent'],
        [SituacaoReserva.DEFERIDA, 'text-success-accent'],
        [SituacaoReserva.INDEFERIDA, 'text-destructive-accent'],
        [SituacaoReserva.INATIVA, 'text-neutral-accent'],
    ])('renders correct icon and color for %s', (situacao, expectedClass) => {
        const { container } = render(<SituacaoIcon situacao={situacao} className="h-5 w-5" />);
        const svg = container.querySelector('svg');

        expect(svg).toBeInTheDocument();
        expect(svg).toHaveClass('h-5', 'w-5', expectedClass);
    });

    it('uses default className if not provided', () => {
        const { container } = render(<SituacaoIcon situacao={SituacaoReserva.DEFERIDA} />);
        const svg = container.querySelector('svg');

        expect(svg).toBeInTheDocument();
        expect(svg).toHaveClass('h-4', 'w-4', 'text-success-accent');
    });
});
