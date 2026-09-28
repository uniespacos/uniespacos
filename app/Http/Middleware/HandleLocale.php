<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HandleLocale
{
    public const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'];

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->session()->get('locale');

        if ($locale && in_array($locale, self::SUPPORTED_LOCALES, true)) {
            app()->setLocale($locale === 'pt-BR' ? 'pt_BR' : $locale);
        }

        return $next($request);
    }
}
