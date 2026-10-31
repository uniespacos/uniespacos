<?php

declare(strict_types=1);

namespace App\Exceptions;

use DomainException;

final class ContaNaoPodeSerAnonimizadaException extends DomainException
{
    public static function gestorDeAgenda(): self
    {
        return new self((string) __('This account cannot be deleted while it manages a schedule. Ask the institutional team to remove the schedule management first.'));
    }
}
