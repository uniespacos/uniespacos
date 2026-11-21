<?php

declare(strict_types=1);

namespace App\Support;

use App\Exceptions\DominioException;
use Illuminate\Support\Facades\Log;
use Throwable;

final class MensagemDeErro
{
    public const GENERICA = 'an internal error occurred. Please try again.';

    /**
     * @param  array<string, mixed>  $contexto
     * @param  bool  $registrar  Passe false quando o chamador já registra a exceção, para não duplicar o log.
     */
    public static function paraUsuario(Throwable $e, array $contexto = [], bool $registrar = true): string
    {
        if ($e instanceof DominioException) {
            return $e->getMessage();
        }

        if ($registrar) {
            Log::error('Falha não tratada ao processar ação do usuário', $contexto + ['exception' => $e]);
        }

        return __(self::GENERICA);
    }
}
