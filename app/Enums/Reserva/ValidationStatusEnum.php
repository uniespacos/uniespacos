<?php

declare(strict_types=1);

namespace App\Enums\Reserva;

enum ValidationStatusEnum: string
{
    case PENDING = 'pending';
    case PROCESSING = 'processing';
    case COMPLETED = 'completed';
    case FAILED = 'failed';
}
