<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\HomeService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __construct(
        protected HomeService $service,
    ) {}

    public function index(): Response
    {
        $user = Auth::user();
        $data = $this->service->getDashboardData($user);

        $view = match (true) {
            $user->hasPermissionTo('secao.dashboard-institucional') => 'Dashboard/DashboardInstitucionalPage',
            $user->hasPermissionTo('secao.dashboard-gestor') => 'Dashboard/DashboardGestorPage',
            default => 'Dashboard/DashboardUsuarioPage',
        };

        return Inertia::render($view, $data);
    }
}
