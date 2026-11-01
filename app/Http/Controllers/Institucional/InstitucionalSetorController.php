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
use App\Support\MensagemDeErro;
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
            ->with('error', __('Sector creation is done from the sectors administration panel.'));
    }

    public function store(StoreSetorRequest $request): RedirectResponse
    {
        $this->authorize('create', Setor::class);

        try {
            $this->service->store($request->validated());

            return redirect()->route('institucional.setors.index')
                ->with('success', __('Sector registered successfully!'));
        } catch (\Exception $e) {
            return back()->with(['error' => __('Error creating sector: :message', ['message' => MensagemDeErro::paraUsuario($e)])])->withInput();
        }
    }

    public function edit(Setor $setor): RedirectResponse
    {
        return redirect()->route('institucional.setors.index')
            ->with('error', __('Sector editing is done from the sectors administration panel.'));
    }

    public function update(UpdateSetorRequest $request, Setor $setor): RedirectResponse
    {
        $this->authorize('update', $setor);

        try {
            $this->service->update($setor, $request->validated());

            return back()->with('success', __('Sector updated successfully!'));
        } catch (\Exception $e) {
            return back()->with(['error' => __('Error updating sector: :message', ['message' => MensagemDeErro::paraUsuario($e)])])->withInput();
        }
    }

    public function destroy(ConfirmPasswordRequest $request, Setor $setor): RedirectResponse
    {
        $this->authorize('delete', $setor);

        if (! $request->passwordMatches()) {
            return back()->with('error', __('The password provided is incorrect.'));
        }

        try {
            $this->service->delete($setor);

            return back()->with('success', __('Sector removed successfully!'));
        } catch (\Exception $e) {
            return back()->withErrors(['error' => __('Error removing sector: :message', ['message' => MensagemDeErro::paraUsuario($e)])]);
        }
    }
}
