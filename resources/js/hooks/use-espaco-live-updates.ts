import { acquirePrivateChannel, releasePrivateChannel } from '@/lib/echo-channel-registry';
import { useEffect } from 'react';

interface EspacoEvent {
    action: string;
    reservaId: number;
    espacoId: number;
    horariosCount: number;
}

export function useEspacoLiveUpdates(espacoId: number): void {
    useEffect(() => {
        const channelName = `App.Models.Espaco.${String(espacoId)}`;
        const channel = acquirePrivateChannel(channelName);
        if (!channel) return;

        channel.listen('.reserva-event', (event: EspacoEvent) => {
            document.dispatchEvent(
                new CustomEvent('reserva:updated', {
                    detail: {
                        action: event.action,
                        reservaId: event.reservaId,
                        espacoId: event.espacoId,
                        horariosCount: event.horariosCount,
                    },
                }),
            );
        });

        return () => {
            channel.stopListening('.reserva-event');
            releasePrivateChannel(channelName);
        };
    }, [espacoId]);
}
