import { usePage } from '@inertiajs/react';
import { render, screen, within } from '@testing-library/react';
import PoliticaPrivacidadePage from './PoliticaPrivacidadePage';

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

const mockedUsePage = usePage as unknown as jest.Mock;

function mockPageProps(props: Record<string, unknown>) {
    mockedUsePage.mockReturnValue({
        props,
        url: '/privacidade',
        component: 'Privacidade/PoliticaPrivacidadePage',
        version: null,
    });
}

const pageProps = { versao: '2026.1', data_versao: '2026-10-31' };

describe('PoliticaPrivacidadePage', () => {
    beforeEach(() => {
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    describe('visitante', () => {
        beforeEach(() => {
            mockPageProps({ ...pageProps, locale: 'pt-BR', auth: { user: null } });
        });

        it('renders the title and the draft banner', () => {
            render(<PoliticaPrivacidadePage {...pageProps} />);

            expect(screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeInTheDocument();
            expect(screen.getByText('Rascunho em revisão')).toBeInTheDocument();
        });

        it('renders the version and the formatted update date', () => {
            render(<PoliticaPrivacidadePage {...pageProps} />);

            expect(screen.getByText(/Versão: 2026\.1/)).toBeInTheDocument();
            expect(screen.getByText(/31\/10\/2026/)).toBeInTheDocument();
        });

        it('renders the encarregado contact as mailto and tel links', () => {
            render(<PoliticaPrivacidadePage {...pageProps} />);

            expect(screen.getByRole('link', { name: 'projur@uesb.edu.br' })).toHaveAttribute('href', 'mailto:projur@uesb.edu.br');
            expect(screen.getByRole('link', { name: '(77) 3424-8649' })).toHaveAttribute('href', 'tel:+557734248649');
        });

        it('shows the login link and no authenticated layout', () => {
            render(<PoliticaPrivacidadePage {...pageProps} />);

            expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', 'login');
            expect(screen.queryByTestId('app-layout')).not.toBeInTheDocument();
        });
    });

    describe('usuário autenticado', () => {
        beforeEach(() => {
            mockPageProps({ ...pageProps, locale: 'pt-BR', auth: { user: { id: 1 } }, flash: {} });
        });

        it('renders inside the app layout with the page content', () => {
            render(<PoliticaPrivacidadePage {...pageProps} />);

            const layout = screen.getByTestId('app-layout');
            expect(within(layout).getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeInTheDocument();
            expect(within(layout).getByText('Rascunho em revisão')).toBeInTheDocument();
            expect(within(layout).getByRole('link', { name: 'projur@uesb.edu.br' })).toHaveAttribute('href', 'mailto:projur@uesb.edu.br');
        });

        it('does not render the guest login link', () => {
            render(<PoliticaPrivacidadePage {...pageProps} />);

            expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
        });
    });
});
