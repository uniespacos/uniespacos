<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationCreatedNotification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BaseNotificationRetryTest extends TestCase
{
    use DatabaseTransactions;

    public function test_notification_has_correct_tries_count(): void
    {
        $user = User::factory()->create();
        $reserva = Reserva::factory()->create();

        $notification = new ReservationCreatedNotification($reserva);

        $this->assertEquals(5, $notification->tries);
    }

    public function test_notification_has_correct_backoff_delays(): void
    {
        $user = User::factory()->create();
        $reserva = Reserva::factory()->create();

        $notification = new ReservationCreatedNotification($reserva);
        $backoff = $notification->backoff();

        $expectedBackoff = [30, 60, 120, 300];

        $this->assertEquals($expectedBackoff, $backoff);
    }

    public function test_notification_backoff_is_array_of_integers(): void
    {
        $user = User::factory()->create();
        $reserva = Reserva::factory()->create();

        $notification = new ReservationCreatedNotification($reserva);
        $backoff = $notification->backoff();

        $this->assertIsArray($backoff);
        $this->assertNotEmpty($backoff);

        foreach ($backoff as $delay) {
            $this->assertIsInt($delay);
            $this->assertGreaterThan(0, $delay);
        }
    }
}
