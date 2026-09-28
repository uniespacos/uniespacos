export type NotificationPeriodCategory = 'hoje' | 'ontem' | 'esta_semana' | 'mais_antigas';

export type NotificationType = 'reserva_deferida' | 'reserva_indeferida' | 'reserva_solicitada' | 'sistema';

export interface NotificationPayloadData {
    titulo: string;
    mensagem?: string;
    descricao?: string;
    reserva_id?: number;
    url?: string;
    tipo?: NotificationType;
}

export interface DatabaseNotificationItem {
    id: string;
    type: string;
    data: NotificationPayloadData;
    read_at: string | null;
    created_at: string;
}

export interface NotificationGroup {
    category: NotificationPeriodCategory;
    title: string;
    items: DatabaseNotificationItem[];
}

export type NotificationData = NotificationPayloadData;
export type UserNotification = DatabaseNotificationItem;
