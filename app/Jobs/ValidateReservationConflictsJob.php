<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Events\ReservaEvent;
use App\Models\Reserva;
use App\Services\ConflictDetectionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ValidateReservationConflictsJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Reserva $reserva,
    ) {}

    /**
     * Garantir que apenas 1 job para uma reserva é executado por vez.
     * Deduplicará tentativas simultâneas na fila.
     */
    public function uniqueId(): string
    {
        return "validate-conflicts-{$this->reserva->id}";
    }

    /**
     * TTL da chave de unicidade: 1 hora.
     * Suficiente para um job completar, e evita chave orfã se o worker cair.
     */
    public function uniqueFor(): int
    {
        return 3600; // 1 hora em segundos
    }

    /**
     * Execute the job — runs conflict detection and caches the result on the reservation.
     */
    public function handle(ConflictDetectionService $conflictService): void
    {
        Log::info('ValidateReservationConflictsJob started', ['reserva_id' => $this->reserva->id]);

        try {
            $this->reserva->update(['validation_status' => 'processing']);

            $conflitos = $conflictService->findConflictsFor($this->reserva->id);

            $this->reserva->update([
                'conflict_cache' => $conflitos,
                'validation_status' => 'completed',
            ]);

            $espacoId = $this->reserva->horarios()->with('agenda.espaco')->first()?->agenda->espaco_id ?? 0;
            $horariosCount = $this->reserva->horarios()->count();
            ReservaEvent::dispatch('validated', $this->reserva->id, $espacoId, $horariosCount);

            Log::info('ValidateReservationConflictsJob completed', [
                'reserva_id' => $this->reserva->id,
                'conflicts_found' => $conflitos->count(),
            ]);

        } catch (Throwable $e) {
            Log::error('ValidateReservationConflictsJob failed', [
                'reserva_id' => $this->reserva->id,
                'exception' => $e,
            ]);
            $this->reserva->update(['validation_status' => 'failed']);
            $this->fail($e);
        }
    }

    /**
     * Handle a job failure after all retries are exhausted.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('ValidateReservationConflictsJob exhausted all retries', [
            'reserva_id' => $this->reserva->id,
            'exception' => $exception,
        ]);
        $this->reserva->update(['validation_status' => 'failed']);
    }
}
