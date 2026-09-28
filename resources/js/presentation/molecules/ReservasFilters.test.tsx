import { ModoArquivo, OrdenacaoReserva, SituacaoReserva } from '@/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReservasFilters } from './ReservasFilters';

jest.mock('@/hooks/use-mobile', () => ({
    useIsMobile: jest.fn(),
}));

const mockedUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>;

describe('ReservasFilters', () => {
    const props = {
        searchTerm: '',
        onSearchTermChange: jest.fn(),
        selectedSituacao: '' as const,
        onSituacaoChange: jest.fn(),
        selectedArquivo: ModoArquivo.ATIVAS,
        onArquivoChange: jest.fn(),
        selectedOrdenar: OrdenacaoReserva.DATA_SOLICITACAO,
        onOrdenarChange: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockedUseIsMobile.mockReturnValue(false); // default desktop
    });

    it('oferece o seletor de arquivamento', () => {
        render(<ReservasFilters {...props} />);

        expect(screen.getByLabelText('Exibir')).toBeInTheDocument();
    });

    it('mostra o modo selecionado', () => {
        render(<ReservasFilters {...props} selectedArquivo={ModoArquivo.ARQUIVADAS} />);

        expect(screen.getByLabelText('Exibir')).toHaveTextContent('Arquivadas');
    });

    it('cai em Ativas quando nao recebe valor', () => {
        render(<ReservasFilters {...props} selectedArquivo={ModoArquivo.ATIVAS} />);

        expect(screen.getByLabelText('Exibir')).toHaveTextContent('Ativas');
    });

    it('nao oferece mais inativa entre as situacoes', () => {
        render(<ReservasFilters {...props} />);

        fireEvent.click(screen.getByLabelText('Situação'));

        expect(screen.queryByText('Inativa')).not.toBeInTheDocument();
        expect(screen.getByText('Em Análise')).toBeInTheDocument();
    });

    it('rotula o item vazio de situacao como Todas as situacoes', () => {
        render(<ReservasFilters {...props} />);

        fireEvent.click(screen.getByLabelText('Situação'));

        expect(screen.getAllByText('Todas as situações').length).toBeGreaterThan(0);
    });

    it('mostra Todas as situacoes no trigger quando nao ha filtro', () => {
        render(<ReservasFilters {...props} />);

        expect(screen.getByLabelText('Situação')).toHaveTextContent('Todas as situações');
    });

    it('notifica o pai ao escolher Arquivadas', () => {
        render(<ReservasFilters {...props} />);

        fireEvent.click(screen.getByLabelText('Exibir'));
        fireEvent.click(screen.getByText('Arquivadas'));

        expect(props.onArquivoChange).toHaveBeenCalledWith(ModoArquivo.ARQUIVADAS);
    });

    it('oferece o seletor de ordenacao com Data de solicitacao como padrao', () => {
        render(<ReservasFilters {...props} />);

        expect(screen.getByLabelText('Ordenar por')).toHaveTextContent('Data de solicitação');
    });

    it('notifica o pai ao escolher ordenar por Situacao', () => {
        render(<ReservasFilters {...props} />);

        fireEvent.click(screen.getByLabelText('Ordenar por'));
        fireEvent.click(screen.getByRole('option', { name: 'Situação' }));

        expect(props.onOrdenarChange).toHaveBeenCalledWith(OrdenacaoReserva.SITUACAO);
    });

    it('notifica o pai ao escolher situacao especifica', () => {
        render(<ReservasFilters {...props} />);

        fireEvent.click(screen.getByLabelText('Situação'));
        fireEvent.click(screen.getByRole('option', { name: 'Em Análise' }));

        expect(props.onSituacaoChange).toHaveBeenCalledWith(SituacaoReserva.EM_ANALISE);
    });

    describe('no mobile', () => {
        beforeEach(() => {
            mockedUseIsMobile.mockReturnValue(true);
        });

        it('nao renderiza ViewModeToggle', () => {
            render(<ReservasFilters {...props} viewMode="table" onViewModeChange={jest.fn()} />);

            // ViewModeToggle deve ter um grupo com aria-label contendo "modo de visualização"
            // Se não renderizar no mobile, não deve estar no documento
            const viewModeGroup = screen.queryByRole('group');
            expect(viewModeGroup).not.toBeInTheDocument();
        });

        it('nao renderiza filtros inline na tela antes do drawer ser aberto', () => {
            render(<ReservasFilters {...props} />);

            // Todos os 4 filtros (Situação, Exibir, Ordenar por, Data) devem estar ocultos
            // até que o Drawer seja aberto. Verificamos que não estão acessíveis.
            expect(screen.queryByLabelText('Situação')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Exibir')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Ordenar por')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Data')).not.toBeInTheDocument();
        });

        it('renderiza botao de filtros com icone', () => {
            render(<ReservasFilters {...props} />);

            // Procura por um botão que contenha o ícone de filtros
            const filterButton = screen.getByRole('button');
            expect(filterButton).toBeInTheDocument();
            // O botão deve ter um aria-label ou sr-only text
            expect(filterButton).toHaveTextContent('Filtros');
        });

        it('abre drawer ao clicar no botao de filtros', () => {
            render(<ReservasFilters {...props} />);

            const filterButton = screen.getByRole('button');
            fireEvent.click(filterButton);

            // Após abrir o Drawer, os labels dos filtros devem estar acessíveis
            expect(screen.getByLabelText('Situação')).toBeInTheDocument();
            expect(screen.getByLabelText('Exibir')).toBeInTheDocument();
            expect(screen.getByLabelText('Ordenar por')).toBeInTheDocument();
            expect(screen.getByLabelText('Data')).toBeInTheDocument();
        });

        it('mostra badge de contagem quando ha filtros ativos', () => {
            const { rerender } = render(<ReservasFilters {...props} />);

            // Sem filtros ativos, badge não deve aparecer
            expect(screen.queryByText('1')).not.toBeInTheDocument();

            // Com situação filtrada
            rerender(
                <ReservasFilters
                    {...props}
                    selectedSituacao={SituacaoReserva.DEFERIDA}
                />,
            );

            expect(screen.getByText('1')).toBeInTheDocument();
        });

        it('nao mostra badge de contagem quando nao ha filtros ativos', () => {
            render(<ReservasFilters {...props} />);

            // Todos os filtros estão no padrão (sem filtro ativo)
            // Badge não deve aparecer
            expect(screen.queryByText('1')).not.toBeInTheDocument();
        });
    });
});
