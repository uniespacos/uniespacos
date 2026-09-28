import { fireEvent, render, screen } from '@testing-library/react';
import VerifyEmail from './verify-email';

const mockPost = jest.fn();

jest.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
    useForm: () => ({
        post: mockPost,
        processing: false,
    }),
    usePage: () => ({
        props: { locale: 'pt-BR' },
    }),
}));

describe('VerifyEmail Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renders verify email page with resend button', () => {
        render(<VerifyEmail />);

        expect(screen.getByRole('button', { name: /reenviar e-mail de verificação/i })).toBeInTheDocument();
        expect(screen.getByText(/encerrar sessão/i)).toBeInTheDocument();
    });

    it('shows sent message when status is verification-link-sent', () => {
        render(<VerifyEmail status="verification-link-sent" />);

        const statusEl = screen.getByRole('status');
        expect(statusEl).toBeInTheDocument();
        expect(statusEl).toHaveTextContent(/um novo link de verificação foi enviado/i);
    });

    it('dispatches post when clicking resend button', () => {
        render(<VerifyEmail />);

        const resendBtn = screen.getByRole('button', { name: /reenviar e-mail de verificação/i });
        fireEvent.click(resendBtn);

        expect(mockPost).toHaveBeenCalledTimes(1);
    });
});
