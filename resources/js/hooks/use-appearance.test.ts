import { act, renderHook } from '@testing-library/react';
import { initializeTheme, useAppearance } from './use-appearance';

describe('useAppearance', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        document.cookie = '';

        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            })),
        });
    });

    it('defaults to light when no preference stored', () => {
        const { result } = renderHook(() => useAppearance());
        expect(result.current.appearance).toBe('light');
    });

    it('updates appearance to dark and applies dark class', () => {
        const { result } = renderHook(() => useAppearance());

        act(() => {
            result.current.updateAppearance('dark');
        });

        expect(result.current.appearance).toBe('dark');
        expect(localStorage.getItem('appearance')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('updates appearance to light and removes dark class', () => {
        document.documentElement.classList.add('dark');
        const { result } = renderHook(() => useAppearance());

        act(() => {
            result.current.updateAppearance('light');
        });

        expect(result.current.appearance).toBe('light');
        expect(localStorage.getItem('appearance')).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('initializeTheme sets dark class if preference is dark', () => {
        localStorage.setItem('appearance', 'dark');
        initializeTheme();
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
});
