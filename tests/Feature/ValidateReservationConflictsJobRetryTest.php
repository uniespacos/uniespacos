<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Reserva\ValidationStatusEnum;
use App\Events\ReservaEvent;
use App\Exceptions\ConflitoDeHorarioException;
use App\Jobs\ValidateReservationConflictsJob;
use App\Models\Reserva;
use App\Models\User;
use App\Services\ConflictDetectionService;
use Exception;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\CongelaRelogio;
use Tests\TestCase;
use Throwable;

class ValidateReservationConflictsJobRetryTest extends TestCase
{
    use CongelaRelogio;

    public function test_erro_transitorio_e_relancado_sem_marcar_falha(): void
    {
        $reserva = $this->criarReservaEmProcessamento();
        $job = (new ValidateReservationConflictsJob($reserva))->withFakeQueueInteractions();
        $erro = new QueryException('pgsql', 'select 1', [], new Exception('timeout'));

        $this->assertThrows(fn () => $job->handle($this->servicoQueFalha($erro)), QueryException::class);

        $job->assertNotFailed();
        $job->assertNotReleased();
        $this->assertSame(ValidationStatusEnum::PROCESSING->value, $reserva->refresh()->validation_status);
    }

    public function test_failed_grava_status_falha_e_publica_evento(): void
    {
        Event::fake([ReservaEvent::class]);
        $reserva = $this->criarReservaEmProcessamento();
        $job = new ValidateReservationConflictsJob($reserva);

        $job->failed(new Exception('tentativas esgotadas'));

        $this->assertSame(ValidationStatusEnum::FAILED->value, $reserva->refresh()->validation_status);
        Event::assertDispatched(
            ReservaEvent::class,
            fn (ReservaEvent $evento): bool => $evento->action === 'validated' && $evento->reservaId === $reserva->id,
        );
    }

    public function test_erro_de_dominio_falha_sem_retry(): void
    {
        $reserva = $this->criarReservaEmProcessamento();
        $job = (new ValidateReservationConflictsJob($reserva))->withFakeQueueInteractions();

        $job->handle($this->servicoQueFalha(new ConflitoDeHorarioException));

        $job->assertFailedWith(ConflitoDeHorarioException::class);
        $job->assertNotReleased();
    }

    public function test_job_declara_tentativas_e_backoff_de_retry(): void
    {
        $job = new ValidateReservationConflictsJob($this->criarReservaEmProcessamento());

        $this->assertSame(3, $job->tries);
        $this->assertSame([30, 60], $job->backoff());
    }

    private function criarReservaEmProcessamento(): Reserva
    {
        return Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
            'validation_status' => ValidationStatusEnum::PROCESSING->value,
        ]);
    }

    private function servicoQueFalha(Throwable $erro): ConflictDetectionService
    {
        return new class($erro) extends ConflictDetectionService
        {
            public function __construct(private readonly Throwable $erro) {}

            public function findConflictsFor(int $reservaId): Collection
            {
                throw $this->erro;
            }
        };
    }
}
