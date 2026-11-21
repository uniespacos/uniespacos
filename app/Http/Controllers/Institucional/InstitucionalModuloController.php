<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Http\Controllers\Concerns\RespondeComFlash;
use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\ListarModulosRequest;
use App\Http\Requests\StoreModuloRequest;
use App\Http\Requests\UpdateModuloRequest;
use App\Models\Modulo;
use App\Services\ModuloService;
use App\Services\UnidadeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class InstitucionalModuloController extends Controller
{
    use RespondeComFlash;

    public function __construct(
        protected ModuloService $service,
        protected UnidadeService $unidadeService,
    ) {}

    public function index(ListarModulosRequest $request): Response
    {
        $this->authorize('viewAny', Modulo::class);

        $instituicaoId = Auth::user()?->instituicaoId() ?? abort(403);
        $validated = $request->validated();
        $search = $validated['search'] ?? null;
        $unidade = $validated['unidade'] ?? null;

        $modulos = $this->service->paginate($instituicaoId, 10, $search, $unidade);
        $modulos->withQueryString();

        $unidades = $this->unidadeService->getAllByInstituicao($instituicaoId);

        return Inertia::render('Administrativo/Modulos/Modulos', [
            'modulos' => $modulos,
            'unidades' => $unidades,
            'filters' => [
                'search' => $search,
                'unidade' => $unidade,
            ],
        ]);
    }

    public function create(): Response
    {
        $instituicao = Auth::user()?->instituicao() ?? abort(403);

        return Inertia::render('Administrativo/Modulos/CadastrarModulo', [
            'instituicao' => $instituicao,
            'unidades' => $this->unidadeService->getAllByInstituicao($instituicao->id),
        ]);
    }

    public function store(StoreModuloRequest $request): RedirectResponse
    {
        $this->authorize('create', Modulo::class);

        return $this->executar(
            fn () => $this->service->store($request->validated()),
            __('Module created successfully!'),
            'Error creating module: :message',
            rotaSucesso: 'institucional.modulos.index',
            comEntrada: true,
        );
    }

    public function edit(Modulo $modulo): Response
    {
        $this->authorize('update', $modulo);

        $instituicao = Auth::user()?->instituicao() ?? abort(403);

        $modulo->load(['andars', 'unidade.instituicao']);

        return Inertia::render('Administrativo/Modulos/EditarModulo', [
            'instituicao' => $instituicao,
            'unidades' => $this->unidadeService->getAllByInstituicao($instituicao->id),
            'modulo' => $modulo,
        ]);
    }

    public function update(UpdateModuloRequest $request, Modulo $modulo): RedirectResponse
    {
        $this->authorize('update', $modulo);

        return $this->executar(
            fn () => $this->service->update($modulo, $request->validated()),
            __('Module updated successfully!'),
            'Error updating module: :message',
            rotaSucesso: 'institucional.modulos.index',
            comEntrada: true,
        );
    }

    public function destroy(ConfirmPasswordRequest $request, Modulo $modulo): RedirectResponse
    {
        $this->authorize('delete', $modulo);

        if (! $request->passwordMatches()) {
            return back()->with('error', __('The password provided is incorrect.'));
        }

        return $this->executar(
            fn () => $this->service->delete($modulo),
            __('Module removed successfully!'),
            'Error removing module: :message',
        );
    }
}
