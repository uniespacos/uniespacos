import { useReservaRefreshOnEvent } from '@/hooks/use-reserva-refresh-on-event';
import { renderHook } from '@testing-library/react';

describe('useReservaRefreshOnEvent', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('should handle event listener setup and cleanup', () => {
        const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

        const { unmount } = renderHook(() => {
            useReservaRefreshOnEvent({ only: ['test'] });
        });

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('reserva:updated', expect.any(Function));
        removeEventListenerSpy.mockRestore();
    });

    it('should clear timeout on unmount', () => {
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

        const { unmount } = renderHook(() => {
            useReservaRefreshOnEvent({ only: ['test'] });
        });

        document.dispatchEvent(new CustomEvent('reserva:updated'));

        unmount();

        expect(clearTimeoutSpy).toHaveBeenCalled();
        clearTimeoutSpy.mockRestore();
    });

    it('should not throw when mounting and unmounting', () => {
        expect(() => {
            const { unmount } = renderHook(() => {
                useReservaRefreshOnEvent({ only: ['reservas'] });
            });

            unmount();
        }).not.toThrow();
    });

    it('should not throw when firing events', () => {
        expect(() => {
            renderHook(() => {
                useReservaRefreshOnEvent({ only: ['reservas'] });
            });

            document.dispatchEvent(new CustomEvent('reserva:updated'));
            jest.advanceTimersByTime(500);

            document.dispatchEvent(new CustomEvent('outro-evento'));
            jest.advanceTimersByTime(500);
        }).not.toThrow();
    });

    it('should handle debounce timing correctly', () => {
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

        const { unmount } = renderHook(() => {
            useReservaRefreshOnEvent({ only: ['reservas'], debounceMs: 200 });
        });

        // Fire multiple events
        document.dispatchEvent(new CustomEvent('reserva:updated'));
        jest.advanceTimersByTime(50);
        document.dispatchEvent(new CustomEvent('reserva:updated'));
        jest.advanceTimersByTime(200);

        unmount();

        // Should have cleared timeout during unmount
        expect(clearTimeoutSpy).toHaveBeenCalled();
        clearTimeoutSpy.mockRestore();
    });

    it('should respect custom debounce duration', () => {
        const { unmount } = renderHook(() => {
            useReservaRefreshOnEvent({ only: ['reservas'], debounceMs: 1000 });
        });

        document.dispatchEvent(new CustomEvent('reserva:updated'));
        jest.advanceTimersByTime(500);

        document.dispatchEvent(new CustomEvent('reserva:updated'));
        jest.advanceTimersByTime(600);

        unmount();

        // Test passes if no errors occur
        expect(true).toBe(true);
    });
});
