<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Notifications\DatabaseNotification;
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

    public function test_get_latest_returns_only_notifications_of_the_user(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        // Create 3 notifications for the owner
        for ($i = 0; $i < 3; $i++) {
            $owner->notifications()->create([
                'id' => (string) Str::uuid(),
                'type' => 'App\\Notifications\\ReservationCreatedNotification',
                'data' => ['titulo' => "Notificacao {$i}"],
                'read_at' => null,
            ]);
        }

        // Create 2 notifications for the other user
        for ($i = 0; $i < 2; $i++) {
            $otherUser->notifications()->create([
                'id' => (string) Str::uuid(),
                'type' => 'App\\Notifications\\ReservationCreatedNotification',
                'data' => ['titulo' => "Notificacao {$i}"],
                'read_at' => null,
            ]);
        }

        $result = $this->service->getLatest($owner);

        $this->assertCount(3, $result);
        foreach ($result as $notification) {
            $this->assertSame($owner->id, $notification->notifiable_id);
        }
    }

    public function test_get_latest_respects_limit(): void
    {
        $user = User::factory()->create();

        // Create 5 notifications
        for ($i = 0; $i < 5; $i++) {
            $user->notifications()->create([
                'id' => (string) Str::uuid(),
                'type' => 'App\\Notifications\\ReservationCreatedNotification',
                'data' => ['titulo' => "Notificacao {$i}"],
                'read_at' => null,
            ]);
        }

        $result = $this->service->getLatest($user, 2);

        $this->assertCount(2, $result);
    }

    public function test_get_latest_returns_newest_first(): void
    {
        $user = User::factory()->create();

        // Create notifications with distinct created_at times
        $notification1 = $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao 1'],
            'read_at' => null,
            'created_at' => now()->subMinutes(2),
        ]);

        $notification2 = $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao 2'],
            'read_at' => null,
            'created_at' => now()->subMinutes(1),
        ]);

        $notification3 = $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\ReservationCreatedNotification',
            'data' => ['titulo' => 'Notificacao 3'],
            'read_at' => null,
            'created_at' => now(),
        ]);

        $result = $this->service->getLatest($user);

        $this->assertCount(3, $result);
        $items = $result->values();
        /** @var DatabaseNotification $first */
        $first = $items->get(0);
        /** @var DatabaseNotification $second */
        $second = $items->get(1);
        /** @var DatabaseNotification $third */
        $third = $items->get(2);
        $this->assertSame($notification3->id, $first->id);
        $this->assertSame($notification2->id, $second->id);
        $this->assertSame($notification1->id, $third->id);
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
