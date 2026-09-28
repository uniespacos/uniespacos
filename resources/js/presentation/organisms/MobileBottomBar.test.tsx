import { render, screen, fireEvent } from '@testing-library/react';
import { MobileBottomBar } from './MobileBottomBar';
import { useSidebar } from '@/components/ui/sidebar';
import { usePage } from '@inertiajs/react';
import type { Page } from '@inertiajs/core';
import type React from 'react';

jest.mock('@/components/ui/sidebar', () => ({
    useSidebar: jest.fn(),
}));

jest.mock('@inertiajs/react', () => ({
    Link: ({ children, href, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={href} className={className} {...props}>
            {children}
        </a>
    ),
    usePage: jest.fn(),
}));

const mockedUseSidebar = useSidebar as jest.MockedFunction<typeof useSidebar>;
const mockedUsePage = usePage as jest.MockedFunction<typeof usePage>;

const createMockPage = (url: string): Page => ({
    component: 'TestComponent',
    props: {
        errors: {},
    },
    url,
    version: '1',
    clearHistory: false,
    encryptHistory: false,
    rememberedState: {},
});

describe('MobileBottomBar', () => {
    const mockToggleSidebar = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockedUseSidebar.mockReturnValue({
            toggleSidebar: mockToggleSidebar,
            open: true,
            setOpen: jest.fn(),
            openMobile: false,
            setOpenMobile: jest.fn(),
            isMobile: true,
            state: 'expanded',
        });
        mockedUsePage.mockReturnValue(createMockPage('/dashboard'));
    });

    it('renders all 4 navigation items (Início, Espaços, Reservas, Menu)', () => {
        render(<MobileBottomBar />);

        expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /espaços/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /reservas/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /abrir menu lateral/i })).toBeInTheDocument();
    });

    it('highlights active item based on current url', () => {
        mockedUsePage.mockReturnValue(createMockPage('/espacos'));

        render(<MobileBottomBar />);

        const espacosLink = screen.getByRole('link', { name: /espaços/i });
        expect(espacosLink.className).toContain('text-primary');

        const inicioLink = screen.getByRole('link', { name: /início/i });
        expect(inicioLink.className).toContain('text-muted-foreground');
    });

    it('calls toggleSidebar when menu button is clicked', () => {
        render(<MobileBottomBar />);

        const menuButton = screen.getByRole('button', { name: /abrir menu lateral/i });
        fireEvent.click(menuButton);

        expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
    });
});
