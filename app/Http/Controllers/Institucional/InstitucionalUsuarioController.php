<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Exceptions\ContaNaoPodeSerAnonimizadaException;
use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\ListarUsuariosRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdatePermissionsRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use App\Services\UserService;
use App\Support\MensagemDeErro;
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
            (bool) ($validated['anonimizados'] ?? false),
        );

        return Inertia::render('Administrativo/Usuarios/Usuarios', $data);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $this->authorize('create', User::class);

        $this->service->create($request->validated());

        return redirect()->route('institucional.usuarios.index')
            ->with('success', __('User created successfully.'));
    }

    public function update(UpdateUserRequest $request, User $usuario): RedirectResponse
    {
        $this->authorize('update', $usuario);

        $this->service->update($usuario, $request->validated());

        return back()->with('success', __('User updated successfully.'));
    }

    public function resendVerification(User $usuario): RedirectResponse
    {
        $this->authorize('update', $usuario);

        try {
            $this->service->resendVerificationEmail($usuario);

            return back()->with('success', __('Verification email resent.'));
        } catch (\Exception $e) {
            return back()->with('error', MensagemDeErro::paraUsuario($e));
        }
    }

    public function sendPasswordReset(User $usuario): RedirectResponse
    {
        $this->authorize('update', $usuario);

        $sent = $this->service->sendPasswordResetLink($usuario);

        return back()->with(
            $sent ? 'success' : 'error',
            $sent ? __('Password reset link sent.') : __('Could not send the reset link.'),
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

            return back()->with('success', __('Permissions updated successfully.'));
        } catch (\Exception $e) {
            Log::error('Erro ao atualizar permissões do usuário', [
                'usuario_alvo_id' => $user->id,
                'exception' => $e,
            ]);

            return back()->with('error', __('Error updating permissions: :message', ['message' => MensagemDeErro::paraUsuario($e, registrar: false)]));
        }
    }

    public function destroy(ConfirmPasswordRequest $request, User $usuario): RedirectResponse
    {
        $this->authorize('delete', $usuario);

        if (! $request->passwordMatches()) {
            return back()->with('error', __('The password provided is incorrect.'));
        }

        try {
            $this->service->anonimizar($usuario);

            return back()->with('success', __('User account anonymized successfully.'));
        } catch (ContaNaoPodeSerAnonimizadaException $e) {
            return back()->with('error', $e->getMessage());
        } catch (\Exception $e) {
            Log::error('Erro ao excluir usuário', [
                'usuario_alvo_id' => $usuario->id,
                'exception' => $e,
            ]);

            return back()->with('error', __('Error deleting user.'));
        }
    }
}
