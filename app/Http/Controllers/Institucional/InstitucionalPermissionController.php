<?php

declare(strict_types=1);

namespace App\Http\Controllers\Institucional;

use App\Http\Controllers\Controller;
use App\Services\RoleService;
use Illuminate\Http\JsonResponse;

class InstitucionalPermissionController extends Controller
{
    public function __construct(
        protected RoleService $roleService,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'permissions' => $this->roleService->getGroupedPermissions(),
        ]);
    }
}
