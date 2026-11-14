<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\ReservaAlterada;
use App\Events\ReservaEvent;
use App\Models\Reserva;
use Illuminate\Support\Facades\Log;
use Throwable;

class ReservaBroadcaster
{
    public function publicar(Reserva $reserva, string $acao): void
    {
        if (in_array($acao, ReservaAlterada::ACOES_QUE_ALTERAM_RELATORIOS, true)) {
            ReservaAlterada::dispatch($acao, $reserva->id);
        }

        try {
            $espacoId = $reserva->horarios()->with('agenda.espaco')->first()?->agenda->espaco_id ?? 0;
            $horariosCount = $reserva->horarios()->count();

            ReservaEvent::dispatch($acao, $reserva->id, $espacoId, $horariosCount);
        } catch (Throwable $e) {
            Log::warning('Falha ao publicar evento de reserva em tempo real', [
                'reserva_id' => $reserva->id,
                'acao' => $acao,
                'exception_class' => $e::class,
            ]);
        }
    }
}
