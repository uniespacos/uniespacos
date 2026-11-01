<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Events\ReservaEvent;
use App\Exceptions\ContaNaoPodeSerAnonimizadaException;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationCanceledNotification;
use App\Repositories\UserRepositoryEloquent;
use App\Repositories\UserRepositoryInterface;
use App\Services\ExclusaoDeContaService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class ExclusaoDeContaCancelaPendentesTest extends TestCase
{
    private const NOME_TITULAR = 'Titular Pendente Exclusivo';

    private const DATA = '2099-06-01';

    private User $gestor;

    private User $titular;

    private Agenda $agenda;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gestor = User::factory()->create(['name' => 'Gestor Pendentes Exclusivo']);
        $this->gestor->assignRole('gestor');

        $this->titular = User::factory()->create([
            'name' => self::NOME_TITULAR,
            'email' => 'titular.'.Str::lower(Str::random(8)).'@test.local',
        ]);
        $this->titular->assignRole('comum');

        $this->agenda = Agenda::factory()->for($this->espacoSemGestores())->create([
            'user_id' => $this->gestor->id,
            'turno' => 'manha',
        ]);
    }

    public function test_reserva_pendente_do_titular_fica_cancelada_ao_anonimizar(): void
    {
        $reserva = $this->criarReserva($this->titular);

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $this->assertSame('inativa', $reserva->fresh()->situacao);
        $this->assertSame(['inativa'], $reserva->horarios()->pluck('situacao')->unique()->values()->all());
        $this->assertDatabaseHas('reservas', ['id' => $reserva->id, 'user_id' => $this->titular->id]);
    }

    public function test_todas_as_reservas_pendentes_do_titular_sao_canceladas(): void
    {
        $primeira = $this->criarReserva($this->titular, inicio: '08:00:00', fim: '10:00:00');
        $segunda = $this->criarReserva($this->titular, inicio: '14:00:00', fim: '16:00:00');

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $this->assertSame('inativa', $primeira->fresh()->situacao);
        $this->assertSame('inativa', $segunda->fresh()->situacao);
    }

    public function test_reservas_ja_avaliadas_do_titular_nao_sao_alteradas(): void
    {
        $deferida = $this->criarReserva($this->titular, 'deferida');
        $indeferida = $this->criarReserva($this->titular, 'indeferida', '12:00:00', '13:00:00');
        $parcial = $this->criarReserva($this->titular, 'parcialmente_deferida', '18:00:00', '19:00:00');

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $this->assertSame('deferida', $deferida->fresh()->situacao);
        $this->assertSame(['deferida'], $deferida->horarios()->pluck('situacao')->unique()->values()->all());
        $this->assertSame('indeferida', $indeferida->fresh()->situacao);
        $this->assertSame('parcialmente_deferida', $parcial->fresh()->situacao);
    }

    public function test_reservas_pendentes_de_outro_solicitante_nao_sao_alteradas(): void
    {
        $outro = User::factory()->create(['email' => 'outro.'.Str::lower(Str::random(8)).'@test.local']);
        $outro->assignRole('comum');
        $reservaOutro = $this->criarReserva($outro);
        $this->criarReserva($this->titular);

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $this->assertSame('em_analise', $reservaOutro->fresh()->situacao);
        $this->assertSame(['em_analise'], $reservaOutro->horarios()->pluck('situacao')->unique()->values()->all());
    }

    public function test_gestor_recebe_o_cancelamento_sem_nome_do_titular(): void
    {
        Notification::fake();
        $reserva = $this->criarReserva($this->titular);

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        Notification::assertSentToTimes($this->gestor, ReservationCanceledNotification::class, 1);
        Notification::assertSentTo(
            $this->gestor,
            ReservationCanceledNotification::class,
            fn (ReservationCanceledNotification $notificacao): bool => $notificacao->reserva->id === $reserva->id
                && $notificacao->canceler->estaAnonimizado(),
        );

        $notificacao = Notification::sent($this->gestor, ReservationCanceledNotification::class)->first();
        $this->assertInstanceOf(ReservationCanceledNotification::class, $notificacao);

        $payload = json_encode($notificacao->toArray($this->gestor), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $html = $notificacao->toMail($this->gestor)->render();

        $this->assertStringNotContainsString(self::NOME_TITULAR, $payload);
        $this->assertStringNotContainsString(self::NOME_TITULAR, $html);
    }

    public function test_conta_anonimizada_nao_recebe_o_aviso_de_cancelamento(): void
    {
        Notification::fake();
        $this->criarReserva($this->titular);

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        Notification::assertNotSentTo($this->titular, ReservationCanceledNotification::class);
    }

    public function test_cancelamento_dispara_o_evento_que_invalida_os_relatorios(): void
    {
        Event::fake([ReservaEvent::class]);
        $reserva = $this->criarReserva($this->titular);

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        Event::assertDispatched(
            ReservaEvent::class,
            fn (ReservaEvent $evento): bool => $evento->action === 'canceled' && $evento->reservaId === $reserva->id,
        );
    }

    public function test_falha_no_meio_da_anonimizacao_desfaz_o_cancelamento_e_nao_notifica(): void
    {
        Notification::fake();
        Event::fake([ReservaEvent::class]);
        $reserva = $this->criarReserva($this->titular);

        $repo = Mockery::mock(UserRepositoryEloquent::class)->makePartial();
        $repo->shouldReceive('removerSessoes')->andThrow(new \RuntimeException('falha simulada'));
        $this->app->instance(UserRepositoryInterface::class, $repo);

        try {
            app(ExclusaoDeContaService::class)->anonimizar($this->titular);
            $this->fail('A falha simulada deveria ter sido propagada.');
        } catch (\RuntimeException $e) {
            $this->assertSame('falha simulada', $e->getMessage());
        }

        $this->assertSame('em_analise', $reserva->fresh()->situacao);
        $this->assertSame(['em_analise'], $reserva->horarios()->pluck('situacao')->unique()->values()->all());
        $this->assertDatabaseHas('users', ['id' => $this->titular->id, 'name' => self::NOME_TITULAR]);
        Notification::assertNothingSent();
        Event::assertNotDispatched(ReservaEvent::class);
    }

    public function test_titular_gestor_de_agenda_bloqueia_antes_de_cancelar_pendentes(): void
    {
        Notification::fake();
        $reserva = $this->criarReserva($this->titular);
        Agenda::factory()->for($this->espacoSemGestores())->create(['user_id' => $this->titular->id]);

        try {
            app(ExclusaoDeContaService::class)->anonimizar($this->titular);
            $this->fail('Gestor de agenda não deveria ser anonimizado.');
        } catch (ContaNaoPodeSerAnonimizadaException $e) {
            $this->assertStringContainsString('gestora de agenda', $e->getMessage());
        }

        $this->assertSame('em_analise', $reserva->fresh()->situacao);
        Notification::assertNothingSent();
    }

    public function test_anonimizar_de_novo_nao_cancela_nem_notifica_outra_vez(): void
    {
        Notification::fake();
        $reserva = $this->criarReserva($this->titular);
        $servico = app(ExclusaoDeContaService::class);

        $servico->anonimizar($this->titular);
        $servico->anonimizar($this->titular->fresh());

        $this->assertSame('inativa', $reserva->fresh()->situacao);
        Notification::assertSentToTimes($this->gestor, ReservationCanceledNotification::class, 1);
    }

    private function espacoSemGestores(): Espaco
    {
        $espaco = Espaco::factory()->create();
        $espaco->agendas()->update(['user_id' => null]);

        return $espaco;
    }

    private function criarReserva(User $solicitante, string $situacao = 'em_analise', string $inicio = '08:00:00', string $fim = '10:00:00'): Reserva
    {
        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'titulo' => 'Reunião '.Str::random(5),
            'situacao' => $situacao,
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $this->agenda->id,
            'situacao' => $situacao === 'parcialmente_deferida' ? 'deferida' : $situacao,
            'data' => self::DATA,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
        ]);

        return $reserva;
    }
}
