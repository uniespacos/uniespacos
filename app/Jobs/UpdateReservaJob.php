<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Exceptions\DominioException;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationUpdatedNotification;
use App\Notifications\ReservationUpdateFailedNotification;
use App\Services\EdicaoDeReservaService;
use App\Services\ReservaBroadcaster;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class UpdateReservaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @param  array{titulo: string, descricao?: string, data_inicial: string, data_final: string, recorrencia: string, edit_scope: string, horarios_solicitados: array<int, array<string, mixed>>, edited_week_date?: string|\DateTimeInterface, publico_estimado?: int|null, categoria?: string|null, termo_aceito_em?: string}  $validatedData
     */
    public function __construct(
        protected Reserva $reserva,
        protected array $validatedData,
        protected User $user,
    ) {}

    /**
     * @return array<int>
     */
    public function backoff(): array
    {
        return [30, 60];
    }

    public function handle(EdicaoDeReservaService $edicao, ReservaBroadcaster $broadcaster): void
    {
        Log::info('UpdateReservaJob started', [
            'reserva_id' => $this->reserva->id,
            'user_id' => $this->user->id,
            'scope' => $this->validatedData['edit_scope'],
        ]);

        try {
            $edicao->executar($this->reserva, $this->validatedData);
        } catch (DominioException $e) {
            $this->fail($e);

            return;
        }

        Log::info('UpdateReservaJob completed', [
            'reserva_id' => $this->reserva->id,
            'scope' => $this->validatedData['edit_scope'],
        ]);

        $this->efeitosPosCommit($broadcaster);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('UpdateReservaJob failed', [
            'reserva_id' => $this->reserva->id,
            'user_id' => $this->user->id,
            'exception' => $exception,
        ]);

        if ($this->reserva->user !== null) {
            try {
                $this->reserva->user->notify(new ReservationUpdateFailedNotification($this->reserva, $this->user));
            } catch (Exception $e) {
                Log::error('Failed to send reservation update failure notification', [
                    'reserva_id' => $this->reserva->id,
                    'exception' => $e,
                ]);
            }
        }
    }

    private function efeitosPosCommit(ReservaBroadcaster $broadcaster): void
    {
        if ($this->reserva->user !== null) {
            try {
                $this->reserva->user->notify(new ReservationUpdatedNotification($this->reserva));
            } catch (Exception $e) {
                Log::warning('Failed to send reservation update notification', [
                    'reserva_id' => $this->reserva->id,
                    'exception' => $e,
                ]);
            }
        }

        try {
            ValidateReservationConflictsJob::dispatch($this->reserva);
            $broadcaster->publicar($this->reserva, 'updated');
        } catch (Throwable $e) {
            Log::warning('Falha em efeito pós-commit da edição de reserva', [
                'reserva_id' => $this->reserva->id,
                'exception' => $e,
            ]);
        }
    }
}
