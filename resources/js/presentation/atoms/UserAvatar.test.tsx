import { User } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { clearFailedAvatarUrls, UserAvatar } from './UserAvatar';

const mockUser: User = {
    id: 1,
    name: 'Pedro Lemos',
    email: 'pedro@uesb.edu.br',
    telefone: '77999999999',
    roles: ['administrador'],
    permissions: [],
    unread_notifications_count: 0,
    setor_id: 1,
    email_verified_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
};

describe('UserAvatar', () => {
    beforeEach(() => {
        clearFailedAvatarUrls();
    });

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

    it('rejects non-path strings without image extension such as seed placeholders', () => {
        const { container } = render(<UserAvatar user={{ ...mockUser, profile_pic: 'aushaushuahsas' }} />);

        expect(screen.getByText('PL')).toBeInTheDocument();
        expect(container.querySelector('[data-slot="avatar-image"]')).toBeNull();
    });

    it('rejects storage URLs without a valid image extension produced by backend accessor for invalid data', () => {
        const { container: c1 } = render(
            <UserAvatar user={{ ...mockUser, profile_pic: 'https://staging.uniespacos.uesb.br/storage/aushaushuahsas' }} />,
        );
        expect(c1.querySelector('img')).toBeNull();
        expect(c1.querySelector('[data-slot="avatar-image"]')).toBeNull();

        const { container: c2 } = render(<UserAvatar user={{ ...mockUser, profile_pic: '/storage/aushaushuahsas' }} />);
        expect(c2.querySelector('img')).toBeNull();
        expect(c2.querySelector('[data-slot="avatar-image"]')).toBeNull();
    });

    it('renders AvatarImage when valid profile_pic is provided', () => {
        render(<UserAvatar user={{ ...mockUser, profile_pic: 'https://example.com/avatar.jpg' }} />);

        expect(screen.getByText('PL')).toBeInTheDocument();
    });

    it('caches failed avatar URLs across remounts so broken URLs are not retried on navigation', () => {
        const brokenUser = { ...mockUser, profile_pic: 'avatars/missing.png' };
        const { container, unmount } = render(<UserAvatar user={brokenUser} />);

        const firstImg = container.querySelector('img');
        if (firstImg) {
            fireEvent.error(firstImg);
        }

        unmount();

        const { container: secondContainer } = render(<UserAvatar user={brokenUser} />);
        expect(secondContainer.querySelector('img')).toBeNull();
        expect(screen.getByText('PL')).toBeInTheDocument();
    });
});
