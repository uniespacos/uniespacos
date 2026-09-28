import { fireEvent, render, screen } from '@testing-library/react';
import ErrorPage from './ErrorPage';

const mockGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    router: {
        get: (...args: unknown[]) => {
            mockGet(...args);
        },
    },
}));

describe('ErrorPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renders 403 Forbidden content correctly', () => {
        render(<ErrorPage status={403} />);

        expect(screen.getByText('ERRO 403')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Acesso não autorizado' })).toBeInTheDocument();
        expect(screen.getByText(/Você não tem permissão para acessar este conteúdo/i)).toBeInTheDocument();
    });

    it('renders 404 Not Found content correctly', () => {
        render(<ErrorPage status={404} />);

        expect(screen.getByText('ERRO 404')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument();
    });

    it('renders 419 Page Expired content correctly', () => {
        render(<ErrorPage status={419} />);

        expect(screen.getByText('ERRO 419')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Sessão expirada' })).toBeInTheDocument();
    });

    it('renders 500 Server Error content correctly', () => {
        render(<ErrorPage status={500} />);

        expect(screen.getByText('ERRO 500')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Erro interno do servidor' })).toBeInTheDocument();
    });

    it('renders 503 Service Unavailable maintenance content correctly', () => {
        render(<ErrorPage status={503} />);

        expect(screen.getByText('ERRO 503')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Serviço em manutenção' })).toBeInTheDocument();
    });

    it('renders fallback for unknown status codes', () => {
        render(<ErrorPage status={418} />);

        expect(screen.getByText('ERRO 418')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Ocorreu um erro' })).toBeInTheDocument();
    });

    it('navigates back when clicking Voltar button', () => {
        const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);
        render(<ErrorPage status={404} />);

        fireEvent.click(screen.getByRole('button', { name: /Voltar/i }));
        expect(backSpy).toHaveBeenCalled();
        backSpy.mockRestore();
    });

    it('navigates to dashboard when clicking Ir para o painel button', () => {
        render(<ErrorPage status={404} />);

        fireEvent.click(screen.getByRole('button', { name: /Ir para o painel/i }));
        expect(mockGet).toHaveBeenCalledWith('dashboard');
    });
});
