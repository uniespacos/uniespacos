<?php

declare(strict_types=1);

namespace App\Exceptions;

final class ReservaArquivadaException extends DominioException
{
    public function __construct(?string $mensagem = null)
    {
        parent::__construct($mensagem ?? self::traduzir('This reservation is archived and can no longer be changed.'));
    }
}
