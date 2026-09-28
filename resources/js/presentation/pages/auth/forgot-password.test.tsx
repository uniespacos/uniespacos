import { fireEvent, render, screen } from '@testing-library/react';
import ForgotPassword from './forgot-password';

const mockPost = jest.fn();

jest.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
    useForm: () => ({
        data: { email: '' },
        setData: jest.fn(),
        post: mockPost,
        processing: false,
        errors: {},
    }),
    usePage: () => ({
        props: { locale: 'pt-BR' },
    }),
}));

describe('ForgotPassword Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renders forgot password page with email input and submit button', () => {
        render(<ForgotPassword />);

        expect(screen.getByLabelText(/e-mail institucional/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /enviar link de redefinição/i })).toBeInTheDocument();
    });

    it('renders status message when provided', () => {
        render(<ForgotPassword status="Enviamos o link de recuperação para seu e-mail." />);

        const statusEl = screen.getByRole('status');
        expect(statusEl).toBeInTheDocument();
        expect(statusEl).toHaveTextContent('Enviamos o link de recuperação para seu e-mail.');
    });

    it('submits form on submit', () => {
        render(<ForgotPassword />);

        const submitBtn = screen.getByRole('button', { name: /enviar link de redefinição/i });
        fireEvent.click(submitBtn);

        expect(mockPost).toHaveBeenCalledTimes(1);
    });
});
