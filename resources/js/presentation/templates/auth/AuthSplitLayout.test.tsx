import { render, screen } from '@testing-library/react';
import AuthSplitLayout from './AuthSplitLayout';

describe('AuthSplitLayout', () => {
    beforeEach(() => {
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renders the privacy policy link in the form column footer', () => {
        render(
            <AuthSplitLayout title="Entrar">
                <p>Conteúdo</p>
            </AuthSplitLayout>,
        );

        const link = screen.getByRole('link', { name: 'Política de privacidade' });
        expect(link).toHaveAttribute('href', 'privacidade');
        expect(link.closest('footer')).not.toBeNull();
    });
});
