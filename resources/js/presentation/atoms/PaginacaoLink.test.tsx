import { PaginacaoLink } from './PaginacaoLink';
import { render, screen } from '@testing-library/react';

jest.mock('@inertiajs/react', () => ({
    Link: ({ children, href, ...rest }: { children: React.ReactNode; href?: string; [key: string]: unknown }) => {
        const safeProps = { ...rest };
        delete safeProps.preserveState;
        delete safeProps.preserveScroll;
        delete safeProps.only;
        delete safeProps.as;
        return (
            <a href={href} {...safeProps}>
                {children}
            </a>
        );
    },
}));

describe('PaginacaoLink', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers({ now: new Date('2026-10-05T12:00:00-03:00') });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('paginacao_renderiza_anterior_e_proximo_com_svg_e_nome_acessivel', () => {
        const { container } = render(
            <>
                <PaginacaoLink url="/page/1" active={false} label="&laquo; Anterior" />
                <PaginacaoLink url="/page/3" active={false} label="Próximo &raquo;" />
            </>,
        );

        const links = container.querySelectorAll('a');
        expect(links.length).toBeGreaterThan(0);

        links.forEach((link) => {
            const svg = link.querySelector('svg');
            expect(svg).toBeInTheDocument();

            expect(link.textContent).not.toContain('Previous');
            expect(link.textContent).not.toContain('Next');
            expect(link.textContent).not.toContain('«');
            expect(link.textContent).not.toContain('»');
        });
    });

    it('paginacao_anterior_link_com_role_acessivel_e_svg', () => {
        render(<PaginacaoLink url="/page/1" active={false} label="&laquo; Anterior" />);

        const link = screen.getByRole('link', { name: /Anterior/i });
        expect(link).toBeInTheDocument();

        const svg = link.querySelector('svg');
        expect(svg).toBeInTheDocument();

        expect(link.textContent).not.toContain('Previous');
        expect(link.textContent).not.toContain('«');
    });

    it('paginacao_proximo_link_com_role_acessivel_e_svg', () => {
        render(<PaginacaoLink url="/page/3" active={false} label="Próximo &raquo;" />);

        const link = screen.getByRole('link', { name: /Próxima/i });
        expect(link).toBeInTheDocument();

        const svg = link.querySelector('svg');
        expect(svg).toBeInTheDocument();

        expect(link.textContent).not.toContain('Next');
        expect(link.textContent).not.toContain('»');
    });

    it('paginacao_numeros_com_getByText_exato', () => {
        const { rerender } = render(<PaginacaoLink url="/page/1" active={false} label="1" />);
        expect(screen.getByText('1')).toBeInTheDocument();

        rerender(<PaginacaoLink url="/page/2" active={false} label="2" />);
        expect(screen.getByText('2')).toBeInTheDocument();

        rerender(<PaginacaoLink url="/page/3" active={false} label="3" />);
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('rotulo_com_html_escapado', () => {
        const { container } = render(<PaginacaoLink url="/page/1" active={false} label="<img src=x onerror=alert(1)>" />);

        const img = container.querySelector('img');
        expect(img).toBeNull();

        const link = container.querySelector('a');
        expect(link?.textContent).toContain('<img');
    });

    it('disabled_span_sem_url_tem_aria_disabled', () => {
        const { container } = render(<PaginacaoLink url={null} active={false} label="Próximo &raquo;" />);

        const span = container.querySelector('span');
        expect(span).toBeInTheDocument();
        expect(span).toHaveAttribute('aria-disabled', 'true');
        expect(container.querySelector('a')).toBeNull();
    });

    it('active_link_styling', () => {
        const { container } = render(<PaginacaoLink url="/page/2" active={true} label="2" />);

        const link = container.querySelector('a');
        expect(link).toHaveClass('bg-primary');
        expect(link).toHaveClass('text-primary-foreground');
        expect(link).toHaveClass('font-semibold');
    });
});
