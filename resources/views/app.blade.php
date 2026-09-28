<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => (request()->cookie('appearance', 'light')) == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">
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
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/presentation/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
