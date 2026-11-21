<?php

declare(strict_types=1);

namespace App\Exceptions;

final class AndarComEspacosException extends DominioException
{
    public static function porNome(string $andar): self
    {
        return new self(self::traduzir("Cannot remove floor ':andar' because it already has spaces assigned.", ['andar' => $andar]));
    }
}
