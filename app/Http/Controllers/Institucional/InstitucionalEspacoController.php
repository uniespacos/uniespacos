<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Http\Controllers\Controller;
use App\Http\Requests\AlterarGestoresEspacoRequest;
use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\ListarEspacosRequest;
use App\Http\Requests\StoreEspacoRequest;
use App\Http\Requests\UpdateEspacoRequest;
use App\Models\Espaco;
use App\Services\EspacoService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class InstitucionalEspacoController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected EspacoService $service,
    ) {}

    public function index(ListarEspacosRequest $request): Response
    {
        $this->authorize('viewAny', Espaco::class);

        $user = Auth::user();
        $instituicaoId = $user->setor->unidade->instituicao_id;
        $filters = $request->validated();
        $filterOptions = $this->service->getFilterOptions($instituicaoId);

        return Inertia::render('Administrativo/Espacos/GerenciarEspacos', [
            'espacos' => $this->service->getPaginatedForAdmin($instituicaoId, $filters)->withQueryString(),
            'andares' => $filterOptions['andares'],
            'modulos' => $filterOptions['modulos'],
            'unidades' => $filterOptions['unidades'],
            'capacidadeEspacos' => $filterOptions['capacidades'],
            'filters' => $filters,
            'users' => $this->service->getUsersWithAgendas($instituicaoId),
        ]);
    }

    public function create(): Response
    {
        $instituicaoId = Auth::user()->setor->unidade->instituicao_id;
        $formData = $this->service->getFormData($instituicaoId);

        return Inertia::render('Administrativo/Espacos/CadastroEspaco', $formData);
    }

    public function store(StoreEspacoRequest $request): RedirectResponse
    {
        $this->authorize('create', Espaco::class);

        try {
            $this->service->store(
                $request->validated(),
                $request->file('imagens', [])
            );

            return redirect()->route('institucional.espacos.index')
                ->with('success', 'Espaço cadastrado com sucesso!');
        } catch (\Exception $e) {
            Log::error('Erro ao criar espaço', ['exception' => $e]);

            return redirect()->back()
                ->with('error', 'Ocorreu um erro inesperado ao criar o espaço.')
                ->withInput();
        }
    }

    public function show(Espaco $espaco): Response|RedirectResponse
    {
        try {
            $data = $this->service->getWithAgendaData($espaco);

            return Inertia::render('Espacos/VisualizarEspacoPage', $data);
        } catch (\Exception $th) {
            return redirect()->route('espacos.index')
                ->with('error', 'Espaço sem gestor cadastrado - Aguardando cadastro');
        }
    }

    public function edit(Espaco $espaco): Response
    {
        $espaco->load('andar.modulo.unidade');
        $instituicaoId = Auth::user()->setor->unidade->instituicao_id;
        $formData = $this->service->getFormData($instituicaoId);

        return Inertia::render('Administrativo/Espacos/CadastroEspaco', array_merge(
            $formData,
            ['espaco' => $espaco]
        ));
    }

    public function update(UpdateEspacoRequest $request, Espaco $espaco): RedirectResponse
    {
        $this->authorize('update', $espaco);

        try {
            $this->service->update(
                $espaco,
                $request->validated(),
                $request->file('imagens', []),
                $request->validated('images_to_delete', [])
            );

            return back()->with('success', 'Espaço atualizado com sucesso!');
        } catch (\Exception $e) {
            Log::error('Erro ao atualizar espaço', [
                'espaco_id' => $espaco->id,
                'exception' => $e,
            ]);

            return redirect()->back()
                ->with('error', 'Ocorreu um erro inesperado ao atualizar o espaço.')
                ->withInput();
        }
    }

    public function destroy(ConfirmPasswordRequest $request, Espaco $espaco): RedirectResponse
    {
        $this->authorize('delete', $espaco);

        if (! $request->passwordMatches()) {
            return back()->with('error', 'A senha fornecida está incorreta.');
        }

        try {
            $this->service->delete($espaco);

            return back()->with('success', 'Espaço excluído com sucesso!');
        } catch (\Exception $error) {
            return redirect()->back()->with('error', 'Erro ao excluir, favor tentar novamente.');
        }
    }

    public function alterarGestores(AlterarGestoresEspacoRequest $request, Espaco $espaco): RedirectResponse
    {
        $this->authorize('updateGestores', $espaco);

        try {
            $this->service->updateGestores($espaco, $request->validated());

            return back()->with('success', 'Gestores atualizados com sucesso!');
        } catch (\Exception $e) {
            Log::error('Erro ao atualizar gestores do espaço', [
                'espaco_id' => $espaco->id,
                'exception' => $e,
            ]);

            return redirect()->back()
                ->with('error', 'Ocorreu um erro ao atualizar os gestores do espaço.');
        }
    }
}
