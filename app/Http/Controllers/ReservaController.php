<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmPasswordRequest;
use App\Http\Requests\StoreReservaRequest;
use App\Http\Requests\UpdateReservaRequest;
use App\Models\Reserva;
use App\Services\ReservaService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ReservaController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected ReservaService $service,
    ) {}

    public function index(Request $request): Response
    {
        $data = $this->service->getListingForUser(
            Auth::user(),
            $request->input('semana', 'today'),
            $request->only(['search', 'situacao', 'arquivo', 'ordenar', 'reserva'])
        );

        return Inertia::render('Reservas/ReservasPage', $data);
    }

    public function create(): void {}

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

            return back()->withErrors(['error' => 'Não foi possível enviar sua solicitação para processamento. Tente novamente.']);
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

    public function edit(Request $request, Reserva $reserva): Response
    {
        $this->authorize('update', $reserva);

        $data = $this->service->getEditData($reserva, $request->input('semana', ''));

        return Inertia::render('Espacos/VisualizarEspacoPage', $data);
    }

    public function update(UpdateReservaRequest $request, Reserva $reserva): RedirectResponse
    {
        $this->authorize('update', $reserva);

        try {
            $this->service->update($reserva, $request->validated(), Auth::user());

            return redirect()->route('reservas.index')
                ->with('success', 'Sua solicitação de alteração foi enviada para processamento.');
        } catch (\Exception $e) {
            Log::error('Erro ao despachar UpdateReservaJob', [
                'reserva_id' => $reserva->id,
                'user_id' => Auth::id(),
                'exception' => $e,
            ]);

            return back()->with('error', 'Ocorreu um erro ao enviar a atualização para processamento.');
        }
    }

    public function destroy(ConfirmPasswordRequest $request, Reserva $reserva): RedirectResponse
    {
        $this->authorize('delete', $reserva);

        if (! $request->passwordMatches()) {
            return back()->with('error', 'A senha fornecida está incorreta.');
        }

        try {
            $this->service->cancel($reserva, Auth::user());

            return back()->with('success', 'Reserva cancelada com sucesso!');
        } catch (\Exception $error) {
            Log::error('Erro ao cancelar (inativar) reserva', [
                'reserva_id' => $reserva->id,
                'user_id' => Auth::id(),
                'exception' => $error,
            ]);

            return back()->with('error', 'Erro ao cancelar a reserva. Por favor, tente novamente.');
        }
    }
}
