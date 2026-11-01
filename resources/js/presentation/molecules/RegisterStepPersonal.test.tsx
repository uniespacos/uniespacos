import { usePage } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import { RegisterStepPersonal } from './RegisterStepPersonal';

jest.mock('@inertiajs/react', () => ({
    usePage: jest.fn(),
    Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

const mockedUsePage = usePage as unknown as jest.Mock;

describe('RegisterStepPersonal', () => {
    const props = {
        data: { name: '', email: '', phone: '' },
        onInputChange: jest.fn(),
        errors: {},
        processing: false,
    };

    beforeEach(() => {
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
        mockedUsePage.mockReturnValue({ props: { privacidadeHabilitada: true } });
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
        mockedUsePage.mockReset();
    });

    it('shows the purpose of the phone number', () => {
        render(<RegisterStepPersonal {...props} />);

        expect(screen.getByText(/Usado só como contato de emergência sobre suas reservas; visível apenas ao gestor do espaço\./)).toBeInTheDocument();
    });

    it('links to the privacy policy in a new tab', () => {
        render(<RegisterStepPersonal {...props} />);

        const link = screen.getByRole('link', { name: /política de privacidade/i });
        expect(link).toHaveAttribute('href', 'privacidade');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('keeps the purpose text but hides the privacy link when the page is disabled', () => {
        mockedUsePage.mockReturnValue({ props: { privacidadeHabilitada: false } });

        render(<RegisterStepPersonal {...props} />);

        expect(screen.getByText(/Usado só como contato de emergência sobre suas reservas; visível apenas ao gestor do espaço\./)).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /política de privacidade/i })).not.toBeInTheDocument();
    });
});
