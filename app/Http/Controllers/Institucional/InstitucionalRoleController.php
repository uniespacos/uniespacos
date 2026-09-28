<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\SyncRolePermissionsRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Models\Role;
use App\Services\RoleService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Inertia\Response;

class InstitucionalRoleController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected RoleService $roleService,
    ) {}

    public function index(): Response
    {
        $this->authorize('viewAny', Role::class);

        return inertia('Administrativo/Roles/Roles', $this->roleService->getIndexData());
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $this->authorize('create', Role::class);

        $role = $this->roleService->create($request->validated());

        return redirect()->route('institucional.roles.index')
            ->with('success', "Papel '{$role->name}' criado com sucesso.");
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $this->authorize('update', $role);

        $this->roleService->update($role, $request->validated());

        return back()->with('success', "Papel '{$role->name}' atualizado com sucesso.");
    }

    public function destroy(Role $role): RedirectResponse
    {
        $this->authorize('delete', $role);

        $name = $role->name;
        $this->roleService->delete($role);

        return back()->with('success', "Papel '{$name}' removido com sucesso.");
    }

    public function syncPermissions(SyncRolePermissionsRequest $request, Role $role): RedirectResponse
    {
        $this->authorize('update', $role);

        $this->roleService->syncPermissions($role, $request->validated()['permissions']);

        return back()->with('success', "Permissões do papel '{$role->name}' atualizadas com sucesso.");
    }
}
