<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\ListarUnidadesRequest;
use App\Http\Requests\StoreUnidadeRequest;
use App\Http\Requests\UpdateUnidadeRequest;
use App\Models\Unidade;
use App\Services\UnidadeService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class InstitucionalUnidadeController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected UnidadeService $service,
    ) {}

    public function index(ListarUnidadesRequest $request): Response
    {
        $this->authorize('viewAny', Unidade::class);

        $instituicaoId = Auth::user()->setor->unidade->instituicao_id;
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
        $user = Auth::user();

        return Inertia::render('Administrativo/Unidades/CadastrarUnidade', [
            'instituicao' => $user->setor->unidade->instituicao,
        ]);
    }

    public function store(StoreUnidadeRequest $request): RedirectResponse
    {
        $this->authorize('create', Unidade::class);

        try {
            $this->service->store($request->validated());

            return redirect()->route('institucional.unidades.index')
                ->with('success', 'Unidade criada com sucesso.');
        } catch (\Throwable $th) {
            return redirect()->route('institucional.unidades.index')
                ->with('error', 'Erro ao criar a unidade: '.$th->getMessage());
        }
    }

    public function edit(Unidade $unidade): Response
    {
        $user = Auth::user();

        return Inertia::render('Administrativo/Unidades/EditarUnidade', [
            'instituicao' => $user->setor->unidade->instituicao,
            'unidade' => $unidade,
        ]);
    }

    public function update(UpdateUnidadeRequest $request, Unidade $unidade): RedirectResponse
    {
        $this->authorize('update', $unidade);

        try {
            $this->service->update($unidade, $request->validated());

            return redirect()->route('institucional.unidades.index')
                ->with('success', 'Unidade atualizada com sucesso.');
        } catch (\Throwable $th) {
            return back()->withInput()->with('error', 'Erro ao atualizar a unidade: '.$th->getMessage());
        }
    }

    public function destroy(ConfirmPasswordRequest $request, Unidade $unidade): RedirectResponse
    {
        $this->authorize('delete', $unidade);

        if (! $request->passwordMatches()) {
            return back()->with('error', 'A senha fornecida está incorreta.');
        }

        try {
            $this->service->delete($unidade);

            return back()->with('success', 'Unidade excluída com sucesso.');
        } catch (\Throwable $th) {
            return back()->with('error', 'Erro ao deletar a unidade: '.$th->getMessage());
        }
    }
}
