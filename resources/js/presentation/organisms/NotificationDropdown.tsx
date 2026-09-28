import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { acquirePrivateChannel, releasePrivateChannel } from '@/lib/echo-channel-registry';
import { User } from '@/types';
import { DatabaseNotificationItem, NotificationType } from '@/types/notification';
import { router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotificationAudio } from '@/hooks/useNotificationAudio';
import { NotificationGroupList } from '@/presentation/molecules/NotificationGroupList';

export function NotificationDropdown() {
    const { props } = usePage<{
        auth: {
            user: User;
        };
        notifications?: DatabaseNotificationItem[];
    }>();
    const user = props.auth.user;
    const [notifications, setNotifications] = useState<DatabaseNotificationItem[]>(props.notifications ?? []);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const isMobile = useIsMobile();
    const { playNotificationFeedback } = useNotificationAudio();

    // Sincroniza se as props de notificações mudarem via navegação Inertia
    useEffect(() => {
        if (props.notifications !== undefined) {
            setNotifications(props.notifications);
        }
    }, [props.notifications]);

    const unreadCount = useMemo(() => notifications.filter((n) => n.read_at === null).length, [notifications]);

    const markAllAsRead = () => {
        if (unreadCount === 0) return;

        setIsLoading(true);

        router.post(
            route('notifications.markAsRead'),
            {},
            {
                onSuccess: () => {
                    setNotifications((prev) =>
                        prev.map((n) => ({
                            ...n,
                            read_at: n.read_at ?? new Date().toISOString(),
                        })),
                    );
                },
                onFinish: () => {
                    setIsLoading(false);
                },
            },
        );
    };

    useEffect(() => {
        const channelName = `App.Models.User.${String(user.id)}`;
        const channel = acquirePrivateChannel(channelName);
        if (!channel) return;

        channel.notification(
            (notification: {
                id?: string;
                type?: string;
                titulo?: string;
                descricao?: string;
                mensagem?: string;
                url?: string;
                reserva_id?: number;
                tipo?: NotificationType;
            }) => {
                const newItem: DatabaseNotificationItem = {
                    id: notification.id ?? String(Date.now()),
                    type: notification.type ?? 'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated',
                    read_at: null,
                    created_at: new Date().toISOString(),
                    data: {
                        titulo: notification.titulo ?? 'Nova Notificação',
                        mensagem: notification.mensagem,
                        descricao: notification.descricao,
                        url: notification.url,
                        reserva_id: notification.reserva_id,
                        tipo: notification.tipo,
                    },
                };

                setNotifications((prev) => [newItem, ...prev]);
                playNotificationFeedback();
            },
        );

        return () => {
            channel.stopListening('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated');
            releasePrivateChannel(channelName);
        };
    }, [user.id, playNotificationFeedback]);

    const handleItemClick = () => {
        setIsOpen(false);
    };

    const triggerButton = (
        <Button
            variant="ghost"
            className="relative h-11 w-11 p-0 md:h-8 md:w-8"
            aria-label="Visualizar Notificações"
            data-testid="notification-trigger"
        >
            <span className="sr-only">Visualizar Notificações</span>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
                <span
                    className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                    data-testid="notification-badge"
                >
                    {unreadCount > 9 ? '9+' : String(unreadCount)}
                </span>
            ) : null}
        </Button>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
                <DrawerContent className="max-h-[85vh]" data-testid="notification-drawer">
                    <DrawerHeader className="border-border/40 border-b pb-3 text-left">
                        <div className="flex items-center justify-between">
                            <div>
                                <DrawerTitle className="text-base font-semibold">
                                    Notificações{unreadCount > 0 ? ` (${String(unreadCount)})` : ''}
                                </DrawerTitle>
                                <DrawerDescription className="text-muted-foreground text-xs">Atualizações e avisos do sistema</DrawerDescription>
                            </div>
                            {unreadCount > 0 ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={markAllAsRead}
                                    disabled={isLoading}
                                    className="text-muted-foreground hover:text-primary h-auto p-0 text-xs"
                                    data-testid="mark-all-read-btn"
                                >
                                    {isLoading ? 'Marcando...' : 'Marcar todas como lidas'}
                                </Button>
                            ) : null}
                        </div>
                    </DrawerHeader>
                    <div className="max-h-[calc(85vh-100px)] overflow-y-auto px-2 py-3 pb-8">
                        <NotificationGroupList notifications={notifications} onItemClick={handleItemClick} />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
            <PopoverContent className="flex max-h-[85vh] w-80 flex-col overflow-hidden p-0 sm:w-96" align="end" data-testid="notification-popover">
                <div className="flex shrink-0 items-center justify-between p-3">
                    <h4 className="text-foreground text-sm font-semibold">Notificações{unreadCount > 0 ? ` (${String(unreadCount)})` : ''}</h4>
                    {unreadCount > 0 ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            disabled={isLoading}
                            className="text-muted-foreground hover:text-primary h-auto p-0 text-xs"
                            data-testid="mark-all-read-btn"
                        >
                            {isLoading ? 'Marcando...' : 'Marcar todas como lidas'}
                        </Button>
                    ) : null}
                </div>
                <Separator className="shrink-0" />
                <ScrollArea className="h-[360px] w-full p-2">
                    <NotificationGroupList notifications={notifications} onItemClick={handleItemClick} />
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
