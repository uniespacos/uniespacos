import type { User } from '@/types';
import { fireEvent, render, screen, within } from '@testing-library/react';
import DashboardUsuarioPage from './DashboardUsuarioPage';

jest.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
    router: {
        get: jest.fn(),
    },
    usePage: () => ({ props: {} }),
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/presentation/molecules/TabsItemReserva', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@/presentation/organisms/TabsItemEspacosFavoritos', () => ({
    __esModule: true,
    default: () => null,
}));

const mockUser: User = {
    id: 1,
    name: 'Usuário Teste',
    email: 'usuario@uesb.edu.br',
    telefone: '77999999999',
    roles: ['comum'],
    permissions: [],
    unread_notifications_count: 0,
    setor_id: null,
    email_verified_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
};

describe('DashboardUsuarioPage', () => {
    beforeEach(() => {
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string, params?: unknown) =>
            typeof params === 'string' || typeof params === 'number' ? `https://localhost/${name}/${String(params)}` : `https://localhost/${name}`,
        );
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('exibe a seção "Reservar de novo" com link para cada espaço recente', () => {
        render(
            <DashboardUsuarioPage
                user={mockUser}
                espacosFavoritos={[]}
                reservas={[]}
                espacosRecentes={[
                    { id: 10, nome: 'Auditório Central', andar: { modulo: { nome: 'Módulo II' } } },
                    { id: 11, nome: 'Laboratório 3' },
                ]}
            />,
        );

        const secao = screen.getByRole('region', { name: 'Reservar de novo' });
        const linkAuditorio = within(secao).getByRole('link', { name: /Auditório Central/ });
        expect(linkAuditorio).toHaveAttribute('href', 'https://localhost/espacos.show/10');
        expect(within(linkAuditorio).getByText('Módulo II')).toBeInTheDocument();

        expect(within(secao).getByRole('link', { name: /Laboratório 3/ })).toHaveAttribute('href', 'https://localhost/espacos.show/11');
    });

    it('não exibe a seção "Reservar de novo" quando não há espaços recentes', () => {
        render(<DashboardUsuarioPage user={mockUser} espacosFavoritos={[]} reservas={[]} espacosRecentes={[]} />);

        expect(screen.queryByRole('region', { name: 'Reservar de novo' })).not.toBeInTheDocument();
    });

    it('exibe o assistente rápido de reserva (Step 1) com atalhos e link secundário para o catálogo completo', () => {
        const { router } = jest.requireMock<{ router: { get: jest.Mock } }>('@inertiajs/react');
        render(<DashboardUsuarioPage user={mockUser} espacosFavoritos={[]} reservas={[]} espacosRecentes={[]} />);

        expect(screen.getByRole('link', { name: /Explorar catálogo completo de espaços/i })).toHaveAttribute(
            'href',
            'https://localhost/espacos.index',
        );

        fireEvent.click(screen.getByRole('button', { name: '25+' }));
        fireEvent.click(screen.getByRole('button', { name: /Buscar espaços disponíveis/i }));

        expect(router.get).toHaveBeenCalledWith('https://localhost/espacos.index', { capacidade: '25' });
    });
});
