<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Exceptions\DominioException;
use App\Models\Reserva;
use App\Models\User;
use App\Services\AvaliacaoDeReservaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class AvaliarReservaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    protected string $locale;

    /**
     * @param  array<string, mixed>  $validatedData
     */
    public function __construct(
        protected Reserva $reserva,
        protected array $validatedData,
        protected User $gestor,
    ) {
        $this->locale = app()->getLocale();
    }

    public function handle(AvaliacaoDeReservaService $avaliacao): void
    {
        $horariosAvaliados = $this->validatedData['horarios_avaliados'];

        Log::info('AvaliarReservaJob started', [
            'reserva_id' => $this->reserva->id,
            'gestor_id' => $this->gestor->id,
            'scope' => $this->validatedData['evaluation_scope'],
            'horarios_count' => is_countable($horariosAvaliados) ? count($horariosAvaliados) : 0,
        ]);

        try {
            $avaliacao->avaliar($this->reserva, $this->validatedData, $this->gestor, $this->locale);
        } catch (DominioException $e) {
            $this->fail($e);

            return;
        }

        Log::info('AvaliarReservaJob completed', [
            'reserva_id' => $this->reserva->id,
            'situacao' => $this->reserva->situacao,
        ]);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('AvaliarReservaJob failed', [
            'reserva_id' => $this->reserva->id,
            'gestor_id' => $this->gestor->id,
            'exception' => $exception,
        ]);
    }
}
