<?php

declare(strict_types=1);

namespace App\Exceptions;

final class HorariosAusentesException extends DominioException
{
    public function __construct()
    {
        parent::__construct('horarios_solicitados deve ser um array não-vazio');
    }
}
