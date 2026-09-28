import { createInertiaApp } from '@inertiajs/react';
import Echo from 'laravel-echo';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import Pusher from 'pusher-js';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME ?? 'UniEspaços';

window.Pusher = Pusher as unknown as typeof window.Pusher; // Certifique-se de que o Pusher está disponível globalmente

// Configure Echo using Vite environment variables directly from .env.dev
// Cast para Echo<'reverb'> conforme declarado em global.d.ts (Window.Echo: Echo<'reverb'>)
window.Echo = new Echo({
    broadcaster: import.meta.env.BROADCAST_CONNECTION ?? 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST, // Use host from .env.dev
    wssHost: import.meta.env.VITE_REVERB_HOST, // Use host from .env.dev
    wsPort: import.meta.env.VITE_REVERB_SCHEME === 'https' ? 443 : parseInt(import.meta.env.VITE_REVERB_PORT ?? '80', 10) || 80,
    wssPort: parseInt(import.meta.env.VITE_REVERB_PORT ?? '443', 10) || 443,
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
}) as Window['Echo'];

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./presentation/pages/${name}.tsx`,
            import.meta.glob(['./presentation/pages/**/*.tsx', '!./presentation/pages/**/*.test.tsx', '!./presentation/pages/**/*.spec.tsx']),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: 'var(--color-primary)',
    },
});

// This will set light / dark mode on load...
initializeTheme();
