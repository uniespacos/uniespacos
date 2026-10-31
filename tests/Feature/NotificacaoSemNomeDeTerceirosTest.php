<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\NewReservationNotification;
use App\Notifications\ReservationCanceledNotification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class NotificacaoSemNomeDeTerceirosTest extends TestCase
{
    use DatabaseTransactions;

    private const NOME_SOLICITANTE = 'Joaquina Solicitante Exclusiva';

    private const NOME_CANCELADOR = 'Ricardo Cancelador Exclusivo';

    private User $solicitante;

    private User $gestor;

    private Reserva $reserva;

    protected function setUp(): void
    {
        parent::setUp();

        $this->solicitante = User::factory()->create(['name' => self::NOME_SOLICITANTE]);
        $this->gestor = User::factory()->create();
        $agenda = Agenda::factory()->for(Espaco::factory()->create())->create(['user_id' => $this->gestor->id]);

        $this->reserva = Reserva::factory()->create([
            'user_id' => $this->solicitante->id,
            'titulo' => 'Reunião Semestral',
        ]);
        $this->reserva->horarios()->create([
            'data' => '2026-03-01',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '09:00:00',
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
        ]);
    }

    public function test_notificacao_nova_reserva_grava_ids_e_nao_o_nome_do_solicitante_em_notifications_data(): void
    {
        $this->gestor->notify(new NewReservationNotification($this->reserva));

        $raw = $this->dadosBrutosNoBanco($this->gestor->id, NewReservationNotification::class);
        $this->assertStringNotContainsString(self::NOME_SOLICITANTE, $raw);

        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame($this->reserva->id, $data['reserva_id']);
        $this->assertSame($this->solicitante->id, $data['solicitante_id']);
    }

    public function test_notificacao_nova_reserva_nao_expoe_nome_do_solicitante_no_broadcast(): void
    {
        $notification = new NewReservationNotification($this->reserva);

        $payload = json_encode($notification->toBroadcast($this->gestor)->data, JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString(self::NOME_SOLICITANTE, $payload);
        $this->assertSame($this->reserva->id, $notification->toBroadcast($this->gestor)->data['reserva_id']);
        $this->assertSame($this->solicitante->id, $notification->toBroadcast($this->gestor)->data['solicitante_id']);
    }

    public function test_notificacao_cancelamento_grava_ids_e_nao_o_nome_do_cancelador_em_notifications_data(): void
    {
        $cancelador = User::factory()->create(['name' => self::NOME_CANCELADOR]);

        $this->gestor->notify(new ReservationCanceledNotification($this->reserva, $cancelador));

        $raw = $this->dadosBrutosNoBanco($this->gestor->id, ReservationCanceledNotification::class);
        $this->assertStringNotContainsString(self::NOME_CANCELADOR, $raw);

        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame($this->reserva->id, $data['reserva_id']);
        $this->assertSame($cancelador->id, $data['cancelador_id']);
    }

    public function test_notificacao_cancelamento_nao_expoe_nome_do_cancelador_no_broadcast(): void
    {
        $cancelador = User::factory()->create(['name' => self::NOME_CANCELADOR]);
        $data = (new ReservationCanceledNotification($this->reserva, $cancelador))->toBroadcast($this->gestor)->data;

        $this->assertStringNotContainsString(self::NOME_CANCELADOR, json_encode($data, JSON_THROW_ON_ERROR));
        $this->assertSame($cancelador->id, $data['cancelador_id']);
    }

    private function dadosBrutosNoBanco(int $notifiableId, string $type): string
    {
        $raw = DB::table('notifications')
            ->where('notifiable_id', $notifiableId)
            ->where('type', $type)
            ->value('data');

        $this->assertIsString($raw);

        return $raw;
    }
}
