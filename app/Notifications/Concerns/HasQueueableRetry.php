<?php

declare(strict_types=1);

namespace App\Notifications\Concerns;

trait HasQueueableRetry
{
    public int $tries = 5;

    /**
     * @return array<int>
     */
    public function backoff(): array
    {
        return [30, 60, 120, 300];
    }
}
