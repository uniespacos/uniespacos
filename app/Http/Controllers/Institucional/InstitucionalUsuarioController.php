<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\ListarUsuariosRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdatePermissionsRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class InstitucionalUsuarioController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected UserService $service,
    ) {}

    public function index(ListarUsuariosRequest $request): Response
    {
        $this->authorize('viewAny', User::class);

        $validated = $request->validated();
        $data = $this->service->getIndexData(
            Auth::user(),
            $validated['search'] ?? null,
            isset($validated['setor_id']) ? (int) $validated['setor_id'] : null,
        );

        return Inertia::render('Administrativo/Usuarios/Usuarios', $data);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $this->authorize('create', User::class);

        $this->service->create($request->validated());

        return redirect()->route('institucional.usuarios.index')
            ->with('success', 'Usuário criado com sucesso.');
    }

    public function update(UpdateUserRequest $request, User $usuario): RedirectResponse
    {
        $this->authorize('update', $usuario);

        $this->service->update($usuario, $request->validated());

        return back()->with('success', 'Usuário atualizado com sucesso.');
    }

    public function resendVerification(User $usuario): RedirectResponse
    {
        $this->authorize('update', $usuario);

        try {
            $this->service->resendVerificationEmail($usuario);

            return back()->with('success', 'E-mail de verificação reenviado.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function sendPasswordReset(User $usuario): RedirectResponse
    {
        $this->authorize('update', $usuario);

        $sent = $this->service->sendPasswordResetLink($usuario);

        return back()->with(
            $sent ? 'success' : 'error',
            $sent ? 'Link de redefinição de senha enviado.' : 'Não foi possível enviar o link de redefinição.',
        );
    }

    public function permissionContext(User $usuario): JsonResponse
    {
        $this->authorize('updatePermissions', $usuario);

        return response()->json($this->service->getPermissionContext($usuario));
    }

    public function updatePermissions(UpdatePermissionsRequest $request, User $user): RedirectResponse
    {
        $this->authorize('updatePermissions', $user);

        try {
            $this->service->updatePermissions($user, $request->validated());

            return back()->with('success', 'Permissões atualizadas com sucesso.');
        } catch (\Exception $e) {
            Log::error('Erro ao atualizar permissões do usuário', [
                'usuario_alvo_id' => $user->id,
                'exception' => $e,
            ]);

            return back()->with('error', 'Erro ao atualizar permissões: '.$e->getMessage());
        }
    }

    public function destroy(ConfirmPasswordRequest $request, User $usuario): RedirectResponse
    {
        $this->authorize('delete', $usuario);

        if (! $request->passwordMatches()) {
            return back()->with('error', 'A senha fornecida está incorreta.');
        }

        try {
            $this->service->delete($usuario);

            return back()->with('success', 'Usuário excluído com sucesso.');
        } catch (\Exception $e) {
            Log::error('Erro ao excluir usuário', [
                'usuario_alvo_id' => $usuario->id,
                'exception' => $e,
            ]);

            return back()->with('error', 'Erro ao excluir usuário.');
        }
    }
}
