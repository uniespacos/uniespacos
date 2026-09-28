import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationGroupList } from './NotificationGroupList';
import { DatabaseNotificationItem } from '@/types/notification';
import { subDays, subWeeks, formatISO } from 'date-fns';

jest.mock('@inertiajs/react', () => ({
    Link: ({ children, href, onClick, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={href} onClick={onClick} className={className} {...props}>
            {children}
        </a>
    ),
}));

describe('NotificationGroupList', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-09-28T12:00:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    function getMockNotifications(): DatabaseNotificationItem[] {
        const now = new Date();
        return [
            {
                id: 'notif-1',
                type: 'App\\Notifications\\ReservationEvaluatedNotification',
                read_at: null,
                created_at: formatISO(now),
                data: {
                    titulo: 'Reserva Deferida',
                    mensagem: 'Sua reserva no Auditório foi aprovada com sucesso.',
                    tipo: 'reserva_deferida',
                    reserva_id: 101,
                },
            },
            {
                id: 'notif-2',
                type: 'App\\Notifications\\ReservationEvaluatedNotification',
                read_at: formatISO(now),
                created_at: formatISO(subDays(now, 1)),
                data: {
                    titulo: 'Reserva Indeferida',
                    mensagem: 'Sua reserva foi indeferida pelo gestor.',
                    tipo: 'reserva_indeferida',
                    url: '/reservas/102',
                },
            },
            {
                id: 'notif-3',
                type: 'App\\Notifications\\NewReservationNotification',
                read_at: null,
                created_at: formatISO(subDays(now, 3)),
                data: {
                    titulo: 'Nova Solicitação',
                    mensagem: 'Solicitação de reserva aguardando análise.',
                    tipo: 'reserva_solicitada',
                    reserva_id: 103,
                },
            },
            {
                id: 'notif-4',
                type: 'App\\Notifications\\BaseNotification',
                read_at: formatISO(now),
                created_at: formatISO(subWeeks(now, 2)),
                data: {
                    titulo: 'Aviso do Sistema',
                    descricao: 'Manutenção programada dos servidores.',
                    tipo: 'sistema',
                },
            },
        ];
    }

    it('renders empty state when there are no notifications', () => {
        render(<NotificationGroupList notifications={[]} />);

        expect(screen.getByText('Nenhuma notificação por aqui.')).toBeInTheDocument();
    });

    it('groups notifications by temporal categories (Hoje, Ontem, etc.)', () => {
        const mockNotifications = getMockNotifications();
        render(<NotificationGroupList notifications={mockNotifications} />);

        expect(screen.getByTestId('notification-group-hoje')).toBeInTheDocument();
        expect(screen.getByText('Hoje')).toBeInTheDocument();
        expect(screen.getByText('Reserva Deferida')).toBeInTheDocument();

        expect(screen.getByTestId('notification-group-ontem')).toBeInTheDocument();
        expect(screen.getByText('Ontem')).toBeInTheDocument();
        expect(screen.getByText('Reserva Indeferida')).toBeInTheDocument();

        expect(screen.getByTestId('notification-group-mais_antigas')).toBeInTheDocument();
        expect(screen.getByText('Mais Antigas')).toBeInTheDocument();
        expect(screen.getByText('Aviso do Sistema')).toBeInTheDocument();
    });

    it('renders correct links and message descriptions', () => {
        const mockNotifications = getMockNotifications();
        render(<NotificationGroupList notifications={mockNotifications} />);

        const item1 = screen.getByTestId('notification-item-notif-1');
        expect(item1).toHaveAttribute('href', '/reservas/101');
        expect(screen.getByText('Sua reserva no Auditório foi aprovada com sucesso.')).toBeInTheDocument();

        const item2 = screen.getByTestId('notification-item-notif-2');
        expect(item2).toHaveAttribute('href', '/reservas/102');

        const item4 = screen.getByTestId('notification-item-notif-4');
        expect(item4).toHaveAttribute('href', '#');
        expect(screen.getByText('Manutenção programada dos servidores.')).toBeInTheDocument();
    });

    it('calls onItemClick when a notification is clicked', () => {
        const mockNotifications = getMockNotifications();
        const handleClick = jest.fn();
        render(<NotificationGroupList notifications={mockNotifications} onItemClick={handleClick} />);

        const item1 = screen.getByTestId('notification-item-notif-1');
        fireEvent.click(item1);

        expect(handleClick).toHaveBeenCalledWith(mockNotifications[0]);
    });
});
