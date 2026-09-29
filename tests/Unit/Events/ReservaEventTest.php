<?php

declare(strict_types=1);

namespace Tests\Unit\Events;

use App\Events\ReservaEvent;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReservaEventTest extends TestCase
{
    #[Test]
    public function broadcast_on_returns_array_of_channel_objects(): void
    {
        $event = new ReservaEvent(
            action: 'created',
            reservaId: 123,
            espacoId: 456,
            horariosCount: 5
        );

        $channels = $event->broadcastOn();

        $this->assertIsArray($channels);
        $this->assertCount(2, $channels);

        // Validar primeiro canal: público
        $this->assertInstanceOf(Channel::class, $channels[0]);
        $this->assertNotInstanceOf(PrivateChannel::class, $channels[0]);
        $this->assertSame('reserva-channel', $channels[0]->name);

        // Validar segundo canal: privado (o próprio construtor de PrivateChannel
        // acrescenta o prefixo 'private-', então name inclui esse prefixo)
        $this->assertInstanceOf(PrivateChannel::class, $channels[1]);
        $this->assertSame('private-App.Models.Espaco.456', $channels[1]->name);
    }

    #[Test]
    public function broadcast_as_returns_expected_event_name(): void
    {
        $event = new ReservaEvent(
            action: 'updated',
            reservaId: 789,
            espacoId: 12,
            horariosCount: 3
        );

        $this->assertSame('reserva-event', $event->broadcastAs());
    }
}
