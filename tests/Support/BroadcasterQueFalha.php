<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Broadcasting\Broadcasters\NullBroadcaster;
use Illuminate\Broadcasting\BroadcastException;

final class BroadcasterQueFalha extends NullBroadcaster
{
    public int $tentativas = 0;

    /**
     * @param  array<int, mixed>  $channels
     * @param  array<string, mixed>  $payload
     */
    public function broadcast(array $channels, $event, array $payload = []): void
    {
        $this->tentativas++;

        throw new BroadcastException('Pusher error: cURL error 6: Could not resolve host: reverb');
    }
}
