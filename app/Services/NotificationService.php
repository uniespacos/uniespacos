<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;

class NotificationService
{
    /**
     * @param  array<int, string>|null  $ids
     */
    public function markAsRead(User $user, ?array $ids = null): void
    {
        if (! empty($ids)) {
            $user->unreadNotifications->whereIn('id', $ids)->markAsRead();
        } else {
            $user->unreadNotifications->markAsRead();
        }
    }
}
