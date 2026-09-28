import { render, screen } from '@testing-library/react';
import PaginacaoListas from './PaginacaoListas';
import { useIsMobile } from '@/hooks/use-mobile';

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
        expect(screen.getByText(/Próximo/i)).toBeInTheDocument();
    });

    it('renders compact mobile pagination with current page indicator', () => {
        mockedUseIsMobile.mockReturnValue(true);

        render(<PaginacaoListas links={mockLinks} />);

        expect(screen.getByText(/Anterior/i)).toBeInTheDocument();
        expect(screen.getByText(/Próximo/i)).toBeInTheDocument();
        expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    });
});
