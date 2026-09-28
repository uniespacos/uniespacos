import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ isSsrBuild }) => ({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    resolve: {
        alias: {
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
        dedupe: ['@inertiajs/react']
    },
    // Ambiente de desenvolvimento
    server: {
        host: '0.0.0.0', // Escuta em todas as interfaces de rede
        port: 5173,      // A porta padrão do Vite
        hmr: {
            host: 'localhost', // O navegador se conectará ao HMR via localhost
        }
    },
    build: {
        rollupOptions: isSsrBuild
            ? {}
            : {
                output: {
                    manualChunks: {
                        'vendor-react': ['react', 'react-dom', '@inertiajs/react'],
                        'vendor-radix': [
                            '@radix-ui/react-dialog',
                            '@radix-ui/react-popover',
                            '@radix-ui/react-dropdown-menu',
                            '@radix-ui/react-select',
                        ],
                        'vendor-charts': ['recharts'],
                        'vendor-dates': ['date-fns', 'react-day-picker'],
                    },
                },
            },
        chunkSizeWarningLimit: 600,
    },
}));
