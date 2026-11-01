import { usePage } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import { PrivacyLink } from './PrivacyLink';

jest.mock('@inertiajs/react', () => ({
    usePage: jest.fn(),
    Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

const mockedUsePage = usePage as unknown as jest.Mock;

function mockPrivacidade(privacidadeHabilitada?: boolean) {
    mockedUsePage.mockReturnValue({
        props: privacidadeHabilitada === undefined ? {} : { privacidadeHabilitada },
    });
}

describe('PrivacyLink', () => {
    beforeEach(() => {
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
        mockedUsePage.mockReset();
    });

    describe('quando a página de privacidade está habilitada', () => {
        beforeEach(() => {
            mockPrivacidade(true);
        });

        it('renderiza o link interno', () => {
            render(<PrivacyLink />);

            const link = screen.getByRole('link', { name: 'Política de privacidade' });
            expect(link).toHaveAttribute('href', 'privacidade');
            expect(link).not.toHaveAttribute('target');
        });

        it('renderiza o link em nova aba quando newTab está ativo', () => {
            render(<PrivacyLink newTab />);

            const link = screen.getByRole('link', { name: /política de privacidade/i });
            expect(link).toHaveAttribute('href', 'privacidade');
            expect(link).toHaveAttribute('target', '_blank');
            expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });
    });

    describe('quando a página de privacidade está desligada', () => {
        it('não renderiza nada com newTab', () => {
            mockPrivacidade(false);

            const { container } = render(<PrivacyLink newTab />);

            expect(container).toBeEmptyDOMElement();
            expect(screen.queryByRole('link')).not.toBeInTheDocument();
        });

        it('não renderiza nada no link interno', () => {
            mockPrivacidade(false);

            const { container } = render(<PrivacyLink />);

            expect(container).toBeEmptyDOMElement();
        });
    });

    describe('quando a prop privacidadeHabilitada está ausente', () => {
        it('não renderiza nada', () => {
            mockPrivacidade(undefined);

            const { container } = render(<PrivacyLink newTab />);

            expect(container).toBeEmptyDOMElement();
        });
    });
});
