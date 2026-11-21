<?php

declare(strict_types=1);

namespace App\Exceptions;

final class EscopoInvalidoException extends DominioException
{
    public function __construct(?string $mensagem = null)
    {
        parent::__construct($mensagem ?? self::traduzir('The requested scope is not valid for this action.'));
    }
}
