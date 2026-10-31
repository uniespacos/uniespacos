import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/presentation/molecules/EmptyState';
import { DatabaseNotificationItem, NotificationPeriodCategory } from '@/types/notification';
import { Link } from '@inertiajs/react';
import { format, isThisWeek, isToday, isValid, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import React from 'react';

export interface NotificationGroupListProps {
    notifications: DatabaseNotificationItem[];
    onItemClick?: (notification: DatabaseNotificationItem) => void;
    className?: string;
}

export const NotificationGroupList: React.FC<NotificationGroupListProps> = ({ notifications, onItemClick, className }) => {
    const { t } = useTranslation();

    if (notifications.length === 0) {
        return <EmptyState icon={Bell} size="compact" title={t('common.empty.noNotifications')} />;
    }

    // Agrupamento temporal
    const groups: Record<NotificationPeriodCategory, DatabaseNotificationItem[]> = {
        hoje: [],
        ontem: [],
        esta_semana: [],
        mais_antigas: [],
    };

    notifications.forEach((item) => {
        const date = parseISO(item.created_at);
        if (!isValid(date)) {
            groups.mais_antigas.push(item);
            return;
        }

        if (isToday(date)) {
            groups.hoje.push(item);
        } else if (isYesterday(date)) {
            groups.ontem.push(item);
        } else if (isThisWeek(date, { locale: ptBR })) {
            groups.esta_semana.push(item);
        } else {
            groups.mais_antigas.push(item);
        }
    });

    const groupDefinitions: { key: NotificationPeriodCategory; title: string }[] = [
        { key: 'hoje', title: 'Hoje' },
        { key: 'ontem', title: 'Ontem' },
        { key: 'esta_semana', title: 'Esta Semana' },
        { key: 'mais_antigas', title: 'Mais Antigas' },
    ];

    const getIcon = (tipo?: string) => {
        switch (tipo) {
            case 'reserva_deferida':
                return <CheckCircle2 className="text-success-accent h-4 w-4 shrink-0" />;
            case 'reserva_indeferida':
                return <XCircle className="text-destructive-accent h-4 w-4 shrink-0" />;
            case 'reserva_solicitada':
                return <Clock className="text-warning-accent h-4 w-4 shrink-0" />;
            default:
                return <Bell className="text-primary h-4 w-4 shrink-0" />;
        }
    };

    const formatNotificationTime = (dateString: string) => {
        const date = parseISO(dateString);
        if (!isValid(date)) return '';
        return format(date, 'HH:mm', { locale: ptBR });
    };

    return (
        <div className={cn('space-y-4 py-1', className)}>
            {groupDefinitions.map((g) => {
                const items = groups[g.key];
                if (items.length === 0) return null;

                return (
                    <div key={g.key} className="space-y-1.5" data-testid={`notification-group-${g.key}`}>
                        <span className="text-muted-foreground px-3 text-[11px] font-semibold tracking-wider uppercase">{g.title}</span>
                        <div className="space-y-1">
                            {items.map((item) => {
                                const isUnread = item.read_at === null;
                                const targetUrl =
                                    item.data.url ?? (item.data.reserva_id !== undefined ? `/reservas/${String(item.data.reserva_id)}` : '#');
                                const mensagem = item.data.mensagem ?? item.data.descricao ?? '';
                                const timeStr = formatNotificationTime(item.created_at);

                                return (
                                    <Link
                                        key={item.id}
                                        href={targetUrl}
                                        onClick={() => {
                                            onItemClick?.(item);
                                        }}
                                        className={cn(
                                            'hover:bg-muted/50 flex items-start gap-3 rounded-lg p-3 text-xs transition-colors',
                                            isUnread ? 'bg-primary/5 font-medium' : 'text-muted-foreground',
                                        )}
                                        data-testid={`notification-item-${item.id}`}
                                    >
                                        <div className="mt-0.5 shrink-0">{getIcon(item.data.tipo)}</div>
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-foreground truncate font-semibold">{item.data.titulo}</span>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    {timeStr ? (
                                                        <span className="text-muted-foreground text-[10px] font-normal">{timeStr}</span>
                                                    ) : null}
                                                    {isUnread ? <Circle className="fill-primary text-primary h-2 w-2 shrink-0" /> : null}
                                                </div>
                                            </div>
                                            {mensagem ? <p className="text-muted-foreground line-clamp-2 text-[11px]">{mensagem}</p> : null}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
