import { render, screen } from '@testing-library/react';
import { SituacaoBadge } from './SituacaoBadge';

describe('SituacaoBadge', () => {
    it.each([
        ['em_analise', 'Em Análise'],
        ['parcialmente_deferida', 'Parcialmente Deferida'],
        ['deferida', 'Deferida'],
        ['indeferida', 'Indeferida'],
        ['inativa', 'Inativa / Cancelada'],
    ] as const)('renderiza o rótulo de %s', (situacao, rotulo) => {
        render(<SituacaoBadge situacao={situacao} />);

        expect(screen.getByText(rotulo)).toBeInTheDocument();
    });

    it('aplica uma classe de token de tema, nunca uma classe inexistente', () => {
        render(<SituacaoBadge situacao="inativa" />);

        const badge = screen.getByText('Inativa / Cancelada').closest('[class]');

        expect(badge?.className).not.toMatch(/\bblack-\d/);
        expect(badge?.className).toMatch(/neutral-accent/);
    });
});
