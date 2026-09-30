<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReservaEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $action,
        public int $reservaId,
        public int $espacoId,
        public int $horariosCount,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel|PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('reserva-channel'),
            new PrivateChannel("App.Models.Espaco.{$this->espacoId}"),
        ];
    }

    public function broadcastAs()
    {
        return 'reserva-event';
    }

    /**
     * @return array<string, string|int>
     */
    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'reservaId' => $this->reservaId,
            'espacoId' => $this->espacoId,
            'horariosCount' => $this->horariosCount,
        ];
    }
}
