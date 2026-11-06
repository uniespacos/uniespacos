<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Broadcasting\Broadcasters\NullBroadcaster;

final class BroadcasterEmMemoria extends NullBroadcaster
{
    /** @var list<array{nome: string, payload: array<string, mixed>}> */
    public array $envios = [];

    /**
     * @param  array<int, mixed>  $channels
     * @param  array<string, mixed>  $payload
     */
    public function broadcast(array $channels, $event, array $payload = []): void
    {
        $this->envios[] = ['nome' => (string) $event, 'payload' => $payload];
    }
}
