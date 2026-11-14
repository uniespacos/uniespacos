<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => (request()->cookie('appearance', 'light')) == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="text-scale" content="scale">
        <meta name="color-scheme" content="light dark">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <!-- PWA Web App Manifest e iOS Support -->
        <link rel="manifest" href="/manifest.json">
        <meta name="theme-color" content="#1e1e2e" media="(prefers-color-scheme: dark)">
        <meta name="theme-color" content="#eff1f5" media="(prefers-color-scheme: light)">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="UniEspaços">
        <link rel="apple-touch-icon" href="/favicon.ico">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const cookieAppearance = '{{ request()->cookie('appearance', 'light') }}';
                const localAppearance = typeof localStorage !== 'undefined' ? localStorage.getItem('appearance') : null;
                const appearance = localAppearance || cookieAppearance || 'light';

                if (appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }

                const meta = document.querySelector('meta[name="color-scheme"]');
                if (meta) {
                    meta.setAttribute('content', appearance === 'system' ? 'light dark' : (appearance === 'dark' ? 'dark' : 'light'));
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                color-scheme: light;
                background-color: oklch(0.96 0.008 250);
            }

            html.dark {
                color-scheme: dark;
                background-color: oklch(0.28 0.025 265);
            }
        </style>

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/presentation/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
