<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Notifications\DatabaseNotification;

class NotificationService
{
    /**
     * @return Collection<int, DatabaseNotification>
     */
    public function getLatest(User $user, int $limit = 20): Collection
    {
        return $user->notifications()->latest()->limit($limit)->get();
    }

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
