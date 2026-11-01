<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class PrivacidadeController extends Controller
{
    public function __invoke(): Response
    {
        if (! config('privacidade.pagina_habilitada')) {
            abort(404);
        }

        return Inertia::render('Privacidade/PoliticaPrivacidadePage', [
            'versao' => config('privacidade.versao'),
            'data_versao' => config('privacidade.data_versao'),
        ]);
    }
}
