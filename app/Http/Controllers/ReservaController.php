<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\ListarReservasRequest;
use App\Http\Requests\SemanaRequest;
use App\Http\Requests\StoreReservaRequest;
use App\Http\Requests\UpdateReservaRequest;
use App\Models\Reserva;
use App\Services\ReservaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ReservaController extends Controller
{
    public function __construct(
        protected ReservaService $service,
    ) {}

    public function index(ListarReservasRequest $request): Response
    {
        $data = $this->service->getListingForUser(
            Auth::user(),
            $request->semana(),
            $request->filtros(),
        );

        return Inertia::render('Reservas/ReservasPage', $data);
    }

    public function store(StoreReservaRequest $request): RedirectResponse
    {
        try {
            $this->service->create($request->validated(), Auth::user());

            return back();
        } catch (\Exception $error) {
            Log::error('Erro ao despachar o job de criação de reserva', [
                'user_id' => Auth::id(),
                'exception' => $error,
            ]);

            return back()->withErrors(['error' => __('Could not send your request for processing. Please try again.')]);
        }
    }

    public function show(Reserva $reserva): RedirectResponse
    {
        $this->authorize('view', $reserva);

        return redirect()->route('reservas.index', [
            'reserva' => $reserva->id,
            'semana' => $this->service->resolveDataAncora($reserva),
        ]);
    }

    public function edit(SemanaRequest $request, Reserva $reserva): Response
    {
        $this->authorize('update', $reserva);

        $data = $this->service->getEditData($reserva, $request->semana());

        return Inertia::render('Espacos/VisualizarEspacoPage', $data);
    }

    public function update(UpdateReservaRequest $request, Reserva $reserva): RedirectResponse
    {
        $this->authorize('update', $reserva);

        try {
            $this->service->update($reserva, $request->validated(), Auth::user());

            return redirect()->route('reservas.index')
                ->with('success', __('Your change request was sent for processing.'));
        } catch (\Exception $e) {
            Log::error('Erro ao despachar UpdateReservaJob', [
                'reserva_id' => $reserva->id,
                'user_id' => Auth::id(),
                'exception' => $e,
            ]);

            return back()->with('error', __('An error occurred while sending the update for processing.'));
        }
    }

    public function destroy(ConfirmPasswordRequest $request, Reserva $reserva): RedirectResponse
    {
        $this->authorize('delete', $reserva);

        if (! $request->passwordMatches()) {
            return back()->with('error', __('The password provided is incorrect.'));
        }

        try {
            $this->service->cancel($reserva, Auth::user());

            return back()->with('success', __('Reservation cancelled successfully!'));
        } catch (\Exception $error) {
            Log::error('Erro ao cancelar (inativar) reserva', [
                'reserva_id' => $reserva->id,
                'user_id' => Auth::id(),
                'exception' => $error,
            ]);

            return back()->with('error', __('Error cancelling the reservation. Please try again.'));
        }
    }
}
