<?php

declare(strict_types=1);

namespace App\Enums\Reserva;

enum RecorrenciaReservaEnum: string
{
    case UNICA = 'unica';
    case QUINZE_DIAS = '15dias';
    case UM_MES = '1mes';
    case PERSONALIZADO = 'personalizado';
}
