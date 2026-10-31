<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\AvaliarReservaJob;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\NewReservationNotification;
use App\Notifications\ReservationCanceledNotification;
use App\Notifications\ReservationEvaluatedNotification;
use App\Services\ConflictDetectionService;
use App\Services\ExclusaoDeContaService;
use App\Services\ReservaService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExclusaoDeContaReservasRegressaoTest extends TestCase
{
    private const NOME_TITULAR = 'Titular Nome Real Exclusivo';

    private const DATA = '2099-06-01';

    private User $gestor;

    private User $titular;

    private Agenda $agenda;

    protected function setUp(): void
    {
        parent::setUp();

        Bus::fake();

        $this->gestor = User::factory()->create(['name' => 'Gestor Teste Exclusivo']);
        $this->gestor->assignRole('gestor');

        $this->titular = User::factory()->create(['name' => self::NOME_TITULAR, 'email' => 'titular.'.Str::random(6).'@test.local']);
        $this->titular->assignRole('comum');

        $this->agenda = Agenda::factory()->for($this->espacoSemGestores())->create([
            'user_id' => $this->gestor->id,
            'turno' => 'manha',
        ]);
    }

    public function test_listagem_do_gestor_mostra_titular_anonimizado_sem_nome_original(): void
    {
        $this->criarReserva($this->titular);
        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $response = $this->actingAs($this->gestor)->get(route('gestor.reservas.index', ['arquivo' => 'todas']));

        $response->assertOk();
        $props = json_encode($response->viewData('page')['props'], JSON_UNESCAPED_UNICODE);
        $this->assertIsString($props);
        $this->assertStringContainsString('Usuário anonimizado', $props);
        $this->assertStringNotContainsString(self::NOME_TITULAR, $props);
    }

    public function test_detalhe_da_reserva_no_gestor_abre_com_titular_anonimizado(): void
    {
        $reserva = $this->criarReserva($this->titular, 'deferida');
        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $response = $this->actingAs($this->gestor)->get(route('gestor.reservas.show', $reserva));

        $response->assertOk();
        $props = json_encode($response->viewData('page')['props'], JSON_UNESCAPED_UNICODE);
        $this->assertIsString($props);
        $this->assertStringNotContainsString(self::NOME_TITULAR, $props);
    }

    public function test_avaliacao_com_titular_anonimizado_conclui_e_nao_notifica_a_conta_apagada(): void
    {
        Notification::fake();
        $reserva = $this->criarReserva($this->titular);
        $this->anonimizarSemCancelarPendentes($this->titular);

        $this->avaliarComoDeferida($reserva->fresh());

        $this->assertSame('deferida', $reserva->horarios()->first()->fresh()->situacao);
        Notification::assertNotSentTo($this->titular->fresh(), ReservationEvaluatedNotification::class);
    }

    public function test_avaliacao_de_reserva_sem_titular_nao_quebra_o_job(): void
    {
        Notification::fake();
        $reserva = $this->criarReserva(null);

        $this->avaliarComoDeferida($reserva->fresh());

        $this->assertSame('deferida', $reserva->horarios()->first()->fresh()->situacao);
        Notification::assertNothingSent();
    }

    public function test_cancelamento_de_reserva_com_titular_anonimizado_notifica_o_gestor(): void
    {
        Notification::fake();
        $reserva = $this->criarReserva($this->titular);
        $this->anonimizarSemCancelarPendentes($this->titular);
        $admin = User::factory()->create();
        $admin->assignRole('institucional');

        app(ReservaService::class)->cancel($reserva->fresh(), $admin);

        $this->assertSame('inativa', $reserva->fresh()->situacao);
        Notification::assertSentTo($this->gestor, ReservationCanceledNotification::class);
    }

    public function test_notificacoes_de_reserva_renderizam_com_titular_anonimizado(): void
    {
        $reserva = $this->criarReserva($this->titular);
        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $html = (new NewReservationNotification($reserva->fresh()))->toMail($this->gestor)->render();

        $this->assertStringContainsString('Usuário anonimizado', (string) $html);
        $this->assertStringNotContainsString(self::NOME_TITULAR, (string) $html);
    }

    public function test_notificacao_de_cancelamento_renderiza_quando_a_reserva_nao_tem_titular(): void
    {
        $reserva = $this->criarReserva(null);

        $html = (new ReservationCanceledNotification($reserva->fresh(), $this->gestor))->toMail($this->gestor)->render();

        $this->assertStringContainsString('Solicitante não identificado', (string) $html);
    }

    public function test_conflito_de_horario_com_titular_anonimizado_continua_sendo_detectado(): void
    {
        $this->criarReserva($this->titular, 'deferida');
        app(ExclusaoDeContaService::class)->anonimizar($this->titular);
        $reservaNova = $this->criarReserva(User::factory()->create(), 'em_analise', '08:30:00', '09:30:00');

        $conflitos = app(ConflictDetectionService::class)->findConflictsFor($reservaNova->id);

        $this->assertTrue($conflitos->has($reservaNova->horarios()->first()->id));
    }

    public function test_conflito_com_reserva_sem_titular_continua_sendo_detectado(): void
    {
        $this->criarReserva(null, 'deferida');
        $reservaNova = $this->criarReserva(User::factory()->create(), 'em_analise', '08:30:00', '09:30:00');

        $conflitos = app(ConflictDetectionService::class)->findConflictsFor($reservaNova->id);

        $this->assertTrue($conflitos->has($reservaNova->horarios()->first()->id));
    }

    public function test_anonimizar_titular_nao_altera_a_reserva_de_outro_solicitante_na_listagem_do_gestor(): void
    {
        $outro = User::factory()->create(['name' => 'Solicitante Preservado Exclusivo']);
        $outro->assignRole('comum');
        $reservaOutro = $this->criarReserva($outro);
        $this->criarReserva($this->titular);

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $this->assertDatabaseHas('reservas', ['id' => $reservaOutro->id, 'user_id' => $outro->id]);
        $this->assertDatabaseHas('users', ['id' => $outro->id, 'name' => 'Solicitante Preservado Exclusivo']);
        $this->assertSame(1, DB::table('horarios')->where('reserva_id', $reservaOutro->id)->where('situacao', 'em_analise')->count());

        $response = $this->actingAs($this->gestor)->get(route('gestor.reservas.index'));
        $props = json_encode($response->viewData('page')['props'], JSON_UNESCAPED_UNICODE);
        $this->assertIsString($props);
        $this->assertStringContainsString('Solicitante Preservado Exclusivo', $props);
    }

    private function espacoSemGestores(): Espaco
    {
        $espaco = Espaco::factory()->create();
        $espaco->agendas()->update(['user_id' => null]);

        return $espaco;
    }

    private function criarReserva(?User $solicitante, string $situacao = 'em_analise', string $inicio = '08:00:00', string $fim = '10:00:00'): Reserva
    {
        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante?->id,
            'titulo' => 'Reunião '.Str::random(5),
            'situacao' => $situacao,
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $this->agenda->id,
            'situacao' => $situacao,
            'data' => self::DATA,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
        ]);

        return $reserva;
    }

    private function anonimizarSemCancelarPendentes(User $titular): void
    {
        $titular->forceFill([
            'name' => ExclusaoDeContaService::NOME_ANONIMIZADO,
            'email' => User::emailAnonimizado($titular->id),
        ])->save();
    }

    private function avaliarComoDeferida(Reserva $reserva): void
    {
        $horario = $reserva->horarios()->firstOrFail();

        $job = new AvaliarReservaJob($reserva, [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [
                ['id' => $horario->id, 'status' => 'deferida'],
            ],
            'observacao' => 'Aprovado em teste',
        ], $this->gestor);

        $job->handle(new ConflictDetectionService);
    }
}
