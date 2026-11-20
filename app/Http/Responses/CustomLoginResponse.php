<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
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
        if (Session::has('url.email-verification.intended')) {
            $intendedUrl = $this->normalizarEsquemaUrlIntencionada(Session::pull('url.email-verification.intended'));
            Log::info('Login com verificação de e-mail pendente, redirecionando para a verificação', ['user_id' => Auth::id()]);

            return redirect()->to($intendedUrl);
        }

        if (Session::has('url.intended')) {
            Session::put(
                'url.intended',
                $this->normalizarEsquemaUrlIntencionada(Session::get('url.intended'))
            );
        }

        return $request->wantsJson()
            ? response()->json(['two_factor' => false])
            : redirect()->intended(Fortify::redirects('login'));
    }

    private function normalizarEsquemaUrlIntencionada(mixed $valor): string
    {
        $url = is_string($valor) ? $valor : '';
        $deveForcarHttps = app()->environment('production')
            || str_starts_with(Config::string('app.url', ''), 'https://');

        if ($deveForcarHttps && str_starts_with($url, 'http://')) {
            return 'https://'.substr($url, strlen('http://'));
        }

        return $url;
    }
}
