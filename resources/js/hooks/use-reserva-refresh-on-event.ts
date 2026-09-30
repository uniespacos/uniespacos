import { router } from '@inertiajs/react';
import { useEffect } from 'react';

interface UseReservaRefreshOnEventProps {
    /**
     * Lista de props Inertia a recarregar.
     * Ex: ['reservas', 'filters'] para recarregar listagem e filtros.
     */
    only: string[];
    /**
     * Debounce em ms. Default: 400ms (mesmo que VisualizarEspacoPage).
     */
    debounceMs?: number;
}

/**
 * Hook que escuta o CustomEvent 'reserva:updated' e recarrega props específicas.
 *
 * Encapsula:
 * - Listener do documento
 * - Debounce com setTimeout/clearTimeout
 * - router.reload com only
 * - Cleanup na desmontagem
 *
 * Uso:
 *   useReservaRefreshOnEvent({ only: ['reservas', 'filters'] });
 *
 * Propósito:
 *   Evitar cópia-cola do mesmo useEffect em 3-4 telas.
 *   Garantir debounce consistente (400ms) entre telas.
 *   Simplificar cleanup de listeners.
 */
export function useReservaRefreshOnEvent({
    only,
    debounceMs = 400,
}: UseReservaRefreshOnEventProps): void {
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        const handleUpdate = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                router.reload({
                    only,
                });
            }, debounceMs);
        };

        document.addEventListener('reserva:updated', handleUpdate);

        return () => {
            document.removeEventListener('reserva:updated', handleUpdate);
            clearTimeout(timer);
        };
    }, [only, debounceMs]);
}
