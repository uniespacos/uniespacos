<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\MarkNotificationReadRequest;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationService $service,
    ) {}

    public function index(): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        return response()->json(
            $this->service->getLatest($user)
        );
    }

    public function markAsRead(MarkNotificationReadRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        $validated = $request->validated();

        $this->service->markAsRead($user, $validated['ids'] ?? null);

        return back()->with('success', 'Notificações marcadas como lidas.');
    }
}
