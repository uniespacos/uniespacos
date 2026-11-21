<?php

declare(strict_types=1);

namespace App\Enums\Reserva;

enum EscopoEdicaoEnum: string
{
    case SINGLE = 'single';
    case RECURRING = 'recurring';
}
