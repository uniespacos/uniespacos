/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_NAME?: string;
    readonly VITE_REVERB_APP_KEY?: string;
    readonly VITE_REVERB_HOST?: string;
    readonly VITE_REVERB_PORT?: string;
    readonly VITE_REVERB_SCHEME?: string;
    readonly BROADCAST_CONNECTION?: 'reverb' | 'pusher' | 'ably' | 'socket.io' | 'null';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
