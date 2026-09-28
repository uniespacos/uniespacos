import { fireEvent, render, screen } from '@testing-library/react';
import Login from './login';

const mockPost = jest.fn();
const mockSetData = jest.fn();

jest.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
    useForm: () => ({
        data: { email: '', password: '', remember: false },
        setData: mockSetData,
        post: mockPost,
        processing: false,
        errors: {},
        reset: jest.fn(),
    }),
    usePage: () => ({
        props: { locale: 'pt-BR' },
    }),
}));

describe('Login Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renders login page with email and password inputs', () => {
        render(<Login />);

        expect(screen.getByLabelText(/e-mail institucional/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /entrar no sistema/i })).toBeInTheDocument();
    });

    it('shows status message when provided with role="status"', () => {
        render(<Login status="Sua senha foi redefinida com sucesso!" />);

        const statusEl = screen.getByRole('status');
        expect(statusEl).toBeInTheDocument();
        expect(statusEl).toHaveTextContent('Sua senha foi redefinida com sucesso!');
    });

    it('submits form on button click', () => {
        render(<Login />);

        const submitBtn = screen.getByRole('button', { name: /entrar no sistema/i });
        fireEvent.click(submitBtn);

        expect(mockPost).toHaveBeenCalledTimes(1);
    });
});
