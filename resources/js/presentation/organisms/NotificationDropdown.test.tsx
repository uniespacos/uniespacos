import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NotificationDropdown } from './NotificationDropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotificationAudio } from '@/hooks/useNotificationAudio';
import { acquirePrivateChannel, releasePrivateChannel } from '@/lib/echo-channel-registry';
import { usePage } from '@inertiajs/react';

const mockRouterPost = jest.fn();

jest.mock('@/hooks/use-mobile', () => ({
    useIsMobile: jest.fn(),
}));

jest.mock('@/hooks/useNotificationAudio', () => ({
    useNotificationAudio: jest.fn(),
}));

jest.mock('@/lib/echo-channel-registry', () => ({
    acquirePrivateChannel: jest.fn(),
    releasePrivateChannel: jest.fn(),
}));

jest.mock('@inertiajs/react', () => ({
    usePage: jest.fn(),
    router: {
        post: (...args: unknown[]) => {
            mockRouterPost(...args);
        },
    },
    Link: ({ children, href, onClick, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={href} onClick={onClick} className={className} {...props}>
            {children}
        </a>
    ),
}));

// Mock global route
(globalThis as unknown as { route: (name: string) => string }).route = (name: string) => `/${name.replace('.', '/')}`;

describe('NotificationDropdown', () => {
    let mockPlayFeedback: jest.Mock;
    let mockChannel: {
        notification: jest.Mock;
        stopListening: jest.Mock;
    };

    const mockUser = {
        id: 42,
        name: 'Carlos Silva',
        email: 'carlos@uesb.edu.br',
        telefone: '77999999999',
        roles: ['comum'],
        permissions: [],
        setor_id: null,
        unread_notifications: [],
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
        email_verified_at: null,
    };

    const initialNotifications = [
        {
            id: 'notif-1',
            type: 'App\\Notifications\\ReservationEvaluatedNotification',
            read_at: null,
            created_at: '2026-08-25T10:00:00Z',
            data: {
                titulo: 'Reserva Deferida',
                mensagem: 'Sua reserva no Lab 1 foi deferida.',
                tipo: 'reserva_deferida' as const,
                reserva_id: 10,
            },
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        mockPlayFeedback = jest.fn();
        (useNotificationAudio as jest.Mock).mockReturnValue({
            playNotificationFeedback: mockPlayFeedback,
        });

        mockChannel = {
            notification: jest.fn(),
            stopListening: jest.fn(),
        };
        (acquirePrivateChannel as jest.Mock).mockReturnValue(mockChannel);

        (useIsMobile as jest.Mock).mockReturnValue(false);

        (usePage as jest.Mock).mockReturnValue({
            props: {
                auth: { user: mockUser },
                notifications: initialNotifications,
            },
        });
    });

    it('renders popover trigger and unread badge in desktop mode', () => {
        render(<NotificationDropdown />);

        expect(screen.getByTestId('notification-trigger')).toBeInTheDocument();
        expect(screen.getByTestId('notification-badge')).toHaveTextContent('1');
        expect(acquirePrivateChannel).toHaveBeenCalledWith('App.Models.User.42');
    });

    it('renders drawer in mobile mode', () => {
        (useIsMobile as jest.Mock).mockReturnValue(true);

        render(<NotificationDropdown />);

        const trigger = screen.getByTestId('notification-trigger');
        expect(trigger).toBeInTheDocument();

        fireEvent.click(trigger);
        expect(screen.getByTestId('notification-drawer')).toBeInTheDocument();
    });

    it('submits markAllAsRead request on button click', () => {
        render(<NotificationDropdown />);

        const trigger = screen.getByTestId('notification-trigger');
        fireEvent.click(trigger);

        const markAllBtn = screen.getByTestId('mark-all-read-btn');
        fireEvent.click(markAllBtn);

        expect(mockRouterPost).toHaveBeenCalledWith(
            '/notifications/markAsRead',
            {},
            expect.objectContaining<Record<string, unknown>>({
                onSuccess: expect.any(Function) as unknown,
                onFinish: expect.any(Function) as unknown,
            }),
        );
    });

    it('receives real-time broadcast notification and triggers audio/haptic feedback', () => {
        let broadcastCallback: ((data: unknown) => void) | undefined;
        mockChannel.notification.mockImplementation((cb: (data: unknown) => void) => {
            broadcastCallback = cb;
        });

        render(<NotificationDropdown />);

        expect(mockChannel.notification).toHaveBeenCalled();

        act(() => {
            broadcastCallback?.({
                id: 'notif-live-99',
                titulo: 'Nova Mensagem do Sistema',
                mensagem: 'Aviso importante recebido via WebSocket.',
                tipo: 'sistema',
                url: '/avisos',
            });
        });

        expect(mockPlayFeedback).toHaveBeenCalled();
        expect(screen.getByTestId('notification-badge')).toHaveTextContent('2');
    });

    it('cleans up Echo private channel listener on unmount', () => {
        const { unmount } = render(<NotificationDropdown />);

        unmount();

        expect(mockChannel.stopListening).toHaveBeenCalledWith('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated');
        expect(releasePrivateChannel).toHaveBeenCalledWith('App.Models.User.42');
    });
});
