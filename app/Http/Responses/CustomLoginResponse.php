<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Fortify;
use Symfony\Component\HttpFoundation\Response;

class CustomLoginResponse implements LoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * @param  Request  $request
     * @return Response
     */
    public function toResponse($request)
    {
        // Check if there's an intended email verification URL in the session
        if (Session::has('url.email-verification.intended')) {
            $intendedUrl = Session::pull('url.email-verification.intended');
            Log::info('Login com verificação de e-mail pendente, redirecionando para a verificação', ['user_id' => Auth::id()]);

            return redirect()->to($intendedUrl);
        }

        // Otherwise, proceed with the default Fortify redirect
        return $request->wantsJson()
            ? response()->json(['two_factor' => false])
            : redirect()->intended(Fortify::redirects('login'));
    }
}
