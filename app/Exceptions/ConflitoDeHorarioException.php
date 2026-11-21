<?php

declare(strict_types=1);

namespace App\Exceptions;

final class ConflitoDeHorarioException extends DominioException
{
    public function __construct(?string $mensagem = null)
    {
        parent::__construct($mensagem ?? self::traduzir('Conflict with another approved reservation at this time.'));
    }
}
