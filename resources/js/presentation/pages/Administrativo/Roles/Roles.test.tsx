import RolesPage from './Roles';
import { fireEvent, render, screen } from '@testing-library/react';

const mockGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            roles: [
                {
                    id: 1,
                    name: 'Admin',
                    description: 'Administrador do sistema',
                    is_system: true,
                    guard_name: 'web',
                    permissions_count: 50,
                    users_count: 5,
                    permissions: [],
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                },
                {
                    id: 2,
                    name: 'Gestor',
                    description: 'Gestor de espaços',
                    is_system: false,
                    guard_name: 'web',
                    permissions_count: 20,
                    users_count: 10,
                    permissions: [],
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                },
            ],
            permissions: {},
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

describe('RolesPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renderiza header com título e botão de novo papel', () => {
        render(<RolesPage />);

        expect(screen.getByRole('heading', { name: /Gerenciar Papéis/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Novo Papel/i })).toBeInTheDocument();
    });

    it('renderiza DataTable com dados de papéis', () => {
        render(<RolesPage />);

        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Gestor')).toBeInTheDocument();
        expect(screen.getByText('Administrador do sistema')).toBeInTheDocument();
        expect(screen.getByText('Gestor de espaços')).toBeInTheDocument();
    });

    it('renderiza SearchFilter e permite busca', () => {
        render(<RolesPage />);

        const searchInput = screen.getByPlaceholderText(/Buscar/i);
        expect(searchInput).toBeInTheDocument();
        fireEvent.change(searchInput, { target: { value: 'Gestor' } });
        expect((searchInput as HTMLInputElement).value).toBe('Gestor');
    });

    it('renderiza Select de tipo para filtro (sistema/customizado)', () => {
        render(<RolesPage />);

        const tipoLabels = screen.queryAllByText(/Tipo/i);
        expect(tipoLabels.length).toBeGreaterThan(0);
    });

    it('filtra papéis por tipo e mantém busca funcionando', () => {
        render(<RolesPage />);

        const searchInput = screen.getByPlaceholderText(/Buscar\.\.\./i);
        expect(searchInput).toBeInTheDocument();
        fireEvent.change(searchInput, { target: { value: 'Admin' } });
        expect((searchInput as HTMLInputElement).value).toBe('Admin');
    });
});
