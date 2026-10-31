<?php

declare(strict_types=1);

namespace App\Exceptions;

use DomainException;

final class ContaNaoPodeSerAnonimizadaException extends DomainException
{
    public static function gestorDeAgenda(): self
    {
        return new self('Não é possível excluir esta conta enquanto ela for gestora de agenda. Peça ao institucional para remover a gestão das agendas antes.');
    }
}
