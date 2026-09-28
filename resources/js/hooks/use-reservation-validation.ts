import { acquirePrivateChannel, releasePrivateChannel } from '@/lib/echo-channel-registry';
import { router } from '@inertiajs/react';
import { useEffect } from 'react';

export function useReservationValidation(reservaId: number): void {
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const channel = acquirePrivateChannel(`reserva.${String(reservaId)}`);
        if (!channel) return;

        channel.listen('ReservationValidated', () => {
            router.reload();
        });

        return () => {
            channel.stopListening('ReservationValidated');
            releasePrivateChannel(`reserva.${String(reservaId)}`);
        };
    }, [reservaId]);
}
