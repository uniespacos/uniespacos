<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Http\Controllers\Concerns\RespondeComFlash;
use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\ListarUnidadesRequest;
use App\Http\Requests\StoreUnidadeRequest;
use App\Http\Requests\UpdateUnidadeRequest;
use App\Models\Unidade;
use App\Services\UnidadeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class InstitucionalUnidadeController extends Controller
{
    use RespondeComFlash;

    public function __construct(
        protected UnidadeService $service,
    ) {}

    public function index(ListarUnidadesRequest $request): Response
    {
        $this->authorize('viewAny', Unidade::class);

        $instituicaoId = Auth::user()?->instituicaoId() ?? abort(403);
        $validated = $request->validated();
        $search = $validated['search'] ?? null;

        $unidades = $this->service->paginate($instituicaoId, 10, $search);
        $unidades->withQueryString();

        return Inertia::render('Administrativo/Unidades/Unidades', [
            'unidades' => $unidades,
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Administrativo/Unidades/CadastrarUnidade', [
            'instituicao' => Auth::user()?->instituicao() ?? abort(403),
        ]);
    }

    public function store(StoreUnidadeRequest $request): RedirectResponse
    {
        $this->authorize('create', Unidade::class);

        return $this->executar(
            fn () => $this->service->store($request->validated()),
            __('Unit created successfully.'),
            'Error creating unit: :message',
            rotaSucesso: 'institucional.unidades.index',
            rotaErro: 'institucional.unidades.index',
        );
    }

    public function edit(Unidade $unidade): Response
    {
        $this->authorize('update', $unidade);

        return Inertia::render('Administrativo/Unidades/EditarUnidade', [
            'instituicao' => Auth::user()?->instituicao() ?? abort(403),
            'unidade' => $unidade,
        ]);
    }

    public function update(UpdateUnidadeRequest $request, Unidade $unidade): RedirectResponse
    {
        $this->authorize('update', $unidade);

        return $this->executar(
            fn () => $this->service->update($unidade, $request->validated()),
            __('Unit updated successfully.'),
            'Error updating unit: :message',
            rotaSucesso: 'institucional.unidades.index',
            comEntrada: true,
        );
    }

    public function destroy(ConfirmPasswordRequest $request, Unidade $unidade): RedirectResponse
    {
        $this->authorize('delete', $unidade);

        if (! $request->passwordMatches()) {
            return back()->with('error', __('The password provided is incorrect.'));
        }

        return $this->executar(
            fn () => $this->service->delete($unidade),
            __('Unit deleted successfully.'),
            'Error deleting unit: :message',
        );
    }
}
