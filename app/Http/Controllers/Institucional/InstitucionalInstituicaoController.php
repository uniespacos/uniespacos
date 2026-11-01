<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\ListarInstituicoesRequest;
use App\Http\Requests\StoreInstituicaoRequest;
use App\Http\Requests\UpdateInstituicaoRequest;
use App\Models\Instituicao;
use App\Services\InstituicaoService;
use App\Support\MensagemDeErro;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class InstitucionalInstituicaoController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected InstituicaoService $service,
    ) {}

    public function index(ListarInstituicoesRequest $request): Response
    {
        $this->authorize('viewAny', Instituicao::class);

        $validated = $request->validated();
        $search = $validated['search'] ?? null;
        $instituicoes = $this->service->paginate(10, $search);
        $instituicoes->withQueryString();

        return Inertia::render('Administrativo/Instituicoes/Instituicoes', [
            'instituicoes' => $instituicoes,
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Administrativo/Instituicoes/CadastrarInstituicao');
    }

    public function store(StoreInstituicaoRequest $request): RedirectResponse
    {
        $this->authorize('create', Instituicao::class);

        $this->service->store($request->validated());

        return redirect()->route('institucional.instituicoes.index')
            ->with('success', __('Institution created successfully.'));
    }

    public function edit(Instituicao $instituico): Response
    {
        return Inertia::render('Administrativo/Instituicoes/EditarInstituicao', [
            'instituicao' => $instituico,
        ]);
    }

    public function update(UpdateInstituicaoRequest $request, Instituicao $instituico): RedirectResponse
    {
        $this->authorize('update', $instituico);

        try {
            $this->service->update($instituico, $request->validated());

            return redirect()->route('institucional.instituicoes.index')
                ->with('success', __('Institution updated successfully.'));
        } catch (\Throwable $th) {
            return back()->withInput()->with('error', __('Error updating institution: :message', ['message' => MensagemDeErro::paraUsuario($th)]));
        }
    }

    public function destroy(ConfirmPasswordRequest $request, Instituicao $instituico): RedirectResponse
    {
        $this->authorize('delete', $instituico);

        if (! $request->passwordMatches()) {
            return back()->with('error', __('The password provided is incorrect.'));
        }

        $this->service->delete($instituico);

        return back()->with('success', __('Institution deleted successfully.'));
    }
}
