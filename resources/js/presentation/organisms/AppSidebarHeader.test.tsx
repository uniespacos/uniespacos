import { render, screen } from '@testing-library/react';
import { AppSidebarHeader } from './AppSidebarHeader';
import type React from 'react';

jest.mock('@/components/ui/sidebar', () => ({
    SidebarTrigger: ({ className }: { className?: string }) => (
        <button className={className} aria-label="Toggle Sidebar">
            <span className="sr-only">Toggle Sidebar</span>
        </button>
    ),
    useSidebar: jest.fn(),
}));

jest.mock('@inertiajs/react', () => ({
    Link: ({ children, href, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={href} className={className} {...props}>
            {children}
        </a>
    ),
}));

jest.mock('@/presentation/atoms/AppLogoIcon', () => ({
    __esModule: true,
    default: ({ className }: { className?: string }) => <div className={className} data-testid="app-logo-icon" />,
}));

jest.mock('@/presentation/molecules/Breadcrumbs', () => ({
    Breadcrumbs: ({ breadcrumbs }: { breadcrumbs?: { title: string; href?: string }[] }) => (
        <div data-testid="breadcrumbs">{breadcrumbs?.length ? 'breadcrumbs-rendered' : 'no-breadcrumbs'}</div>
    ),
}));

jest.mock('@/presentation/molecules/LanguageSelector', () => ({
    LanguageSelector: () => <div data-testid="language-selector" />,
}));

jest.mock('@/presentation/organisms/NotificationDropdown', () => ({
    NotificationDropdown: () => <div data-testid="notification-dropdown" />,
}));

describe('AppSidebarHeader', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders SidebarTrigger with hidden class on mobile', () => {
        const { container } = render(<AppSidebarHeader />);

        const trigger = container.querySelector('button[aria-label="Toggle Sidebar"]');
        expect(trigger).toBeInTheDocument();
        expect(trigger).toHaveClass('hidden');
        expect(trigger).toHaveClass('md:inline-flex');
    });

    it('renders Breadcrumbs with hidden md:block class', () => {
        const breadcrumbs = [
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Spaces', href: '/espacos' },
        ];

        render(<AppSidebarHeader breadcrumbs={breadcrumbs} />);

        const breadcrumbsDiv = screen.getByTestId('breadcrumbs');
        const breadcrumbsWrapper = breadcrumbsDiv.parentElement;

        expect(breadcrumbsWrapper).toHaveClass('hidden');
        expect(breadcrumbsWrapper).toHaveClass('md:block');
    });

    it('renders logo link with flex items-center gap-1.5 md:hidden classes', () => {
        const { container } = render(<AppSidebarHeader />);

        const logoLink = container.querySelector('a[href="/dashboard"]');
        expect(logoLink).toBeInTheDocument();
        expect(logoLink).toHaveClass('flex');
        expect(logoLink).toHaveClass('items-center');
        expect(logoLink).toHaveClass('gap-1.5');
        expect(logoLink).toHaveClass('md:hidden');
    });

    it('renders LanguageSelector and NotificationDropdown', () => {
        render(<AppSidebarHeader />);

        expect(screen.getByTestId('language-selector')).toBeInTheDocument();
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });

    it('renders with default empty breadcrumbs when none provided', () => {
        render(<AppSidebarHeader />);

        const breadcrumbs = screen.getByTestId('breadcrumbs');
        expect(breadcrumbs).toHaveTextContent('no-breadcrumbs');
    });
});
