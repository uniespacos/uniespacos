import { render, screen } from '@testing-library/react';
import { SituacaoIndicator } from './SituacaoIndicator';
import { SituacaoReserva } from '@/contracts/situacao-reserva.contract';

describe('SituacaoIndicator', () => {
    it.each([
        [SituacaoReserva.EM_ANALISE, 'Em Análise'],
        [SituacaoReserva.PARCIALMENTE_DEFERIDA, 'Parcialmente Deferida'],
        [SituacaoReserva.DEFERIDA, 'Deferida'],
        [SituacaoReserva.INDEFERIDA, 'Indeferida'],
        [SituacaoReserva.INATIVA, 'Inativa / Cancelada'],
    ])('renders indicator dot and text for %s', (situacao, label) => {
        render(<SituacaoIndicator situacao={situacao} />);

        expect(screen.getByText(label)).toBeInTheDocument();
    });
});
