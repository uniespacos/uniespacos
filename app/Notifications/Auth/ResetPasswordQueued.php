<?php

declare(strict_types=1);

namespace App\Notifications\Auth;

use App\Notifications\Concerns\HasQueueableRetry;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

class ResetPasswordQueued extends ResetPassword implements ShouldQueue
{
    use HasQueueableRetry, Queueable;
}
