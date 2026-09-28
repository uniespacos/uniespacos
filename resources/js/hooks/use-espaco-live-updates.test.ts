import { __resetEchoChannelRegistryForTests } from '@/lib/echo-channel-registry';
import { renderHook } from '@testing-library/react';
import { useEspacoLiveUpdates } from './use-espaco-live-updates';

describe('useEspacoLiveUpdates', () => {
    let mockListen: jest.Mock;
    let mockStopListening: jest.Mock;
    let mockPrivateChannel: jest.Mock;
    let dispatchEventSpy: jest.SpyInstance;

    beforeEach(() => {
        mockListen = jest.fn();
        mockStopListening = jest.fn();
        mockPrivateChannel = jest.fn(() => ({
            listen: mockListen,
            stopListening: mockStopListening,
        }));

        Object.defineProperty(window, 'Echo', {
            value: {
                private: mockPrivateChannel,
                leave: jest.fn(),
            },
            writable: true,
            configurable: true,
        });

        __resetEchoChannelRegistryForTests();

        dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete (window as unknown as { Echo?: unknown }).Echo;
    });

    it('should subscribe to the correct private channel on mount', () => {
        renderHook(() => {
            useEspacoLiveUpdates(42);
        });

        expect(mockPrivateChannel).toHaveBeenCalledWith('App.Models.Espaco.42');
    });

    it('should listen for .reserva-event with leading dot to prevent namespace prefixing', () => {
        renderHook(() => {
            useEspacoLiveUpdates(42);
        });

        expect(mockListen).toHaveBeenCalledWith('.reserva-event', expect.any(Function));
    });

    it('should dispatch reserva:updated event with correct payload when event is received', () => {
        renderHook(() => {
            useEspacoLiveUpdates(42);
        });

        const callArgs = mockListen.mock.calls[0] as (
            | string
            | ((event: { action: string; reservaId: number; espacoId: number; horariosCount: number }) => void)
        )[];
        const callback = callArgs[1] as (event: { action: string; reservaId: number; espacoId: number; horariosCount: number }) => void;

        callback({
            action: 'created',
            reservaId: 10,
            espacoId: 42,
            horariosCount: 2,
        });

        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'reserva:updated',
            }),
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
        expect(event.detail).toEqual({
            action: 'created',
            reservaId: 10,
            espacoId: 42,
            horariosCount: 2,
        });
    });

    it('should unsubscribe from channel when unmounting', () => {
        const { unmount } = renderHook(() => {
            useEspacoLiveUpdates(42);
        });

        unmount();

        expect(mockStopListening).toHaveBeenCalledWith('.reserva-event');
    });

    it('should handle multiple hook instances for different espacoIds independently', () => {
        renderHook(() => {
            useEspacoLiveUpdates(42);
        });

        renderHook(() => {
            useEspacoLiveUpdates(99);
        });

        expect(mockPrivateChannel).toHaveBeenCalledWith('App.Models.Espaco.42');
        expect(mockPrivateChannel).toHaveBeenCalledWith('App.Models.Espaco.99');
        expect(mockListen).toHaveBeenCalledTimes(2);
    });

    it('should dispatch event with all payload fields', () => {
        renderHook(() => {
            useEspacoLiveUpdates(1);
        });

        const callArgs = mockListen.mock.calls[0] as (
            | string
            | ((event: { action: string; reservaId: number; espacoId: number; horariosCount: number }) => void)
        )[];
        const callback = callArgs[1] as (event: { action: string; reservaId: number; espacoId: number; horariosCount: number }) => void;

        callback({
            action: 'validated',
            reservaId: 5,
            espacoId: 1,
            horariosCount: 3,
        });

        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'reserva:updated',
            }),
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
        expect(event.detail).toEqual({
            action: 'validated',
            reservaId: 5,
            espacoId: 1,
            horariosCount: 3,
        });
    });

    it('should handle undefined window.Echo gracefully', () => {
        delete (window as unknown as { Echo?: unknown }).Echo;

        expect(() => {
            renderHook(() => {
                useEspacoLiveUpdates(42);
            });
        }).not.toThrow();

        expect(mockPrivateChannel).not.toHaveBeenCalled();
    });

    it('should resubscribe when espacoId changes', () => {
        const { rerender } = renderHook(
            (id: number) => {
                useEspacoLiveUpdates(id);
            },
            {
                initialProps: 42,
            },
        );

        expect(mockPrivateChannel).toHaveBeenCalledWith('App.Models.Espaco.42');
        expect(mockListen).toHaveBeenCalledTimes(1);

        rerender(99);

        expect(mockPrivateChannel).toHaveBeenCalledWith('App.Models.Espaco.99');
        expect(mockListen).toHaveBeenCalledTimes(2);
    });
});
