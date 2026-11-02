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
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class NotificacaoPayloadPublicoTest extends TestCase
{
    use DatabaseTransactions;

    private const CHAVES_BROADCAST = ['titulo', 'descricao', 'url', 'reserva_id', 'chave', 'parametros'];

    private User $solicitante;

    private User $gestor;

    private Reserva $reserva;

    protected function setUp(): void
    {
        parent::setUp();

        $this->solicitante = User::factory()->create();
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

    public static function notificacoesDeReserva(): array
    {
        return [
            'nova reserva' => [fn (Reserva $reserva): object => new NewReservationNotification($reserva)],
            'cancelamento' => [fn (Reserva $reserva, User $cancelador): object => new ReservationCanceledNotification($reserva, $cancelador)],
        ];
    }

    public function test_broadcast_de_nova_reserva_leva_so_os_campos_publicos(): void
    {
        $data = (new NewReservationNotification($this->reserva))->toBroadcast($this->gestor)->data;

        $this->assertSame(self::CHAVES_BROADCAST, array_keys($data));
        $this->assertSame($this->reserva->id, $data['reserva_id']);
        $this->assertSame('reservas.nova_solicitacao', $data['chave']);
    }

    public function test_broadcast_de_cancelamento_leva_so_os_campos_publicos(): void
    {
        $cancelador = User::factory()->create();
        $data = (new ReservationCanceledNotification($this->reserva, $cancelador))->toBroadcast($this->gestor)->data;

        $this->assertSame(self::CHAVES_BROADCAST, array_keys($data));
        $this->assertSame($this->reserva->id, $data['reserva_id']);
        $this->assertSame('reservas.cancelada', $data['chave']);
    }

    public function test_array_de_nova_reserva_continua_com_os_identificadores_gravados(): void
    {
        $data = (new NewReservationNotification($this->reserva))->toArray($this->gestor);

        $this->assertSame(
            ['titulo', 'descricao', 'url', 'reserva_id', 'solicitante_id', 'chave', 'parametros'],
            array_keys($data),
        );
        $this->assertSame($this->solicitante->id, $data['solicitante_id']);
    }

    public function test_array_de_cancelamento_continua_com_os_identificadores_gravados(): void
    {
        $cancelador = User::factory()->create();
        $data = (new ReservationCanceledNotification($this->reserva, $cancelador))->toArray($this->gestor);

        $this->assertSame(
            ['titulo', 'descricao', 'url', 'reserva_id', 'cancelador_id', 'chave', 'parametros'],
            array_keys($data),
        );
        $this->assertSame($cancelador->id, $data['cancelador_id']);
    }

    #[DataProvider('notificacoesDeReserva')]
    public function test_broadcast_nao_carrega_identificadores_internos(callable $criar): void
    {
        $cancelador = User::factory()->create();
        $notification = $criar($this->reserva, $cancelador);

        $data = $notification->toBroadcast($this->gestor)->data;

        $this->assertArrayNotHasKey('solicitante_id', $data);
        $this->assertArrayNotHasKey('cancelador_id', $data);
    }

    public function test_rota_de_listagem_json_de_notificacoes_nao_existe(): void
    {
        $this->actingAs($this->gestor)->getJson('/notifications')->assertNotFound();
    }
}
