<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Exceptions\DominioException;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\NewReservationNotification;
use App\Notifications\ReservationCreatedNotification;
use App\Notifications\ReservationFailedNotification;
use App\Services\CriacaoDeReservaService;
use App\Services\ReservaBroadcaster;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessarCriacaoReserva implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // A criacao nao e idempotente: uma nova tentativa poderia gravar a reserva duas vezes.
    public int $tries = 1;

    public int $timeout = 360;

    /**
     * @param  array{titulo: string, descricao?: string, data_inicial: string, data_final: string, recorrencia: string, publico_estimado?: int|null, categoria?: string|null, termo_aceito_em?: string, horarios_solicitados: array<int, array<string, mixed>>}  $dadosRequisicao  As chaves opcionais ausentes em jobs enfileirados antes do deploy sao tratadas como null.
     */
    public function __construct(
        protected array $dadosRequisicao,
        protected User $solicitante,
    ) {}

    public function handle(CriacaoDeReservaService $criacao, ReservaBroadcaster $broadcaster): void
    {
        Log::info('ProcessarCriacaoReserva started', [
            'solicitante_id' => $this->solicitante->id,
        ]);

        try {
            [$reserva, $gestores] = $criacao->criar($this->dadosRequisicao, $this->solicitante);
        } catch (DominioException $e) {
            Log::warning('ProcessarCriacaoReserva failed', [
                'solicitante_id' => $this->solicitante->id,
                'exception' => $e,
            ]);

            $this->fail($e);

            return;
        } catch (Throwable $e) {
            Log::error('ProcessarCriacaoReserva failed', [
                'solicitante_id' => $this->solicitante->id,
                'exception' => $e,
            ]);

            throw $e;
        }

        $this->efeitosPosCommit($reserva, $gestores, $broadcaster);
    }

    public function failed(Throwable $exception): void
    {
        try {
            $this->solicitante->notify(new ReservationFailedNotification(
                $this->dadosRequisicao['titulo'],
                $this->solicitante
            ));
        } catch (Exception $e) {
            Log::error('Falha fatal ao enviar notificação de erro de criação de reserva', [
                'solicitante_id' => $this->solicitante->id,
                'exception' => $e,
            ]);
        }
    }

    /**
     * @param  Collection<int, User>  $gestores
     */
    private function efeitosPosCommit(Reserva $reserva, Collection $gestores, ReservaBroadcaster $broadcaster): void
    {
        $this->notificarGestores($reserva, $gestores);

        try {
            ValidateReservationConflictsJob::dispatch($reserva);

            Log::info('Conflict validation dispatched', ['reserva_id' => $reserva->id]);
        } catch (Throwable $e) {
            Log::warning('Falha em efeito pós-commit da criação de reserva: validação de conflitos não despachada', [
                'reserva_id' => $reserva->id,
                'exception' => $e,
            ]);
        }

        $this->notificarSolicitanteDeCriacao($reserva);

        try {
            $broadcaster->publicar($reserva, 'created');
        } catch (Throwable $e) {
            Log::warning('Falha em efeito pós-commit da criação de reserva: broadcast não publicado', [
                'reserva_id' => $reserva->id,
                'exception' => $e,
            ]);
        }
    }

    /**
     * @param  Collection<int, User>  $gestores
     */
    private function notificarGestores(Reserva $reserva, Collection $gestores): void
    {
        foreach ($gestores as $gestor) {
            if ($gestor->id === $this->solicitante->id) {
                continue;
            }

            try {
                $gestor->notify(new NewReservationNotification($reserva));
            } catch (Exception $e) {
                Log::warning('Falha ao notificar gestor sobre nova reserva', [
                    'gestor_id' => $gestor->id,
                    'reserva_id' => $reserva->id,
                    'exception' => $e,
                ]);
            }
        }
    }

    private function notificarSolicitanteDeCriacao(Reserva $reserva): void
    {
        try {
            $this->solicitante->notify(new ReservationCreatedNotification($reserva));
        } catch (Exception $e) {
            Log::warning('Falha ao enviar notificação de reserva criada', [
                'reserva_id' => $reserva->id,
                'solicitante_id' => $this->solicitante->id,
                'exception' => $e,
            ]);
        }
    }
}
