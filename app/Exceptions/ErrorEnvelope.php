<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Enums\ErrorCode;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Acrescenta `error_code` e `details` às respostas de erro JSON.
 *
 * O envelope é ADITIVO por necessidade, não por preferência. Dois consumidores
 * dependem do formato atual do Laravel:
 *
 *  - resources/js/hooks/use-gerar-relatorio.ts lê `data.message` na raiz em 422;
 *    aninhar a mensagem mataria o toast de erro em silêncio.
 *  - o useForm do Inertia depende do bag `errors` em todo formulário do app.
 *
 * Por isso nada é movido nem removido: os campos novos entram ao lado dos que
 * já existem.
 */
final class ErrorEnvelope
{
    /**
     * Devolve a resposta com os campos do envelope, quando aplicável.
     *
     * Só respostas JSON de erro são tocadas. Respostas de sucesso e formatos
     * não-JSON (downloads de relatório, por exemplo) passam intactos.
     */
    public static function apply(Response $response): Response
    {
        if (! $response instanceof JsonResponse) {
            return $response;
        }

        $status = $response->getStatusCode();

        if ($status < 400) {
            return $response;
        }

        $payload = $response->getData(true);

        if (! is_array($payload)) {
            return $response;
        }

        // Um error_code já presente vence: se algum ponto da aplicação montou a
        // resposta deliberadamente, não é papel deste handler sobrescrever.
        $payload['error_code'] ??= ErrorCode::fromStatus($status)->value;
        $payload['details'] ??= $payload['errors'] ?? null;

        $response->setData($payload);

        return $response;
    }
}
