<?php

declare(strict_types=1);

namespace App\Exceptions;

final class AutorizacaoDeJobException extends DominioException
{
    public function __construct(?string $mensagem = null)
    {
        parent::__construct($mensagem ?? self::traduzir('You are not authorized to act on the requested time slots.'));
    }
}
