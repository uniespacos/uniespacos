import { acquirePublicChannel, releasePublicChannel } from '@/lib/echo-channel-registry';
import { useEffect } from 'react';

interface ReservationEvent {
    action: string;
    reservaId: number;
}

export function useReservationLiveUpdates(): void {
    useEffect(() => {
        const ACOES_QUE_ATUALIZAM = new Set(['created', 'validated', 'evaluated']);

        const channel = acquirePublicChannel('reserva-channel');
        if (!channel) return;

        channel.listen('.reserva-event', (event: ReservationEvent) => {
            if (ACOES_QUE_ATUALIZAM.has(event.action)) {
                document.dispatchEvent(
                    new CustomEvent('reserva:updated', {
                        detail: {
                            reservaId: event.reservaId,
                            action: event.action,
                        },
                    }),
                );
            }
        });

        return () => {
            channel.stopListening('.reserva-event');
            releasePublicChannel('reserva-channel');
        };
    }, []);
}
