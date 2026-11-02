<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Database\Connection;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\Log;

final class LogDeConsulta
{
    private const AMBIENTES_PERMITIDOS = ['local', 'development'];

    public static function configurar(string $ambiente, bool $flagLigada, Connection $conexao): void
    {
        if (! $flagLigada || ! in_array($ambiente, self::AMBIENTES_PERMITIDOS, true)) {
            return;
        }

        $conexao->listen(fn (QueryExecuted $query) => Log::info($query->sql, $query->bindings));
    }
}
