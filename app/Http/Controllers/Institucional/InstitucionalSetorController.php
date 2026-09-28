<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\ListarSetoresRequest;
use App\Http\Requests\StoreSetorRequest;
use App\Http\Requests\UpdateSetorRequest;
use App\Models\Setor;
use App\Services\SetorService;
use App\Services\UnidadeService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class InstitucionalSetorController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected SetorService $service,
        protected UnidadeService $unidadeService,
    ) {}

    public function index(ListarSetoresRequest $request): Response
    {
        $this->authorize('viewAny', Setor::class);

        $user = Auth::user();
        $instituicao = $user->setor->unidade->instituicao->load(['unidades']);
        $instituicaoId = $instituicao->id;
        $validated = $request->validated();
        $search = $validated['search'] ?? null;
        $unidadeId = isset($validated['unidade_id']) ? (int) $validated['unidade_id'] : null;

        $setores = $this->service->paginate($instituicaoId, 10, $search, $unidadeId);
        $setores->withQueryString();

        return Inertia::render('Administrativo/Setores/Setores', [
            'instituicao' => $instituicao,
            'unidades' => $this->unidadeService->getAllByInstituicao($instituicaoId)->load(['setors']),
            'setores' => $setores,
            'filters' => [
                'search' => $search,
                'unidade_id' => $unidadeId,
            ],
        ]);
    }

    public function usuarios(Setor $setor): JsonResponse
    {
        $this->authorize('view', $setor);

        $usuarios = $setor->users()
            ->select(['id', 'name', 'email', 'telefone', 'profile_pic', 'email_verified_at', 'setor_id'])
            ->get();

        return response()->json($usuarios);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('institucional.setors.index')
            ->with('error', 'A criação de setores é a partir do painel administrativo de setores.');
    }

    public function store(StoreSetorRequest $request): RedirectResponse
    {
        $this->authorize('create', Setor::class);

        try {
            $this->service->store($request->validated());

            return redirect()->route('institucional.setors.index')
                ->with('success', 'Setor cadastrado com sucesso!');
        } catch (\Exception $e) {
            return back()->with(['error' => 'Erro ao cadastrar setor: '.$e->getMessage()])->withInput();
        }
    }

    public function edit(Setor $setor): RedirectResponse
    {
        return redirect()->route('institucional.setors.index')
            ->with('error', 'A edição de setores é a partir do painel administrativo de setores.');
    }

    public function update(UpdateSetorRequest $request, Setor $setor): RedirectResponse
    {
        $this->authorize('update', $setor);

        try {
            $this->service->update($setor, $request->validated());

            return back()->with('success', 'Setor atualizado com sucesso!');
        } catch (\Exception $e) {
            return back()->with(['error' => 'Erro ao atualizar setor: '.$e->getMessage()])->withInput();
        }
    }

    public function destroy(ConfirmPasswordRequest $request, Setor $setor): RedirectResponse
    {
        $this->authorize('delete', $setor);

        if (! $request->passwordMatches()) {
            return back()->with('error', 'A senha fornecida está incorreta.');
        }

        try {
            $this->service->delete($setor);

            return back()->with('success', 'Setor removido com sucesso!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Erro ao remover setor: '.$e->getMessage()]);
        }
    }
}
