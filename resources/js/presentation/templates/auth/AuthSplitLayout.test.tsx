import { usePage } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import AuthSplitLayout from './AuthSplitLayout';

jest.mock('@inertiajs/react', () => ({
    usePage: jest.fn(),
    Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

const mockedUsePage = usePage as unknown as jest.Mock;

describe('AuthSplitLayout', () => {
    beforeEach(() => {
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
        mockedUsePage.mockReset();
    });

    it('renders the privacy policy link in the form column footer', () => {
        mockedUsePage.mockReturnValue({ props: { privacidadeHabilitada: true } });

        render(
            <AuthSplitLayout title="Entrar">
                <p>Conteúdo</p>
            </AuthSplitLayout>,
        );

        const link = screen.getByRole('link', { name: 'Política de privacidade' });
        expect(link).toHaveAttribute('href', 'privacidade');
        expect(link.closest('footer')).not.toBeNull();
    });

    it('does not render the footer nor the privacy policy link when the page is disabled', () => {
        mockedUsePage.mockReturnValue({ props: { privacidadeHabilitada: false } });

        const { container } = render(
            <AuthSplitLayout title="Entrar">
                <p>Conteúdo</p>
            </AuthSplitLayout>,
        );

        expect(screen.queryByRole('link', { name: 'Política de privacidade' })).not.toBeInTheDocument();
        expect(container.querySelector('footer')).toBeNull();
        expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    });
});
