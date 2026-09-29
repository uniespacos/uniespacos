import UnidadesPage from './Unidades';
import { fireEvent, render, screen } from '@testing-library/react';

const mockGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            unidades: {
                data: [
                    {
                        id: 1,
                        nome: 'Campus Jequié',
                        sigla: 'JQ',
                        instituicao: {
                            id: 1,
                            nome: 'UESB',
                            sigla: 'UESB',
                            endereco: 'Estrada do Bem Querer, km 04',
                        },
                    },
                ],
                links: [
                    { url: null, label: '&laquo; Anterior', active: false },
                    { url: 'https://localhost/institucional/unidades?page=1', label: '1', active: true },
                    { url: null, label: 'Próximo &raquo;', active: false },
                ],
                meta: {},
            },
            instituicoes: [
                {
                    id: 1,
                    nome: 'UESB',
                    sigla: 'UESB',
                    endereco: 'Estrada do Bem Querer, km 04',
                },
            ],
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

describe('UnidadesPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renderiza header com título e botão de nova unidade', () => {
        render(<UnidadesPage />);

        expect(screen.getByRole('heading', { name: /Gerenciar Unidades/i })).toBeInTheDocument();
        const buttons = screen.getAllByRole('button');
        expect(buttons.some((btn) => btn.textContent?.includes('Nova'))).toBe(true);
    });

    it('renderiza DataTable com dados de unidades', () => {
        render(<UnidadesPage />);

        expect(screen.getByText('Campus Jequié')).toBeInTheDocument();
        expect(screen.getByText('JQ')).toBeInTheDocument();
        expect(screen.getAllByText('UESB').length).toBeGreaterThan(0);
    });

    it('renderiza SearchFilter para busca', () => {
        render(<UnidadesPage />);

        const searchInputs = screen.getAllByRole('searchbox');
        expect(searchInputs.length).toBeGreaterThan(0);
        const searchInput = searchInputs[0] as HTMLInputElement;
        fireEvent.change(searchInput, { target: { value: 'Jequié' } });
        expect(searchInput.value).toBe('Jequié');
    });

    it('renderiza componente com filtro e dados', () => {
        render(<UnidadesPage />);

        expect(screen.getByText('Campus Jequié')).toBeInTheDocument();
        const actionButtons = screen.getAllByRole('button');
        expect(actionButtons.length).toBeGreaterThan(3);
    });

    it('renderiza botão para criar nova unidade funcional', () => {
        render(<UnidadesPage />);

        const buttons = screen.getAllByRole('button');
        const createButton = buttons.find((btn) => btn.textContent?.includes('Nova'));
        expect(createButton).toBeDefined();
    });
});
