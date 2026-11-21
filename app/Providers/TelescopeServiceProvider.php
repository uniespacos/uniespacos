<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    /**
     * Telescope is only loaded in the local environment.
     */
    public function register(): void
    {
        if (! $this->app->environment('development')) {
            return;
        }

        $this->hideSensitiveRequestDetails();

        Telescope::filter(fn (IncomingEntry $entry) => true);
    }

    /**
     * Prevent sensitive request details from being logged by Telescope.
     */
    protected function hideSensitiveRequestDetails(): void
    {
        Telescope::hideRequestParameters(['_token']);

        Telescope::hideRequestHeaders([
            'cookie',
            'x-csrf-token',
            'x-xsrf-token',
        ]);
    }

    /**
     * Register the Telescope gate.
     * Access is restricted to users with the 'sistema.telescope' permission.
     */
    protected function gate(): void
    {
        Gate::define('viewTelescope', fn (User $user) => $user->hasPermissionTo('sistema.telescope'));
    }
}
