<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\ListarModulosRequest;
use App\Http\Requests\StoreModuloRequest;
use App\Http\Requests\UpdateModuloRequest;
use App\Models\Modulo;
use App\Services\ModuloService;
use App\Services\UnidadeService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class InstitucionalModuloController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected ModuloService $service,
        protected UnidadeService $unidadeService,
    ) {}

    public function index(ListarModulosRequest $request): Response
    {
        $this->authorize('viewAny', Modulo::class);

        $instituicaoId = Auth::user()->setor->unidade->instituicao_id;
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
        $user = Auth::user();
        $instituicao = $user->setor->unidade->instituicao;

        return Inertia::render('Administrativo/Modulos/CadastrarModulo', [
            'instituicao' => $instituicao,
            'unidades' => $this->unidadeService->getAllByInstituicao($instituicao->id),
        ]);
    }

    public function store(StoreModuloRequest $request): RedirectResponse
    {
        $this->authorize('create', Modulo::class);

        try {
            $this->service->store($request->validated());

            return redirect()->route('institucional.modulos.index')
                ->with('success', 'Módulo cadastrado com sucesso!');
        } catch (\Exception $e) {
            return back()->with(['error' => 'Erro ao cadastrar módulo: '.$e->getMessage()])->withInput();
        }
    }

    public function edit(Modulo $modulo): Response
    {
        $user = Auth::user();
        $instituicao = $user->setor->unidade->instituicao;

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

        try {
            $this->service->update($modulo, $request->validated());

            return redirect()->route('institucional.modulos.index')
                ->with('success', 'Módulo atualizado com sucesso!');
        } catch (\Exception $e) {
            return back()->with(['error' => 'Erro ao atualizar módulo: '.$e->getMessage()])->withInput();
        }
    }

    public function destroy(ConfirmPasswordRequest $request, Modulo $modulo): RedirectResponse
    {
        $this->authorize('delete', $modulo);

        if (! $request->passwordMatches()) {
            return back()->with('error', 'A senha fornecida está incorreta.');
        }

        try {
            $this->service->delete($modulo);

            return back()->with('success', 'Módulo removido com sucesso!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Erro ao remover módulo: '.$e->getMessage()]);
        }
    }
}
