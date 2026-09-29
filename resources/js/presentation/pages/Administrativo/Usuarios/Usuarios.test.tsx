import UsuariosPage from './Usuarios';
import { fireEvent, render, screen } from '@testing-library/react';

const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            users: {
                data: [
                    {
                        id: 1,
                        name: 'João Silva',
                        email: 'joao@uesb.br',
                        email_verified_at: '2026-01-01T00:00:00Z',
                        telefone: '71-9999-9999',
                        roles: ['comum'],
                        permissions: [],
                        setor_id: null,
                        unread_notifications: [],
                        created_at: '2026-01-01T00:00:00Z',
                        updated_at: '2026-01-01T00:00:00Z',
                    },
                ],
                links: [
                    { url: null, label: '&laquo; Anterior', active: false },
                    { url: 'https://localhost/institucional/usuarios?page=1', label: '1', active: true },
                    { url: null, label: 'Próximo &raquo;', active: false },
                ],
                meta: {},
            },
            setores: [
                {
                    id: 1,
                    nome: 'Departamento de Computação',
                    sigla: 'DCOMP',
                },
            ],
            filters: { search: null, setor_id: null },
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
        put: (...args: unknown[]) => {
            mockPut(...args);
        },
    },
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/presentation/organisms/EditUserModal', () => ({
    EditUserModal: () => <div data-testid="edit-user-modal">Edit User Modal</div>,
}));

jest.mock('@/presentation/organisms/PermissionModal', () => ({
    PermissionModal: () => <div data-testid="permission-modal">Permission Modal</div>,
}));

jest.mock('@/presentation/molecules/ViewModeToggle', () => ({
    ViewModeToggle: () => <div data-testid="view-mode-toggle">View Mode Toggle</div>,
}));

describe('UsuariosPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renderiza header com título e botão de novo usuário', () => {
        render(<UsuariosPage />);

        expect(screen.getByRole('heading', { name: /Gerenciar Usuários/i })).toBeInTheDocument();
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('renderiza DataTable com dados de usuários', () => {
        render(<UsuariosPage />);

        expect(screen.getByText('João Silva')).toBeInTheDocument();
        expect(screen.getByText('joao@uesb.br')).toBeInTheDocument();
    });

    it('renderiza SearchFilter para busca', () => {
        render(<UsuariosPage />);

        const searchInputs = screen.getAllByRole('searchbox');
        expect(searchInputs.length).toBeGreaterThan(0);
        const searchInput = searchInputs[0] as HTMLInputElement;
        fireEvent.change(searchInput, { target: { value: 'João' } });
        expect(searchInput.value).toBe('João');
    });

    it('renderiza componente com filtro de setor', () => {
        render(<UsuariosPage />);

        expect(screen.getByText('João Silva')).toBeInTheDocument();
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('renderiza botões de ação para usuários', () => {
        render(<UsuariosPage />);

        const actionButtons = screen.getAllByRole('button');
        expect(actionButtons.length).toBeGreaterThan(0);
    });
});
