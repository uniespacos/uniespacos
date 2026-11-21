<?php

declare(strict_types=1);

namespace App\Http\Controllers\Gestor;

use App\Http\Controllers\Controller;
use App\Http\Requests\AvaliarReservaRequest;
use App\Http\Requests\ListarReservasRequest;
use App\Http\Requests\SemanaRequest;
use App\Models\Reserva;
use App\Services\ReservaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class GestorReservaController extends Controller
{
    public function __construct(
        protected ReservaService $service,
    ) {}

    public function index(ListarReservasRequest $request): Response
    {
        $data = $this->service->getGestorListing(
            Auth::user(),
            $request->semana(),
            $request->filtros(),
        );

        return Inertia::render('Reservas/Gestor/ReservasGestorPage', $data);
    }

    public function show(SemanaRequest $request, Reserva $reserva): Response
    {
        $this->authorize('viewForGestor', $reserva);

        $data = $this->service->getForGestorReview(
            $reserva,
            Auth::user(),
            $request->semana()
        );

        return Inertia::render('Reservas/Gestor/AvaliarReservaPage', $data);
    }

    public function update(AvaliarReservaRequest $request, Reserva $reserva): RedirectResponse
    {
        $this->authorize('evaluateForGestor', $reserva);

        try {
            $this->service->evaluate($reserva, $request->validated(), Auth::user());

            return redirect()->route('gestor.reservas.index')
                ->with('success', __('Assessment sent for background processing. You will be notified when it is complete.'));
        } catch (\Exception $e) {
            Log::error('Erro ao despachar AvaliarReservaJob', [
                'reserva_id' => $reserva->id,
                'gestor_id' => Auth::id(),
                'exception' => $e,
            ]);

            return back()->with('error', __('An error occurred while sending the assessment for processing.'));
        }
    }
}
