import { useIsMobile } from '@/hooks/use-mobile';
import { useNotificationAudio } from '@/hooks/useNotificationAudio';
import { acquirePrivateChannel, releasePrivateChannel } from '@/lib/echo-channel-registry';
import { usePage } from '@inertiajs/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { NotificationDropdown } from './NotificationDropdown';

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
        unread_notifications_count: 1,
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

    const notificacaoComChave = {
        id: 'notif-chave-1',
        type: 'App\\Notifications\\NewReservationNotification',
        read_at: null,
        created_at: '2026-08-25T10:00:00Z',
        data: {
            titulo: 'Titulo gravado',
            descricao: 'Descricao gravada',
            chave: 'reservas.nova_solicitacao',
            parametros: { titulo_reserva: 'Sala 1' },
            reserva_id: 11,
            tipo: 'reserva_solicitada' as const,
        },
    };

    const notificacaoAntiga = {
        id: 'notif-legada-1',
        type: 'App\\Notifications\\NewReservationNotification',
        read_at: null,
        created_at: '2026-08-25T10:00:00Z',
        data: {
            titulo: 'Titulo legado',
            descricao: "Uma nova solicitação de reserva para 'Sala 0' foi enviada por 'Nome Antigo'.",
            reserva_id: 12,
            tipo: 'reserva_solicitada' as const,
        },
    };

    it('renderiza a notificação pela chave em pt-BR, com os parâmetros, em vez do texto gravado', () => {
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: mockUser }, notifications: [notificacaoComChave], locale: 'pt-BR' },
        });

        render(<NotificationDropdown />);
        fireEvent.click(screen.getByTestId('notification-trigger'));

        expect(screen.getByText('Nova Solicitação de Reserva')).toBeInTheDocument();
        expect(screen.getByText("Uma nova solicitação de reserva para 'Sala 1' foi enviada.")).toBeInTheDocument();
        expect(screen.queryByText('Titulo gravado')).not.toBeInTheDocument();
    });

    it('renderiza a notificação pela chave em inglês quando o idioma da página é en', () => {
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: mockUser }, notifications: [notificacaoComChave], locale: 'en' },
        });

        render(<NotificationDropdown />);
        fireEvent.click(screen.getByTestId('notification-trigger'));

        expect(screen.getByText('New Reservation Request')).toBeInTheDocument();
        expect(screen.getByText("A new reservation request for 'Sala 1' was submitted.")).toBeInTheDocument();
    });

    it('cai no titulo e na descricao gravados quando a notificação antiga não tem chave', () => {
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: mockUser }, notifications: [notificacaoAntiga], locale: 'en' },
        });

        render(<NotificationDropdown />);
        fireEvent.click(screen.getByTestId('notification-trigger'));

        expect(screen.getByText('Titulo legado')).toBeInTheDocument();
        expect(screen.getByText("Uma nova solicitação de reserva para 'Sala 0' foi enviada por 'Nome Antigo'.")).toBeInTheDocument();
    });

    it('renderiza pela chave a notificação que chega em tempo real via broadcast', () => {
        let broadcastCallback: ((data: unknown) => void) | undefined;
        mockChannel.notification.mockImplementation((cb: (data: unknown) => void) => {
            broadcastCallback = cb;
        });
        (usePage as jest.Mock).mockReturnValue({
            props: { auth: { user: mockUser }, notifications: [], locale: 'en' },
        });

        render(<NotificationDropdown />);

        act(() => {
            broadcastCallback?.({
                id: 'notif-live-chave',
                titulo: 'Reserva Cancelada',
                descricao: 'A reserva "Sala 2" foi cancelada.',
                chave: 'reservas.cancelada',
                parametros: { titulo_reserva: 'Sala 2' },
                url: '/gestor/reservas',
                reserva_id: 9,
            });
        });

        fireEvent.click(screen.getByTestId('notification-trigger'));

        expect(screen.getByText('Reservation Canceled')).toBeInTheDocument();
        expect(screen.getByText('The reservation "Sala 2" was canceled.')).toBeInTheDocument();
    });

    const criarNotificacoesNaoLidas = (quantidade: number) =>
        Array.from({ length: quantidade }, (_, indice) => ({
            id: `notif-massa-${String(indice)}`,
            type: 'App\\Notifications\\ReservationEvaluatedNotification',
            read_at: null,
            created_at: '2026-08-25T10:00:00Z',
            data: {
                titulo: `Notificação ${String(indice)}`,
                tipo: 'sistema' as const,
            },
        }));

    const mockPageComContagem = (contagem: number | undefined, notifications: unknown[]) => ({
        props: {
            auth: { user: { ...mockUser, unread_notifications_count: contagem } },
            notifications,
        },
    });

    it('mostra a contagem real do backend, mesmo quando há mais não lidas do que as 15 carregadas', () => {
        (usePage as jest.Mock).mockReturnValue(mockPageComContagem(20, criarNotificacoesNaoLidas(15)));

        render(<NotificationDropdown />);

        expect(screen.getByTestId('notification-badge')).toHaveTextContent('9+');
        fireEvent.click(screen.getByTestId('notification-trigger'));
        expect(screen.getByText('Notificações (20)')).toBeInTheDocument();
    });

    it('soma 1 à contagem do backend quando chega uma notificação em tempo real', () => {
        let broadcastCallback: ((data: unknown) => void) | undefined;
        mockChannel.notification.mockImplementation((cb: (data: unknown) => void) => {
            broadcastCallback = cb;
        });
        (usePage as jest.Mock).mockReturnValue(mockPageComContagem(20, criarNotificacoesNaoLidas(15)));

        render(<NotificationDropdown />);

        act(() => {
            broadcastCallback?.({ id: 'notif-live-massa', titulo: 'Aviso do sistema', tipo: 'sistema' });
        });

        fireEvent.click(screen.getByTestId('notification-trigger'));
        expect(screen.getByText('Notificações (21)')).toBeInTheDocument();
    });

    it('zera a contagem ao marcar todas como lidas com sucesso', () => {
        (usePage as jest.Mock).mockReturnValue(mockPageComContagem(20, criarNotificacoesNaoLidas(15)));

        render(<NotificationDropdown />);
        fireEvent.click(screen.getByTestId('notification-trigger'));
        fireEvent.click(screen.getByTestId('mark-all-read-btn'));

        const opcoes = (mockRouterPost.mock.calls as unknown[][])[0]?.[2] as { onSuccess: () => void };
        act(() => {
            opcoes.onSuccess();
        });

        expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });

    it('ressincroniza a contagem quando a prop muda numa navegação Inertia', () => {
        (usePage as jest.Mock).mockReturnValue(mockPageComContagem(20, criarNotificacoesNaoLidas(15)));

        const { rerender } = render(<NotificationDropdown />);
        expect(screen.getByTestId('notification-badge')).toHaveTextContent('9+');

        (usePage as jest.Mock).mockReturnValue(mockPageComContagem(3, criarNotificacoesNaoLidas(3)));
        rerender(<NotificationDropdown />);

        expect(screen.getByTestId('notification-badge')).toHaveTextContent('3');
    });

    it('usa a contagem da lista quando o backend não envia unread_notifications_count', () => {
        (usePage as jest.Mock).mockReturnValue(mockPageComContagem(undefined, initialNotifications));

        render(<NotificationDropdown />);

        expect(screen.getByTestId('notification-badge')).toHaveTextContent('1');
    });

    it('cleans up Echo private channel listener on unmount', () => {
        const { unmount } = render(<NotificationDropdown />);

        unmount();

        expect(mockChannel.stopListening).toHaveBeenCalledWith('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated');
        expect(releasePrivateChannel).toHaveBeenCalledWith('App.Models.User.42');
    });
});
