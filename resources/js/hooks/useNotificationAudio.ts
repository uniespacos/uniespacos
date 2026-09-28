import { useCallback } from 'react';

export function useNotificationAudio() {
    const playNotificationFeedback = useCallback(() => {
        // Vibração háptica suave em dispositivos móveis compatíveis
        if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
            try {
                navigator.vibrate(50);
            } catch {
                // Ignora falha silenciosamente
            }
        }

        // Síntese de áudio suave via Web Audio API
        try {
            if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
                return;
            }

            const AudioContextClass = window.AudioContext;
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } catch {
            // Ignora se o contexto de áudio estiver bloqueado antes da interação do usuário
        }
    }, []);

    return { playNotificationFeedback };
}
