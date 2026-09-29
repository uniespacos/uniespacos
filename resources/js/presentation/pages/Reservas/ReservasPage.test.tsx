import * as UseReservationLiveUpdatesModule from '@/hooks/use-reservation-live-updates';
import * as UseReservaRefreshOnEventModule from '@/hooks/use-reserva-refresh-on-event';
import { __resetEchoChannelRegistryForTests } from '@/lib/echo-channel-registry';
import ReservasPage from './ReservasPage';
import type { Paginator, Reserva, User } from '@/types';
import { render } from '@testing-library/react';
import React from 'react';

jest.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    router: { reload: jest.fn() },
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/presentation/molecules/GenericHeader', () => ({
    __esModule: true,
    default: () => <div data-testid="generic-header">Header</div>,
}));

jest.mock('@/presentation/molecules/ReservasFilters', () => ({
    __esModule: true,
    ReservasFilters: () => <div data-testid="reservas-filters">Filters</div>,
}));

jest.mock('@/presentation/organisms/ReservasList', () => ({
    __esModule: true,
    ReservasList: () => <div data-testid="reservas-list">List</div>,
}));

jest.mock('@/presentation/molecules/ReservasLoading', () => ({
    __esModule: true,
    ReservasLoading: () => <div data-testid="reservas-loading">Loading</div>,
}));

jest.mock('@/presentation/molecules/ReservasEmpty', () => ({
    __esModule: true,
    ReservasEmpty: () => <div data-testid="reservas-empty">Empty</div>,
}));

jest.mock('@/presentation/molecules/ViewModeToggle', () => ({
    __esModule: true,
    ViewMode: 'table',
}));

jest.mock('@/hooks/use-reservation-live-updates', () => ({
    useReservationLiveUpdates: jest.fn(),
}));

jest.mock('@/hooks/use-reserva-refresh-on-event', () => ({
    useReservaRefreshOnEvent: jest.fn(),
}));

jest.mock('@/hooks/use-mobile', () => ({
    useIsMobile: jest.fn(() => false),
}));

jest.mock('@/hooks/use-reservas-filters', () => ({
    useReservasFilters: jest.fn(() => ({
        searchTerm: '',
        setSearchTerm: jest.fn(),
        selectedSituacao: '',
        setSelectedSituacao: jest.fn(),
        selectedArquivo: 'ativo',
        setSelectedArquivo: jest.fn(),
        selectedOrdenar: 'data_desc',
        setSelectedOrdenar: jest.fn(),
        selectedDate: null,
        setSelectedDate: jest.fn(),
    })),
}));

jest.mock('@/i18n', () => ({
    useTranslation: jest.fn(() => ({
        t: (key: string) => key,
    })),
}));

describe('ReservasPage', () => {
    const mockPaginator: Paginator<Reserva> = {
        data: [],
        from: 1,
        to: 0,
        per_page: 10,
        total: 0,
        last_page: 1,
        current_page: 1,
        links: [],
        path: '/reservas',
        first_page_url: '/reservas?page=1',
        last_page_url: '/reservas?page=1',
        next_page_url: null,
        prev_page_url: null,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        __resetEchoChannelRegistryForTests();

        (global as Record<string, unknown>).route = jest.fn(() => '/test-route');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete (global as Record<string, unknown>).route;
    });

    it('should render the page without crashing', () => {
        const mockUser: User = {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            email_verified_at: '2024-01-01',
            telefone: '',
            roles: [],
            permissions: [],
            setor_id: 1,
            unread_notifications: [],
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
        };

        const { getByTestId } = render(
            <ReservasPage
                filters={{}}
                reservas={mockPaginator}
                user={mockUser}
            />
        );

        expect(getByTestId('generic-header')).toBeInTheDocument();
        expect(getByTestId('reservas-filters')).toBeInTheDocument();
        expect(getByTestId('reservas-list')).toBeInTheDocument();
    });

    it('should call useReservationLiveUpdates hook', () => {
        const mockUser: User = {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            email_verified_at: '2024-01-01',
            telefone: '',
            roles: [],
            permissions: [],
            setor_id: 1,
            unread_notifications: [],
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
        };

        render(
            <ReservasPage
                filters={{}}
                reservas={mockPaginator}
                user={mockUser}
            />
        );

        const mockUseReservationLiveUpdates = jest.mocked(UseReservationLiveUpdatesModule.useReservationLiveUpdates);
        expect(mockUseReservationLiveUpdates).toHaveBeenCalled();
    });

    it('should call useReservaRefreshOnEvent with correct only parameter', () => {
        const mockUser: User = {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            email_verified_at: '2024-01-01',
            telefone: '',
            roles: [],
            permissions: [],
            setor_id: 1,
            unread_notifications: [],
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
        };

        render(
            <ReservasPage
                filters={{}}
                reservas={mockPaginator}
                user={mockUser}
            />
        );

        const mockUseReservaRefreshOnEvent = jest.mocked(UseReservaRefreshOnEventModule.useReservaRefreshOnEvent);
        expect(mockUseReservaRefreshOnEvent).toHaveBeenCalled();
        // Verify the hook was called with options containing correct only array
        expect(mockUseReservaRefreshOnEvent.mock.calls[0][0].only).toContain('reservas');
    });
});
