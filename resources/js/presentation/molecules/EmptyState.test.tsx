import { render, screen } from '@testing-library/react';
import { SearchX } from 'lucide-react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
    it('renderiza_titulo_como_h3_e_descricao', () => {
        render(<EmptyState title="Nenhum espaço encontrado" description="Tente ajustar os filtros." />);

        expect(screen.getByRole('heading', { level: 3, name: 'Nenhum espaço encontrado' })).toBeInTheDocument();
        expect(screen.getByText('Tente ajustar os filtros.')).toBeInTheDocument();
    });

    it('omite_descricao_e_acao_quando_ausentes', () => {
        const { container } = render(<EmptyState title="Sem registros" />);

        expect(container.querySelector('p')).toBeNull();
        expect(container.querySelector('button')).toBeNull();
    });

    it('renderiza_icone_quando_informado', () => {
        const { container } = render(<EmptyState icon={SearchX} title="Vazio" />);

        expect(container.querySelector('svg')).not.toBeNull();
    });

    it('nao_renderiza_icone_quando_ausente', () => {
        const { container } = render(<EmptyState title="Vazio" />);

        expect(container.querySelector('svg')).toBeNull();
    });

    it('renderiza_action_customizada', () => {
        render(<EmptyState title="Vazio" action={<button type="button">Limpar filtros</button>} />);

        expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
    });

    it('usa_tamanho_default_quando_nao_informado', () => {
        const { container } = render(<EmptyState title="Vazio" />);

        expect(container.firstElementChild).toHaveAttribute('data-size', 'default');
    });

    it('aplica_tamanho_compact_informado', () => {
        const { container } = render(<EmptyState title="Vazio" size="compact" />);

        expect(container.firstElementChild).toHaveAttribute('data-size', 'compact');
    });
});
