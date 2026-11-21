<?php

declare(strict_types=1);

namespace App\Exceptions;

final class EmailJaVerificadoException extends DominioException
{
    public function __construct(?string $mensagem = null)
    {
        parent::__construct($mensagem ?? self::traduzir('This email address has already been verified.'));
    }
}
