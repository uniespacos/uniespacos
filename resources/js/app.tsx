import { createInertiaApp, router } from '@inertiajs/react';
import Echo from 'laravel-echo';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import Pusher from 'pusher-js';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { initializeTheme } from './hooks/use-appearance';
import { acquirePrivateChannel, releasePrivateChannel } from './lib/echo-channel-registry';

const appName = import.meta.env.VITE_APP_NAME ?? 'UniEspaços';
let echoInstance: Echo<'reverb'> | undefined;
let activeUserChannelName: string | null = null;

function extractAuthUserId(pageProps: Record<string, unknown> | undefined): string | null {
    const auth = pageProps?.auth as { user?: { id?: number | string } | null } | undefined;
    const rawId = auth?.user?.id;
    if (typeof rawId === 'number' || (typeof rawId === 'string' && rawId.length > 0)) {
        return String(rawId);
    }
    return null;
}

function syncEchoWithAuthState(pageProps: Record<string, unknown> | undefined): void {
    const userId = extractAuthUserId(pageProps);

    if (userId === null) {
        if (activeUserChannelName !== null) {
            releasePrivateChannel(activeUserChannelName);
            activeUserChannelName = null;
        }
        if (echoInstance) {
            echoInstance.disconnect();
            echoInstance = undefined;
            delete (window as Partial<Window>).Echo;
        }
        return;
    }

    if (!import.meta.env.VITE_REVERB_APP_KEY) {
        return;
    }

    if (!echoInstance) {
        window.Pusher = Pusher as unknown as typeof window.Pusher;
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST,
            wssHost: import.meta.env.VITE_REVERB_HOST,
            wsPort: import.meta.env.VITE_REVERB_SCHEME === 'https' ? 443 : parseInt(import.meta.env.VITE_REVERB_PORT ?? '80', 10) || 80,
            wssPort: parseInt(import.meta.env.VITE_REVERB_PORT ?? '443', 10) || 443,
            forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
            enabledTransports: ['ws', 'wss'],
            disableStats: true,
        });
        window.Echo = echoInstance;
    }

    const nextChannelName = `App.Models.User.${userId}`;
    if (activeUserChannelName !== nextChannelName) {
        if (activeUserChannelName !== null) {
            releasePrivateChannel(activeUserChannelName);
        }
        acquirePrivateChannel(nextChannelName);
        activeUserChannelName = nextChannelName;
    }
}

router.on('navigate', (event) => {
    syncEchoWithAuthState(event.detail.page.props);
});

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./presentation/pages/${name}.tsx`,
            import.meta.glob(['./presentation/pages/**/*.tsx', '!./presentation/pages/**/*.test.tsx', '!./presentation/pages/**/*.spec.tsx']),
        ),
    setup({ el, App, props }) {
        syncEchoWithAuthState(props.initialPage.props);

        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: 'var(--color-primary)',
    },
});

initializeTheme();
