import Modulos from './Modulos';
import { fireEvent, render, screen } from '@testing-library/react';

const mockGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            modulos: {
                data: [
                    {
                        id: 1,
                        nome: 'Módulo Central',
                        unidade_id: 1,
                        unidade: {
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
                        andares: [],
                    },
                ],
                links: [
                    { url: null, label: '&laquo; Anterior', active: false },
                    { url: 'https://localhost/institucional/modulos?page=1', label: '1', active: true },
                    { url: null, label: 'Próximo &raquo;', active: false },
                ],
                meta: {},
            },
            unidades: [
                {
                    id: 1,
                    nome: 'Campus Jequié',
                    sigla: 'JQ',
                },
            ],
            filters: { search: null, unidade_id: null },
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

describe('Modulos', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renderiza header com título e botão de novo módulo', () => {
        render(<Modulos />);

        expect(screen.getByRole('heading', { name: /Gerenciar Módulos/i })).toBeInTheDocument();
        const buttons = screen.getAllByRole('button');
        expect(buttons.some((btn) => btn.textContent?.includes('Novo'))).toBe(true);
    });

    it('renderiza dados de módulos', () => {
        render(<Modulos />);

        expect(screen.getByText('Módulo Central')).toBeInTheDocument();
        expect(screen.getByText('Campus Jequié')).toBeInTheDocument();
    });

    it('renderiza SearchFilter para busca', () => {
        render(<Modulos />);

        const searchInputs = screen.getAllByRole('searchbox');
        expect(searchInputs.length).toBeGreaterThan(0);
        const searchInput = searchInputs[0] as HTMLInputElement;
        fireEvent.change(searchInput, { target: { value: 'Central' } });
        expect(searchInput.value).toBe('Central');
    });

    it('renderiza componente com filtro de unidade', () => {
        render(<Modulos />);

        expect(screen.getByText('Módulo Central')).toBeInTheDocument();
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(3);
    });

    it('renderiza botões de ação para módulos', () => {
        render(<Modulos />);

        const actionButtons = screen.getAllByRole('button');
        expect(actionButtons.length).toBeGreaterThan(0);
    });
});
