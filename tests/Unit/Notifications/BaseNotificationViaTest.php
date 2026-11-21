<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\BaseNotification;
use App\Notifications\Concerns\HasQueueableRetry;
use App\Notifications\ReservationCreatedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BaseNotificationViaTest extends TestCase
{
    use DatabaseTransactions;

    private const CANAIS_SEM_EMAIL = ['database', 'broadcast'];

    private const CANAIS_COM_EMAIL = ['database', 'broadcast', 'mail'];

    public function test_solicitante_gestor_unico_nao_recebe_email(): void
    {
        $solicitante = User::factory()->create();
        $reserva = Reserva::factory()->create(['user_id' => $solicitante->id]);
        $this->criarHorarioDoGestor($reserva, $solicitante);
        $this->criarHorarioDoGestor($reserva, $solicitante);

        $notification = new ReservationCreatedNotification($reserva);

        $this->assertSame(self::CANAIS_SEM_EMAIL, $notification->via($solicitante));
    }

    public function test_outro_destinatario_recebe_email_mesmo_com_solicitante_gestor_unico(): void
    {
        $solicitante = User::factory()->create();
        $outro = User::factory()->create();
        $reserva = Reserva::factory()->create(['user_id' => $solicitante->id]);
        $this->criarHorarioDoGestor($reserva, $solicitante);

        $notification = new ReservationCreatedNotification($reserva);

        $this->assertSame(self::CANAIS_COM_EMAIL, $notification->via($outro));
    }

    public function test_solicitante_com_dois_gestores_recebe_email(): void
    {
        $solicitante = User::factory()->create();
        $outroGestor = User::factory()->create();
        $reserva = Reserva::factory()->create(['user_id' => $solicitante->id]);
        $this->criarHorarioDoGestor($reserva, $solicitante);
        $this->criarHorarioDoGestor($reserva, $outroGestor);

        $notification = new ReservationCreatedNotification($reserva);

        $this->assertSame(self::CANAIS_COM_EMAIL, $notification->via($solicitante));
    }

    public function test_solicitante_que_nao_e_gestor_recebe_email(): void
    {
        $solicitante = User::factory()->create();
        $gestor = User::factory()->create();
        $reserva = Reserva::factory()->create(['user_id' => $solicitante->id]);
        $this->criarHorarioDoGestor($reserva, $gestor);

        $notification = new ReservationCreatedNotification($reserva);

        $this->assertSame(self::CANAIS_COM_EMAIL, $notification->via($solicitante));
    }

    public function test_reserva_sem_horarios_envia_email_para_todos(): void
    {
        $solicitante = User::factory()->create();
        $reserva = Reserva::factory()->create(['user_id' => $solicitante->id]);

        $notification = new ReservationCreatedNotification($reserva);

        $this->assertSame(self::CANAIS_COM_EMAIL, $notification->via($solicitante));
    }

    public function test_via_com_varios_destinatarios_consulta_o_banco_no_maximo_uma_vez(): void
    {
        $solicitante = User::factory()->create();
        $reserva = Reserva::factory()->create(['user_id' => $solicitante->id]);
        $this->criarHorarioDoGestor($reserva, $solicitante);

        $destinatarios = [$solicitante, ...User::factory()->count(4)->create()->all()];
        $notification = new ReservationCreatedNotification($reserva);

        DB::flushQueryLog();
        DB::enableQueryLog();

        $canais = array_map(fn (User $destinatario): array => $notification->via($destinatario), $destinatarios);

        $consultas = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertCount(1, $consultas);
        $this->assertSame([
            self::CANAIS_SEM_EMAIL,
            self::CANAIS_COM_EMAIL,
            self::CANAIS_COM_EMAIL,
            self::CANAIS_COM_EMAIL,
            self::CANAIS_COM_EMAIL,
        ], $canais);
    }

    public function test_notificacao_continua_na_fila_com_tries_e_backoff_do_trait(): void
    {
        $reserva = Reserva::factory()->create();
        $notification = new ReservationCreatedNotification($reserva);

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertContains(HasQueueableRetry::class, class_uses(BaseNotification::class));
        $this->assertSame(5, $notification->tries);
        $this->assertSame([30, 60, 120, 300], $notification->backoff());
    }

    private function criarHorarioDoGestor(Reserva $reserva, User $gestor): void
    {
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
        ]);
    }
}
