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
        dedupe: ['@inertiajs/react'],
    },
    // Ambiente de desenvolvimento
    server: {
        host: '0.0.0.0', // Escuta em todas as interfaces de rede
        port: 5173, // A porta padrão do Vite
        hmr: {
            host: 'localhost', // O navegador se conectará ao HMR via localhost
        },
    },
    build: {
        rollupOptions: isSsrBuild
            ? {}
            : {
                  output: {
                      manualChunks(id) {
                          const normalizedId = id.replace(/\\/g, '/');
                          if (!normalizedId.includes('/node_modules/')) {
                              return undefined;
                          }
                          if (
                              normalizedId.includes('/node_modules/react/') ||
                              normalizedId.includes('/node_modules/react-dom/') ||
                              normalizedId.includes('/node_modules/scheduler/') ||
                              normalizedId.includes('/node_modules/@inertiajs/')
                          ) {
                              return 'vendor-react';
                          }
                          if (normalizedId.includes('/node_modules/lucide-react/')) {
                              return 'vendor-icons';
                          }
                          if (normalizedId.includes('/node_modules/@radix-ui/')) {
                              return 'vendor-radix';
                          }
                          if (normalizedId.includes('/node_modules/recharts/') || normalizedId.includes('/node_modules/d3-')) {
                              return 'vendor-charts';
                          }
                          if (normalizedId.includes('/node_modules/date-fns/') || normalizedId.includes('/node_modules/react-day-picker/')) {
                              return 'vendor-dates';
                          }
                          if (
                              normalizedId.includes('/node_modules/react-hook-form/') ||
                              normalizedId.includes('/node_modules/@hookform/resolvers/') ||
                              normalizedId.includes('/node_modules/zod/')
                          ) {
                              return 'vendor-forms';
                          }
                          return undefined;
                      },
                  },
              },
        chunkSizeWarningLimit: 600,
    },
}));
