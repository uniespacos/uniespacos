import { act, renderHook } from '@testing-library/react';
import { usePwaInstallPrompt, type BeforeInstallPromptEvent } from './usePwaInstallPrompt';

function createMockBeforeInstallPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted'): {
    event: BeforeInstallPromptEvent;
    promptMock: jest.Mock<Promise<void>, []>;
} {
    const event = new Event('beforeinstallprompt');
    const promptMock = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome });

    Object.defineProperty(event, 'prompt', {
        value: promptMock,
        writable: true,
    });
    Object.defineProperty(event, 'userChoice', {
        value: userChoice,
        writable: true,
    });

    return {
        event: event as BeforeInstallPromptEvent,
        promptMock,
    };
}

describe('usePwaInstallPrompt', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('starts with isInstallable as false when no prompt event has fired', () => {
        const { result } = renderHook(() => usePwaInstallPrompt());
        expect(result.current.isInstallable).toBe(false);
    });

    it('becomes installable when beforeinstallprompt event is dispatched', () => {
        const { result } = renderHook(() => usePwaInstallPrompt());
        const { event } = createMockBeforeInstallPromptEvent('accepted');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(result.current.isInstallable).toBe(true);
    });

    it('prompts install and handles accepted outcome', async () => {
        const { result } = renderHook(() => usePwaInstallPrompt());
        const { event, promptMock } = createMockBeforeInstallPromptEvent('accepted');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(result.current.isInstallable).toBe(true);

        await act(async () => {
            await result.current.promptInstall();
        });

        expect(promptMock).toHaveBeenCalledTimes(1);
        expect(result.current.isInstallable).toBe(false);
    });

    it('dismisses prompt and persists dismissal in localStorage', () => {
        const { result } = renderHook(() => usePwaInstallPrompt());
        const { event } = createMockBeforeInstallPromptEvent('dismissed');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(result.current.isInstallable).toBe(true);

        act(() => {
            result.current.dismissPrompt();
        });

        expect(result.current.isInstallable).toBe(false);
        expect(localStorage.getItem('uniespacos_pwa_dismissed')).toBe('true');
    });

    it('remains not installable if previously dismissed in localStorage', () => {
        localStorage.setItem('uniespacos_pwa_dismissed', 'true');

        const { result } = renderHook(() => usePwaInstallPrompt());
        const { event } = createMockBeforeInstallPromptEvent('accepted');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(result.current.isInstallable).toBe(false);
    });
});
