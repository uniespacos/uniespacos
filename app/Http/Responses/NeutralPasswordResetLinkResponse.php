<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse as FailedPasswordResetLinkRequestResponseContract;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse as SuccessfulPasswordResetLinkRequestResponseContract;
use Symfony\Component\HttpFoundation\Response;

class NeutralPasswordResetLinkResponse implements FailedPasswordResetLinkRequestResponseContract, SuccessfulPasswordResetLinkRequestResponseContract
{
    /**
     * Mesma resposta para qualquer status do broker (enviado, usuário inexistente ou
     * throttled), para que o formulário não revele se o e-mail possui conta.
     *
     * @param  Request  $request
     */
    public function toResponse($request): Response
    {
        $mensagem = __('If an account exists with this email, we will send a link to reset your password.');

        return $request->wantsJson()
            ? new JsonResponse(['message' => $mensagem])
            : back()->with('status', $mensagem);
    }
}
