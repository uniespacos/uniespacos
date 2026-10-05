import { render, screen, waitFor } from '@testing-library/react';
import { PermissionModal } from './PermissionModal';
import type { User } from '@/types';

const mockOnClose = jest.fn();
const mockOnUpdate = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: {
                    id: 1,
                    name: 'Admin User',
                    email: 'admin@test.local',
                    roles: ['institucional'],
                    permissions: ['usuarios.avaliar', 'usuarios.gerenciar_permissoes_diretas'],
                },
            },
        },
    }),
}));

jest.mock('@/presentation/molecules/Modal', () => ({
    Modal: ({ children, open }: { children: React.ReactNode; open: boolean; [key: string]: unknown }) =>
        open ? <div data-testid="modal">{children}</div> : null,
}));

jest.mock('@/presentation/organisms/FiltroBuscaPermission', () => ({
    __esModule: true,
    default: () => <div>Filtro Busca Permission</div>,
}));

describe('PermissionModal', () => {
    const mockUser: User = {
        id: 2,
        name: 'Test User',
        email: 'user@test.local',
        email_verified_at: '2026-01-01T00:00:00Z',
        telefone: '71-99999-9999',
        roles: ['gestor'],
        permissions: [],
        direct_permissions: [],
        setor_id: null,
        unread_notifications: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers({ now: new Date('2026-10-05T12:00:00-03:00') });
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        user: mockUser,
                        instituicoes: [],
                        permissionCatalog: {},
                    }),
            }),
        ) as jest.Mock;
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `/test/${name}`);
    });

    afterEach(() => {
        jest.useRealTimers();
        delete (globalThis as unknown as { fetch?: unknown }).fetch;
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('permission_modal_lista_gestor_de_reserva', async () => {
        render(<PermissionModal user={mockUser} isOpen={true} onClose={mockOnClose} onUpdate={mockOnUpdate} processing={false} />);

        expect(screen.getByTestId('modal')).toBeInTheDocument();

        await waitFor(() => {
            const selectOptions = screen.getAllByText(/Gestor/);
            expect(selectOptions.length).toBeGreaterThan(0);
        });

        const selectOptions = screen.getAllByText(/Gestor/);
        const gestorOption = selectOptions.find((el) => el.textContent === 'Gestor de Reserva');
        expect(gestorOption).toBeInTheDocument();
    });
});
