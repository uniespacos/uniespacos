<?php

declare(strict_types=1);

namespace App\Exceptions;

use DomainException;

abstract class DominioException extends DomainException
{
    /**
     * @param  array<string, string>  $substituicoes
     */
    protected static function traduzir(string $chave, array $substituicoes = []): string
    {
        return (string) __($chave, $substituicoes);
    }
}
