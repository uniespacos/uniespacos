import { render, screen } from '@testing-library/react';
import GenericHeader from './GenericHeader';

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { locale: 'pt-BR' } }),
    router: { get: jest.fn() },
}));

describe('GenericHeader', () => {
    it('renderiza_titulo_como_unico_h1', () => {
        render(<GenericHeader titulo="Relatórios de Espaços" descricao="Acompanhe a ocupação" />);

        expect(screen.getByRole('heading', { level: 1, name: 'Relatórios de Espaços' })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByText('Acompanhe a ocupação')).toBeInTheDocument();
    });

    it('omite_paragrafo_de_descricao_quando_ausente', () => {
        const { container } = render(<GenericHeader titulo="Agenda - Sala 101" />);

        expect(screen.getByRole('heading', { level: 1, name: 'Agenda - Sala 101' })).toBeInTheDocument();
        expect(container.querySelector('p')).toBeNull();
    });

    it('renderiza_actions_no_cabecalho', () => {
        render(<GenericHeader titulo="Relatórios" descricao="desc" actions={<button type="button">Exportar</button>} />);

        expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
    });

    it('nao_renderiza_actions_quando_ausente', () => {
        const { container } = render(<GenericHeader titulo="Relatórios" descricao="desc" />);

        expect(container.querySelector('button')).toBeNull();
    });

    it('usa_rotulo_traduzido_padrao_quando_botao_nao_tem_texto', () => {
        render(<GenericHeader titulo="Setores" descricao="desc" canSeeButton />);

        expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument();
        expect(screen.queryByText('N/A')).not.toBeInTheDocument();
    });

    it('usa_texto_informado_no_botao', () => {
        render(<GenericHeader titulo="Setores" descricao="desc" canSeeButton buttonText="Novo Setor" />);

        expect(screen.getByRole('button', { name: 'Novo Setor' })).toBeInTheDocument();
    });
});
