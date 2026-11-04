<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Events\ReservaAlterada;
use App\Events\ReservaEvent;
use App\Jobs\AvaliarReservaJob;
use App\Jobs\ProcessarCriacaoReserva;
use App\Jobs\UpdateReservaJob;
use App\Jobs\ValidateReservationConflictsJob;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\NewReservationNotification;
use App\Notifications\ReservationCanceledNotification;
use App\Notifications\ReservationCreatedNotification;
use App\Notifications\ReservationEvaluatedNotification;
use App\Notifications\ReservationFailedNotification;
use App\Notifications\ReservationUpdatedNotification;
use App\Services\ReservaBroadcaster;
use App\Services\ReservaService;
use Carbon\Carbon;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Contracts\Queue\Job;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\BroadcasterEmMemoria;
use Tests\Support\BroadcasterQueFalha;
use Tests\TestCase;

/**
 * Falha do broadcast de reserva não pode decidir o desfecho dos jobs nem da request.
 *
 * O broadcaster é trocado em runtime por um que lança BroadcastException, então
 * a suíte não depende do container Reverb nem de BROADCAST_CONNECTION do ambiente.
 * O spy de Job garante que `fail()` (que o worker usa para gravar failed_jobs) nunca é chamado.
 */
class ReservaBroadcastFalhaTest extends TestCase
{
    private const DATA_RESERVA = '2026-07-06';

    private const TIPOS_RELATORIOS_DE_RESERVA = [
        TipoRelatorioEnum::RESERVAS_PERIODO,
        TipoRelatorioEnum::OCUPACAO_ESPACOS,
        TipoRelatorioEnum::INDICADORES_CONSOLIDADOS,
    ];

    private BroadcasterQueFalha $broadcasterQueFalha;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-06-15 10:00:00');

        $this->broadcasterQueFalha = new BroadcasterQueFalha;
        $this->usarBroadcaster($this->broadcasterQueFalha);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function usarBroadcaster(object $broadcaster): void
    {
        $manager = app(BroadcastManager::class);
        $manager->extend('teste_reserva', fn () => $broadcaster);

        config([
            'broadcasting.default' => 'teste_reserva',
            'broadcasting.connections.teste_reserva' => ['driver' => 'teste_reserva'],
        ]);

        $manager->forgetDrivers();
    }

    private function espelhoDoJobNaFila(object $job): Job
    {
        $filaSpy = Mockery::spy(Job::class);
        $job->setJob($filaSpy);

        return $filaSpy;
    }

    /**
     * @return array<string, int>
     */
    private function versoesDosRelatoriosDeReserva(): array
    {
        $versoes = [];
        foreach (self::TIPOS_RELATORIOS_DE_RESERVA as $tipo) {
            $versoes[$tipo->value] = $this->versaoDoCache($tipo->value);
        }

        return $versoes;
    }

    private function versaoDoCache(string $tipo): int
    {
        return (int) (Cache::get("relatorio_version:{$tipo}") ?? 1);
    }

    /**
     * @param  array<string, int>  $versoesAntes
     */
    private function assertCacheDeRelatoriosFoiInvalidado(array $versoesAntes): void
    {
        foreach ($versoesAntes as $tipo => $versaoAntes) {
            $this->assertGreaterThan(
                $versaoAntes,
                $this->versaoDoCache($tipo),
                "Cache de relatório {$tipo} deveria ter sido invalidado mesmo com o broadcast quebrado.",
            );
        }
    }

    #[Test]
    public function criar_reserva_com_broadcast_quebrado_nao_falha_o_job_nem_pula_notificacoes(): void
    {
        Notification::fake();

        $solicitante = User::factory()->create();
        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

        $horarios = [[
            'agenda_id' => $agenda->id,
            'horario_inicio' => '07:30:00',
            'horario_fim' => '08:20:00',
            'data' => self::DATA_RESERVA,
        ]];

        $dados = [
            'titulo' => 'Reserva com broadcast quebrado',
            'descricao' => 'Descricao',
            'data_inicial' => '2026-07-06T03:00:00.000Z',
            'data_final' => '2026-07-06T03:00:00.000Z',
            'recorrencia' => 'unica',
            'horarios' => $horarios,
            'horarios_solicitados' => $horarios,
        ];

        $versoesAntes = $this->versoesDosRelatoriosDeReserva();

        $job = new ProcessarCriacaoReserva($dados, $solicitante);
        $filaSpy = $this->espelhoDoJobNaFila($job);

        app()->call([$job, 'handle']);

        $this->assertGreaterThan(0, $this->broadcasterQueFalha->tentativas);
        $filaSpy->shouldNotHaveReceived('fail');
        Notification::assertSentTo($solicitante, ReservationCreatedNotification::class);
        Notification::assertSentTo($gestor, NewReservationNotification::class);
        Notification::assertNotSentTo($solicitante, ReservationFailedNotification::class);
        $this->assertDatabaseHas('reservas', ['titulo' => 'Reserva com broadcast quebrado', 'user_id' => $solicitante->id]);
        $this->assertCacheDeRelatoriosFoiInvalidado($versoesAntes);
    }

    #[Test]
    public function avaliar_reserva_com_broadcast_quebrado_notifica_solicitante_e_revalida_conflitos(): void
    {
        Notification::fake();
        Queue::fake([ValidateReservationConflictsJob::class]);

        $gestor = User::factory()->create();
        $solicitante = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);

        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'situacao' => 'em_analise',
        ]);
        $horario = Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => self::DATA_RESERVA,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $concorrente = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
            'situacao' => 'em_analise',
            'validation_status' => 'completed',
        ]);
        Horario::factory()->create([
            'reserva_id' => $concorrente->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => self::DATA_RESERVA,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $validatedData = [
            'evaluation_scope' => 'single',
            'motivo' => null,
            'horarios_avaliados' => [['id' => $horario->id, 'status' => 'deferida']],
            'observacao' => 'Aprovada',
        ];

        $versoesAntes = $this->versoesDosRelatoriosDeReserva();

        $job = new AvaliarReservaJob($reserva, $validatedData, $gestor);
        $filaSpy = $this->espelhoDoJobNaFila($job);

        app()->call([$job, 'handle']);

        $this->assertGreaterThan(0, $this->broadcasterQueFalha->tentativas);
        $filaSpy->shouldNotHaveReceived('fail');
        $this->assertSame('deferida', $reserva->fresh()->situacao);
        Notification::assertSentTo($solicitante, ReservationEvaluatedNotification::class);
        Queue::assertPushed(
            ValidateReservationConflictsJob::class,
            fn (ValidateReservationConflictsJob $validacao): bool => $validacao->reserva->id === $concorrente->id,
        );
        $this->assertCacheDeRelatoriosFoiInvalidado($versoesAntes);
    }

    #[Test]
    public function atualizar_reserva_com_broadcast_quebrado_nao_falha_o_job(): void
    {
        Notification::fake();

        $dono = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => User::factory()->create()->id]);
        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'titulo' => 'Titulo original',
            'data_inicial' => self::DATA_RESERVA,
            'data_final' => self::DATA_RESERVA,
            'recorrencia' => 'unica',
        ]);

        $slot = [
            'data' => self::DATA_RESERVA,
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
            'agenda_id' => $agenda->id,
        ];

        $dados = [
            'titulo' => 'Titulo atualizado',
            'descricao' => 'Descricao atualizada',
            'data_inicial' => self::DATA_RESERVA,
            'data_final' => self::DATA_RESERVA,
            'recorrencia' => 'unica',
            'edit_scope' => 'recurring',
            'edited_week_date' => self::DATA_RESERVA,
            'horarios_solicitados' => [$slot],
        ];

        $versoesAntes = $this->versoesDosRelatoriosDeReserva();

        $job = new UpdateReservaJob($reserva, $dados, $dono);
        $filaSpy = $this->espelhoDoJobNaFila($job);

        app()->call([$job, 'handle']);

        $this->assertGreaterThan(0, $this->broadcasterQueFalha->tentativas);
        $filaSpy->shouldNotHaveReceived('fail');
        $this->assertSame('Titulo atualizado', $reserva->fresh()->titulo);
        Notification::assertSentTo($dono, ReservationUpdatedNotification::class);
        $this->assertCacheDeRelatoriosFoiInvalidado($versoesAntes);
    }

    #[Test]
    public function validacao_de_conflitos_com_broadcast_quebrado_termina_completed(): void
    {
        $reserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
            'validation_status' => 'processing',
            'conflict_cache' => null,
        ]);

        $job = new ValidateReservationConflictsJob($reserva);
        $filaSpy = $this->espelhoDoJobNaFila($job);

        app()->call([$job, 'handle']);

        $this->assertGreaterThan(0, $this->broadcasterQueFalha->tentativas);
        $filaSpy->shouldNotHaveReceived('fail');
        $reserva->refresh();
        $this->assertSame('completed', $reserva->validation_status);
        $this->assertIsArray($reserva->conflict_cache);
    }

    #[Test]
    public function cancelar_reserva_com_broadcast_quebrado_nao_lanca_e_persiste_inativa(): void
    {
        Notification::fake();

        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);
        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => 'em_analise',
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => self::DATA_RESERVA,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        $versoesAntes = $this->versoesDosRelatoriosDeReserva();

        app(ReservaService::class)->cancel($reserva, $dono);

        $this->assertGreaterThan(0, $this->broadcasterQueFalha->tentativas);
        $this->assertSame('inativa', $reserva->fresh()->situacao);
        $this->assertSame(['inativa'], $reserva->horarios()->distinct()->pluck('situacao')->all());
        Notification::assertSentTo($gestor, ReservationCanceledNotification::class);
        $this->assertCacheDeRelatoriosFoiInvalidado($versoesAntes);
    }

    #[Test]
    public function falha_do_broadcaster_vira_warning_sem_mensagem_da_excecao(): void
    {
        Log::spy();

        $reserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        app(ReservaBroadcaster::class)->publicar($reserva, 'canceled');

        Log::shouldHaveReceived('warning')
            ->once()
            ->with(
                'Falha ao publicar evento de reserva em tempo real',
                [
                    'reserva_id' => $reserva->id,
                    'acao' => 'canceled',
                    'exception_class' => BroadcastException::class,
                ],
            );
    }

    #[Test]
    public function publicar_envia_uma_vez_o_payload_atual_quando_o_broadcaster_funciona(): void
    {
        $emMemoria = new BroadcasterEmMemoria;
        $this->usarBroadcaster($emMemoria);

        $gestor = User::factory()->create();
        $espaco = Espaco::factory()->create();
        $agenda = Agenda::factory()->create([
            'user_id' => $gestor->id,
            'espaco_id' => $espaco->id,
        ]);
        $reserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => self::DATA_RESERVA,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'data' => '2026-07-07',
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
        ]);

        app(ReservaBroadcaster::class)->publicar($reserva, 'created');

        $this->assertCount(1, $emMemoria->envios);
        $this->assertSame('reserva-event', $emMemoria->envios[0]['nome']);
        $this->assertSame(
            [
                'action' => 'created',
                'reservaId' => $reserva->id,
                'espacoId' => $espaco->id,
                'horariosCount' => 2,
            ],
            Arr::only($emMemoria->envios[0]['payload'], ['action', 'reservaId', 'espacoId', 'horariosCount']),
        );
    }

    #[Test]
    public function validacao_de_conflitos_nao_dispara_alteracao_de_relatorio(): void
    {
        Event::fake([ReservaAlterada::class]);

        $reserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        app(ReservaBroadcaster::class)->publicar($reserva, 'validated');

        Event::assertNotDispatched(ReservaAlterada::class);
    }

    #[Test]
    public function publicar_dispara_reserva_event_uma_vez_com_os_dados_da_reserva(): void
    {
        Event::fake([ReservaEvent::class]);

        $reserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        app(ReservaBroadcaster::class)->publicar($reserva, 'evaluated');

        Event::assertDispatchedTimes(ReservaEvent::class, 1);
        Event::assertDispatched(ReservaEvent::class, function (ReservaEvent $evento) use ($reserva): bool {
            return $evento->action === 'evaluated' && $evento->reservaId === $reserva->id;
        });
    }
}
