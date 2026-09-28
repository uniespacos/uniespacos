import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState<boolean>(false);
    const [isDismissed, setIsDismissed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        try {
            return localStorage.getItem('uniespacos_pwa_dismissed') === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
        }
    }, [deferredPrompt]);

    const dismissPrompt = useCallback(() => {
        setIsDismissed(true);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('uniespacos_pwa_dismissed', 'true');
            } catch {
                // Ignore storage errors in restricted contexts
            }
        }
    }, []);

    return {
        isInstallable: isInstallable && !isDismissed,
        promptInstall,
        dismissPrompt,
    };
}
