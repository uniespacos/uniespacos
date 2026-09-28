import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import type { route as routeFn } from 'ziggy-js';
declare global {
    const route: typeof routeFn;
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
        Uniespacos: {
            reverb: {
                app_key: string;
                host: string;
                port: string;
                scheme: string;
            };
        };
    }
}
