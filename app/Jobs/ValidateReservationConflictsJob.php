<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\Reserva\ValidationStatusEnum;
use App\Exceptions\DominioException;
use App\Models\Reserva;
use App\Services\ConflictDetectionService;
use App\Services\ReservaBroadcaster;
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

    public int $tries = 3;

    public function __construct(
        public Reserva $reserva,
    ) {}

    public function uniqueId(): string
    {
        return "validate-conflicts-{$this->reserva->id}";
    }

    // Evita chave órfã se o worker cair antes de liberar o lock.
    public function uniqueFor(): int
    {
        return 3600;
    }

    /**
     * @return array<int>
     */
    public function backoff(): array
    {
        return [30, 60];
    }

    public function handle(ConflictDetectionService $conflictService, ReservaBroadcaster $broadcaster = new ReservaBroadcaster): void
    {
        Log::info('ValidateReservationConflictsJob started', ['reserva_id' => $this->reserva->id]);

        try {
            $this->reserva->update(['validation_status' => ValidationStatusEnum::PROCESSING->value]);

            $conflitos = $conflictService->findConflictsFor($this->reserva->id);

            $this->reserva->update([
                'conflict_cache' => $conflitos,
                'validation_status' => ValidationStatusEnum::COMPLETED->value,
            ]);

            $broadcaster->publicar($this->reserva, 'validated');

            Log::info('ValidateReservationConflictsJob completed', [
                'reserva_id' => $this->reserva->id,
                'conflicts_found' => $conflitos->count(),
            ]);
        } catch (DominioException $e) {
            Log::warning('ValidateReservationConflictsJob rejected by domain rule', [
                'reserva_id' => $this->reserva->id,
                'exception' => $e,
            ]);
            $this->fail($e);
        }
    }

    // Erros transitórios (ex.: QueryException, timeout) não são capturados em handle():
    // propagam para o worker, que reagenda conforme $tries e backoff().
    public function failed(Throwable $exception): void
    {
        Log::error('ValidateReservationConflictsJob failed', [
            'reserva_id' => $this->reserva->id,
            'exception' => $exception,
        ]);

        $this->reserva->update(['validation_status' => ValidationStatusEnum::FAILED->value]);

        // O frontend escuta a ação 'validated' para atualizar a tela; sem este evento
        // a reserva ficaria exibindo "processando" até o usuário recarregar a página.
        app(ReservaBroadcaster::class)->publicar($this->reserva, 'validated');
    }
}
