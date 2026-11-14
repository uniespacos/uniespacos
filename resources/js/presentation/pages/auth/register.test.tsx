import { render, screen } from '@testing-library/react';
import Register from './register';

let mockErrors: Record<string, string> = {};

jest.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
    useForm: () => ({
        data: { name: '', email: '', phone: '', password: '', password_confirmation: '', campus: '', instituicao_id: '', setor_id: '' },
        setData: jest.fn(),
        post: jest.fn(),
        processing: false,
        errors: mockErrors,
        reset: jest.fn(),
    }),
    usePage: () => ({
        props: { instituicaos: [], privacidadeHabilitada: false },
    }),
}));

describe('Register Page', () => {
    beforeEach(() => {
        mockErrors = {};
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('shows a link to the password reset page when the server returns an email error', () => {
        mockErrors = { email: 'Este e-mail já possui uma conta. Use "Esqueci minha senha" para recuperar o acesso.' };

        render(<Register />);

        expect(screen.getByText(mockErrors.email)).toBeInTheDocument();
        const link = screen.getByRole('link', { name: 'Esqueceu sua senha?' });
        expect(link).toHaveAttribute('href', 'password.request');
    });

    it('does not show the password reset link when there is no email error', () => {
        render(<Register />);

        expect(screen.queryByRole('link', { name: 'Esqueceu sua senha?' })).not.toBeInTheDocument();
    });
});
