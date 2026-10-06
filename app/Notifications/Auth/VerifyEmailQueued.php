<?php

declare(strict_types=1);

namespace App\Notifications\Auth;

use App\Notifications\Concerns\HasQueueableRetry;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

class VerifyEmailQueued extends VerifyEmail implements ShouldQueue
{
    use HasQueueableRetry, Queueable;
}
