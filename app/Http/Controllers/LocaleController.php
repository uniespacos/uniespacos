<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocaleController extends Controller
{
    public const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'];

    public function update(Request $request, string $locale): RedirectResponse
    {
        if (in_array($locale, self::SUPPORTED_LOCALES, true)) {
            $request->session()->put('locale', $locale);
            app()->setLocale($locale === 'pt-BR' ? 'pt_BR' : $locale);
        }

        return back();
    }
}
