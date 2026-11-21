<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;
use Symfony\Component\HttpFoundation\Response;

class CustomVerifyEmailResponse implements VerifyEmailResponseContract
{
    /**
     * @param  Request  $request
     * @return Response
     */
    public function toResponse($request)
    {
        Log::info('Verification hit', [
            'user_id' => Auth::id(),
            'scheme' => $request->getScheme(),
            'is_secure' => $request->isSecure(),
        ]);

        if (! Auth::check()) {
            Log::info('Unauthenticated user hit verification link, redirecting to login');
            Session::put('url.email-verification.intended', $request->fullUrl());

            return redirect()->guest(route('login'));
        }

        Log::info('Authenticated user verified, redirecting to dashboard', ['user_id' => Auth::id()]);

        return $request->wantsJson()
            ? new JsonResponse('', 204)
            : redirect('/dashboard?verified=1');
    }
}
