import InstituicoesPage from './Instituicoes';
import { render, screen } from '@testing-library/react';

const mockGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            instituicoes: {
                data: [
                    {
                        id: 1,
                        nome: 'Universidade Estadual do Sudoeste da Bahia',
                        sigla: 'UESB',
                        endereco: 'Estrada do Bem Querer, km 04',
                    },
                ],
                links: [
                    { url: null, label: '&laquo; Anterior', active: false },
                    { url: 'https://localhost/institucional/instituicoes?page=1', label: '1', active: true },
                    { url: null, label: 'Próximo &raquo;', active: false },
                ],
                meta: {},
            },
            filters: { search: null },
        },
    }),
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, href, ...rest }: { children: React.ReactNode; href?: string; [key: string]: unknown }) => {
        const safeProps = { ...rest };
        delete safeProps.preserveState;
        delete safeProps.preserveScroll;
        delete safeProps.only;
        delete safeProps.as;
        return <a href={href} {...safeProps}>{children}</a>;
    },
    router: {
        get: (...args: unknown[]) => {
            mockGet(...args);
        },
    },
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('InstituicoesPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renderiza header com título e botão de nova instituição', () => {
        render(<InstituicoesPage />);

        expect(screen.getByText('Gerenciar Instituições')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Nova Instituição/i })).toBeInTheDocument();
    });

    it('renderiza DataTable com dados de instituições', () => {
        render(<InstituicoesPage />);

        expect(screen.getByText('Universidade Estadual do Sudoeste da Bahia')).toBeInTheDocument();
        expect(screen.getAllByText('UESB').length).toBeGreaterThan(0);
        expect(screen.getByText('Estrada do Bem Querer, km 04')).toBeInTheDocument();
    });

    it('renderiza SearchFilter para busca', () => {
        render(<InstituicoesPage />);

        const searchInputs = screen.getAllByRole('searchbox');
        expect(searchInputs.length).toBeGreaterThan(0);
    });

    it('renderiza botões de ação para editar e excluir', () => {
        render(<InstituicoesPage />);

        const actionButtons = screen.getAllByRole('button');
        expect(actionButtons.length).toBeGreaterThan(3);
    });

    it('renderiza botão para criar nova instituição', () => {
        render(<InstituicoesPage />);

        const buttons = screen.getAllByRole('button');
        const createButton = buttons.find((btn) => btn.textContent?.includes('Nova'));
        expect(createButton).toBeDefined();
    });
});
