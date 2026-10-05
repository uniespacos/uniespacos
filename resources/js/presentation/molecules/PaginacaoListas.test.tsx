import { render, screen } from '@testing-library/react';
import PaginacaoListas from './PaginacaoListas';
import { useIsMobile } from '@/hooks/use-mobile';

jest.mock('@inertiajs/react', () => ({
    Link: ({ children, href, ...rest }: { children: React.ReactNode; href?: string; [key: string]: unknown }) => {
        const safeProps = { ...rest };
        delete safeProps.preserveState;
        delete safeProps.preserveScroll;
        delete safeProps.only;
        delete safeProps.as;
        return <a href={href} {...safeProps}>{children}</a>;
    },
}));

jest.mock('@/hooks/use-mobile', () => ({
    useIsMobile: jest.fn(),
}));

const mockedUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>;

describe('PaginacaoListas', () => {
    const mockLinks = [
        { label: '&laquo; Anterior', url: '/espacos?page=1', active: false },
        { label: '1', url: '/espacos?page=1', active: false },
        { label: '2', url: '/espacos?page=2', active: true },
        { label: '3', url: '/espacos?page=3', active: false },
        { label: 'Próximo &raquo;', url: '/espacos?page=3', active: false },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockedUseIsMobile.mockReturnValue(false);
    });

    it('renders null if links array has 1 or fewer items', () => {
        const { container } = render(<PaginacaoListas links={[{ label: '1', url: null, active: true }]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders full pagination list in desktop view', () => {
        render(<PaginacaoListas links={mockLinks} />);

        expect(screen.getByText(/Anterior/i)).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Próxima/i })).toBeInTheDocument();
    });

    it('renders compact mobile pagination with current page indicator', () => {
        mockedUseIsMobile.mockReturnValue(true);

        render(<PaginacaoListas links={mockLinks} />);

        expect(screen.getByText(/Anterior/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Próxima/i })).toBeInTheDocument();
        expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    });

    it('paginacao_anterior_proximo_tem_nome_acessivel_e_svg', () => {
        render(<PaginacaoListas links={mockLinks} />);

        const anteriorLink = screen.getByRole('link', { name: /Anterior/i });
        expect(anteriorLink).toBeInTheDocument();
        expect(anteriorLink.querySelector('svg')).toBeInTheDocument();
        expect(anteriorLink.textContent).not.toContain('Previous');
        expect(anteriorLink.textContent).not.toContain('«');

        const proximoLink = screen.getByRole('link', { name: /Próxima/i });
        expect(proximoLink).toBeInTheDocument();
        expect(proximoLink.querySelector('svg')).toBeInTheDocument();
        expect(proximoLink.textContent).not.toContain('Next');
        expect(proximoLink.textContent).not.toContain('»');
    });

    it('paginacao_numeros_exatos_via_getByText', () => {
        render(<PaginacaoListas links={mockLinks} />);

        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('paginacao_prevencao_xss_html_bruto', () => {
        const maliciousLinks = [
            { label: '&laquo; Anterior', url: '/page/1', active: false },
            { label: '<img src=x onerror=alert(1)>', url: '/page/2', active: false },
            { label: '2', url: '/page/2', active: true },
            { label: 'Próximo &raquo;', url: '/page/3', active: false },
        ];

        const { container } = render(<PaginacaoListas links={maliciousLinks} />);

        const img = container.querySelector('img');
        expect(img).toBeNull();

        const text = container.textContent;
        expect(text).toContain('<img');
    });
});
