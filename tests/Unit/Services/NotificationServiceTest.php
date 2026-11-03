<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotificationServiceTest extends TestCase
{
    private NotificationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new NotificationService;
    }

    public function test_mark_as_read_without_ids_marks_all_unread(): void
    {
        $user = User::factory()->create();

        // Create 3 unread notifications
        $notification1 = $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao 1'],
            'read_at' => null,
        ]);

        $notification2 = $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao 2'],
            'read_at' => null,
        ]);

        $notification3 = $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao 3'],
            'read_at' => null,
        ]);

        $this->service->markAsRead($user);

        // Refresh from database
        $notification1->refresh();
        $notification2->refresh();
        $notification3->refresh();

        $this->assertNotNull($notification1->read_at);
        $this->assertNotNull($notification2->read_at);
        $this->assertNotNull($notification3->read_at);
    }

    public function test_mark_as_read_with_ids_marks_only_specified_notification(): void
    {
        $user = User::factory()->create();

        // Create 3 unread notifications
        $notification1 = $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao 1'],
            'read_at' => null,
        ]);

        $notification2 = $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao 2'],
            'read_at' => null,
        ]);

        $notification3 = $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao 3'],
            'read_at' => null,
        ]);

        $this->service->markAsRead($user, [$notification1->id]);

        // Refresh from database
        $notification1->refresh();
        $notification2->refresh();
        $notification3->refresh();

        $this->assertNotNull($notification1->read_at);
        $this->assertNull($notification2->read_at);
        $this->assertNull($notification3->read_at);
    }

    public function test_mark_as_read_prevents_idor_attack(): void
    {
        $attacker = User::factory()->create();
        $victim = User::factory()->create();

        // Create unread notification for the victim
        $victimNotification = $victim->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao da vitima'],
            'read_at' => null,
        ]);

        // Create unread notification for the attacker
        $attackerNotification = $attacker->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao do atacante'],
            'read_at' => null,
        ]);

        // Attacker tries to mark the victim's notification as read
        // Protection is structural: $user->unreadNotifications already limits to the user's own
        // notifications, so even if the attacker passes the victim's notification id, it won't be found
        $this->service->markAsRead($attacker, [$victimNotification->id]);

        // Refresh from database
        $victimNotification->refresh();
        $attackerNotification->refresh();

        // The victim's notification should still be unread
        $this->assertNull($victimNotification->read_at);
        // The attacker's notification should also still be unread (not included in the ids)
        $this->assertNull($attackerNotification->read_at);
    }
}
