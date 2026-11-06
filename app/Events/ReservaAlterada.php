<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;

class ReservaAlterada
{
    use Dispatchable;

    public const ACOES_QUE_ALTERAM_RELATORIOS = ['created', 'updated', 'evaluated', 'canceled'];

    public function __construct(
        public string $acao,
        public int $reservaId,
    ) {}
}
