<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => function () {
                [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

                return ['message' => trim($message), 'author' => trim($author)];
            },
            'auth' => [
                'user' => fn () => $request->user() ? $this->formatAuthUser($request->user()) : null,
            ],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'sidebarOpen' => $request->cookie('sidebar_state') === 'true',
            'locale' => fn () => app()->getLocale(),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'info' => fn () => $request->session()->get('info'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
            'notifications' => fn () => $request->user()
                ? $request->user()->notifications()->limit(15)->get()
                : [],
        ];
    }

    private function formatAuthUser($user): array
    {
        $user->load(['setor', 'unreadNotifications']);

        return array_merge($user->toArray(), [
            'unread_notifications_count' => $user->unreadNotifications->count(),
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'direct_permissions' => $user->getDirectPermissions()->pluck('name'),
        ]);
    }
}
