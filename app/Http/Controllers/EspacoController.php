<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ListarEspacosRequest;
use App\Models\Espaco;
use App\Services\EspacoService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class EspacoController extends Controller
{
    public function __construct(
        protected EspacoService $service,
    ) {}

    public function index(ListarEspacosRequest $request): Response
    {
        $user = Auth::user();
        $filters = $request->only(['search', 'unidade', 'modulo', 'andar', 'capacidade']);
        $instituicaoId = $user->setor->unidade->instituicao_id;

        $filterOptions = $this->service->getFilterOptions($instituicaoId);

        return Inertia::render('Espacos/EspacosPage', [
            'espacos' => $this->service->getPaginatedForPublic($instituicaoId, $filters)->withQueryString(),
            'unidades' => $filterOptions['unidades'],
            'modulos' => $filterOptions['modulos'],
            'andares' => $filterOptions['andares'],
            'capacidadeEspacos' => $filterOptions['capacidades'],
            'filters' => $filters,
            'user' => $user,
        ]);
    }

    public function show(Request $request, Espaco $espaco): Response|RedirectResponse
    {
        if (! $this->service->hasManager($espaco)) {
            return redirect()->route('espacos.index')
                ->with('error', 'Este espaço ainda não possui um gestor definido.');
        }

        $data = $this->service->getWithWeekSchedule($espaco, $request->input('semana', 'today'));

        return Inertia::render('Espacos/VisualizarEspacoPage', $data);
    }

    public function favoritar(Espaco $espaco): RedirectResponse
    {
        $this->service->addFavorite(Auth::user(), $espaco);

        return back()->with('success', 'Espaço adicionado aos favoritos!');
    }

    public function desfavoritar(Espaco $espaco): RedirectResponse
    {
        $this->service->removeFavorite(Auth::user(), $espaco);

        return back()->with('success', 'Espaço removido dos favoritos!');
    }

    public function meusFavoritos(): Response
    {
        $user = Auth::user();

        return Inertia::render('Espacos/FavoritosPage', [
            'favoritos' => $this->service->getFavoritedByUser($user, 10),
            'user' => $user,
        ]);
    }
}
