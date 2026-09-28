import { render, screen } from '@testing-library/react';
import { usePage } from '@inertiajs/react';
import { Can } from './auth-can';
import type { User } from '@/types';

jest.mock('@inertiajs/react', () => ({
    usePage: jest.fn(),
}));

describe('Can component (PBAC Declarativo)', () => {
    const mockUser: User = {
        id: 1,
        name: 'Jane Doe',
        email: 'jane@example.com',
        email_verified_at: '2026-01-01',
        telefone: '77999999999',
        setor_id: null,
        unread_notifications: [],
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        roles: ['gestor'],
        permissions: ['reservas.avaliar', 'reservas.listar'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders children when user has the required permission', () => {
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: mockUser } },
        });

        render(
            <Can permission="reservas.avaliar">
                <span>Botão Avaliar</span>
            </Can>,
        );

        expect(screen.getByText('Botão Avaliar')).toBeInTheDocument();
    });

    it('does not render children and renders fallback when user lacks permission', () => {
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: mockUser } },
        });

        render(
            <Can permission="espacos.deletar" fallback={<span>Sem permissão</span>}>
                <span>Botão Deletar Espaço</span>
            </Can>,
        );

        expect(screen.queryByText('Botão Deletar Espaço')).not.toBeInTheDocument();
        expect(screen.getByText('Sem permissão')).toBeInTheDocument();
    });

    it('renders children when user has any of the specified permissions', () => {
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: mockUser } },
        });

        render(
            <Can any={['espacos.criar', 'reservas.avaliar']}>
                <span>Ação Permitida</span>
            </Can>,
        );

        expect(screen.getByText('Ação Permitida')).toBeInTheDocument();
    });

    it('does not render children when user lacks all of the any permissions', () => {
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: mockUser } },
        });

        render(
            <Can any={['espacos.criar', 'espacos.deletar']}>
                <span>Ação Proibida</span>
            </Can>,
        );

        expect(screen.queryByText('Ação Proibida')).not.toBeInTheDocument();
    });

    it('renders children when user has all required permissions', () => {
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: mockUser } },
        });

        render(
            <Can all={['reservas.avaliar', 'reservas.listar']}>
                <span>Ação Completa</span>
            </Can>,
        );

        expect(screen.getByText('Ação Completa')).toBeInTheDocument();
    });

    it('does not render children when user has only some of the all permissions', () => {
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: mockUser } },
        });

        render(
            <Can all={['reservas.avaliar', 'espacos.criar']}>
                <span>Ação Completa</span>
            </Can>,
        );

        expect(screen.queryByText('Ação Completa')).not.toBeInTheDocument();
    });

    it('handles unauthenticated or null user safely', () => {
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: null } },
        });

        render(
            <Can permission="reservas.listar" fallback={<span>Faça login</span>}>
                <span>Conteúdo Protegido</span>
            </Can>,
        );

        expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
        expect(screen.getByText('Faça login')).toBeInTheDocument();
    });
});
