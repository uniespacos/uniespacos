import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

function getInitialAppearance(): Appearance {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('appearance');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
    }
    return 'light';
}

export function updateThemeClass(appearance: Appearance) {
    if (typeof window === 'undefined') return;

    const isDark = appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.classList.toggle('dark', isDark);
}

export function initializeTheme() {
    if (typeof window === 'undefined') return;

    const appearance = getInitialAppearance();
    updateThemeClass(appearance);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const current = getInitialAppearance();
        if (current === 'system') {
            updateThemeClass('system');
        }
    });
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(getInitialAppearance);

    const updateAppearance = useCallback((mode: Appearance) => {
        setAppearance(mode);
        localStorage.setItem('appearance', mode);
        document.cookie = `appearance=${mode};path=/;max-age=31536000;SameSite=Lax`;
        updateThemeClass(mode);
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = () => {
            if (appearance === 'system') {
                updateThemeClass('system');
            }
        };

        mediaQuery.addEventListener('change', handleMediaChange);
        return () => {
            mediaQuery.removeEventListener('change', handleMediaChange);
        };
    }, [appearance]);

    return {
        appearance,
        updateAppearance,
    };
}
