<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;
use PDOException;
use Throwable;

final class MensagemDeErro
{
    public const GENERICA = 'ocorreu uma falha interna. Tente novamente.';

    /**
     * @param  array<string, mixed>  $contexto
     */
    public static function paraUsuario(Throwable $e, array $contexto = []): string
    {
        if (! self::ehFalhaDeInfraestrutura($e)) {
            return $e->getMessage();
        }

        Log::error('Falha de infraestrutura ao processar ação do usuário', $contexto + ['exception' => $e]);

        return self::GENERICA;
    }

    private static function ehFalhaDeInfraestrutura(Throwable $e): bool
    {
        return $e instanceof QueryException || $e instanceof PDOException;
    }
}
