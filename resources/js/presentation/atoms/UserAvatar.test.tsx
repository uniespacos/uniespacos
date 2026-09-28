import { User } from '@/types';
import { render, screen } from '@testing-library/react';
import { UserAvatar } from './UserAvatar';

const mockUser: User = {
    id: 1,
    name: 'Pedro Lemos',
    email: 'pedro@uesb.edu.br',
    telefone: '77999999999',
    roles: ['administrador'],
    permissions: [],
    unread_notifications: [],
    setor_id: 1,
    email_verified_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
};

describe('UserAvatar', () => {
    it('renders initials fallback when profile_pic is not set', () => {
        render(<UserAvatar user={mockUser} />);

        expect(screen.getByText('PL')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders initials fallback when profile_pic is an empty string', () => {
        render(<UserAvatar user={{ ...mockUser, profile_pic: '' }} />);

        expect(screen.getByText('PL')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders AvatarImage when valid profile_pic is provided', () => {
        render(<UserAvatar user={{ ...mockUser, profile_pic: 'https://example.com/avatar.jpg' }} />);

        expect(screen.getByText('PL')).toBeInTheDocument();
    });
});
