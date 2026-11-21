<?php

declare(strict_types=1);

namespace App\Enums\Reserva;

enum StatusAvaliacaoHorarioEnum: string
{
    // Slot do calendário ainda não decidido; a avaliação o grava como em_analise.
    case SOLICITADO = 'solicitado';
}
