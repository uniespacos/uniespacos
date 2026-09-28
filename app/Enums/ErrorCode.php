<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Códigos de erro estáveis expostos nas respostas JSON.
 *
 * A ideia é o cliente ramificar por um identificador que não muda, em vez de
 * comparar o texto da mensagem — que é traduzível e reescrito à vontade.
 *
 * O conjunto é pequeno de propósito: só os erros que a aplicação realmente
 * produz. Código que ninguém emite vira documentação morta.
 */
enum ErrorCode: string
{
    case UNAUTHENTICATED = 'UNAUTHENTICATED';
    case FORBIDDEN = 'FORBIDDEN';
    case NOT_FOUND = 'NOT_FOUND';
    case METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED';
    case PAGE_EXPIRED = 'PAGE_EXPIRED';
    case VALIDATION_FAILED = 'VALIDATION_FAILED';
    case TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS';
    case BAD_REQUEST = 'BAD_REQUEST';
    case SERVER_ERROR = 'SERVER_ERROR';

    /**
     * Deriva o código do status HTTP já resolvido pelo framework.
     *
     * O status é usado como fonte, e não a classe da exceção, porque ele é o
     * resultado final depois de todo o tratamento do Laravel — várias exceções
     * distintas convergem para o mesmo status, e é o status que o cliente vê.
     */
    public static function fromStatus(int $status): self
    {
        return match ($status) {
            401 => self::UNAUTHENTICATED,
            403 => self::FORBIDDEN,
            404 => self::NOT_FOUND,
            405 => self::METHOD_NOT_ALLOWED,
            419 => self::PAGE_EXPIRED,
            422 => self::VALIDATION_FAILED,
            429 => self::TOO_MANY_REQUESTS,
            default => $status >= 500 ? self::SERVER_ERROR : self::BAD_REQUEST,
        };
    }
}
