<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Events\ReservaEvent;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationCanceledNotification;
use App\Services\ReservaService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Issue #108 — eixo de arquivamento das listagens de reserva.
 *
 * Todos os modos de falha cobertos aqui são SILENCIOSOS: o sintoma é uma lista
 * vazia ou uma linha ausente, nunca um erro. Por isso as asserções são sobre o
 * payload Inertia, e não sobre markup.
 *
 * O caso central é o `arquivo=arquivadas` do usuário comum. Antes desta issue,
 * getPaginatedForUser aplicava `where('situacao', '!=', 'inativa')` de forma
 * incondicional e logo depois oferecia um filtro por situação — filtrar por
 * arquivadas produzia `situacao != 'inativa' AND situacao = 'inativa'`, uma
 * contradição lógica que devolvia lista vazia sem sinal nenhum de erro.
 */
class ReservaArquivamentoTest extends TestCase
{
    private function criarReserva(User $dono, User $gestorDaAgenda, string $situacao, string $titulo): Reserva
    {
        $espaco = Espaco::factory()->create();

        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestorDaAgenda->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'titulo' => $titulo,
            'situacao' => $situacao,
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => $situacao,
            'data' => now()->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return $reserva->fresh();
    }

    /**
     * @return array<int, string>
     */
    private function titulosNaListagem(AssertableInertia $page): array
    {
        /** @var array<int, array<string, mixed>> $linhas */
        $linhas = $page->toArray()['props']['reservas']['data'];

        return array_column($linhas, 'titulo');
    }

    // ---------------------------------------------------------------
    // Usuário comum
    // ---------------------------------------------------------------

    /** O bug central: antes da #108 esta consulta era uma contradição lógica. */
    public function test_usuario_comum_ve_suas_reservas_arquivadas(): void
    {
        $dono = User::factory()->create();
        $this->criarReserva($dono, User::factory()->create(), 'inativa', 'Cancelada');

        $response = $this->actingAs($dono)->get(route('reservas.index', ['arquivo' => 'arquivadas']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where(
            'reservas.data.0.titulo',
            'Cancelada'
        ));
    }

    /** Guarda do default: quem não mexe no filtro continua vendo o de sempre. */
    public function test_listagem_padrao_do_usuario_comum_esconde_arquivadas(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $this->criarReserva($dono, $gestor, 'em_analise', 'Ativa');
        $this->criarReserva($dono, $gestor, 'inativa', 'Cancelada');

        $response = $this->actingAs($dono)->get(route('reservas.index'));

        $response->assertOk();
        $response->assertInertia(function (AssertableInertia $page) {
            $titulos = $this->titulosNaListagem($page);

            $this->assertContains('Ativa', $titulos);
            $this->assertNotContains('Cancelada', $titulos);
        });
    }

    /** "Todas" passa a significar todas de verdade. */
    public function test_usuario_comum_com_todas_ve_ativas_e_arquivadas(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $this->criarReserva($dono, $gestor, 'em_analise', 'Ativa');
        $this->criarReserva($dono, $gestor, 'inativa', 'Cancelada');

        $response = $this->actingAs($dono)->get(route('reservas.index', ['arquivo' => 'todas']));

        $response->assertOk();
        $response->assertInertia(function (AssertableInertia $page) {
            $titulos = $this->titulosNaListagem($page);

            $this->assertContains('Ativa', $titulos);
            $this->assertContains('Cancelada', $titulos);
        });
    }

    /**
     * A #119 não pode regredir por este caminho: ver as próprias arquivadas
     * não pode virar ver as arquivadas dos outros.
     */
    public function test_usuario_comum_nao_ve_arquivada_de_outro_usuario(): void
    {
        $dono = User::factory()->create();
        $bisbilhoteiro = User::factory()->create();
        $this->criarReserva($dono, User::factory()->create(), 'inativa', 'Cancelada Alheia');

        $response = $this->actingAs($bisbilhoteiro)->get(route('reservas.index', ['arquivo' => 'todas']));

        $response->assertOk();
        $response->assertInertia(function (AssertableInertia $page) {
            $this->assertNotContains('Cancelada Alheia', $this->titulosNaListagem($page));
        });
    }

    // ---------------------------------------------------------------
    // Gestor
    // ---------------------------------------------------------------

    /** O "Todas" do gestor também estava quebrado — caía no default. */
    public function test_gestor_com_todas_ve_ativas_e_arquivadas(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $this->criarReserva($dono, $gestor, 'em_analise', 'Ativa');
        $this->criarReserva($dono, $gestor, 'inativa', 'Cancelada');

        $response = $this->actingAs($gestor)->get(route('gestor.reservas.index', ['arquivo' => 'todas']));

        $response->assertOk();
        $response->assertInertia(function (AssertableInertia $page) {
            $titulos = $this->titulosNaListagem($page);

            $this->assertContains('Ativa', $titulos);
            $this->assertContains('Cancelada', $titulos);
        });
    }

    // ---------------------------------------------------------------
    // Combinação de eixos, valores inválidos e URL legada
    // ---------------------------------------------------------------

    /** Separar os eixos existe para permitir exatamente isto. */
    public function test_arquivo_e_situacao_filtram_de_forma_independente(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $this->criarReserva($dono, $gestor, 'deferida', 'Deferida Ativa');
        $this->criarReserva($dono, $gestor, 'em_analise', 'Em Analise Ativa');

        $response = $this->actingAs($dono)->get(route('reservas.index', [
            'arquivo' => 'todas',
            'situacao' => 'deferida',
        ]));

        $response->assertOk();
        $response->assertInertia(function (AssertableInertia $page) {
            $titulos = $this->titulosNaListagem($page);

            $this->assertContains('Deferida Ativa', $titulos);
            $this->assertNotContains('Em Analise Ativa', $titulos);
        });
    }

    /**
     * Valor inválido cai no default em vez de esvaziar a lista. Sem isso,
     * `?arquivo=xyz` devolveria uma tela vazia sem explicação.
     */
    public function test_valor_invalido_de_arquivo_cai_no_padrao(): void
    {
        $dono = User::factory()->create();
        $this->criarReserva($dono, User::factory()->create(), 'em_analise', 'Ativa');

        $response = $this->actingAs($dono)->get(route('reservas.index', ['arquivo' => 'xyz']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('reservas.data.0.titulo', 'Ativa')
            ->where('filters.arquivo', 'ativas')
        );
    }

    /** Idem para uma situação que não existe no enum. */
    public function test_valor_invalido_de_situacao_e_descartado(): void
    {
        $dono = User::factory()->create();
        $this->criarReserva($dono, User::factory()->create(), 'em_analise', 'Ativa');

        $response = $this->actingAs($dono)->get(route('reservas.index', ['situacao' => 'nao_existe']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('reservas.data.0.titulo', 'Ativa')
            ->where('filters.situacao', null)
        );
    }

    /**
     * Compatibilidade: antes da #108 o gestor via arquivadas por
     * `?situacao=inativa`. Sem tradução, essa URL passaria a colidir com o
     * default de `arquivo` e devolveria lista vazia — o mesmo bug, de volta
     * pela porta dos fundos. Vale para favoritos, histórico e links salvos.
     */
    public function test_url_legada_com_situacao_inativa_ainda_mostra_arquivadas(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $this->criarReserva($dono, $gestor, 'inativa', 'Cancelada');

        $response = $this->actingAs($gestor)->get(route('gestor.reservas.index', ['situacao' => 'inativa']));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('reservas.data.0.titulo', 'Cancelada')
            ->where('filters.arquivo', 'arquivadas')
            ->where('filters.situacao', null)
        );
    }

    /** Um `arquivo` explícito vence o parâmetro legado. */
    public function test_arquivo_explicito_prevalece_sobre_a_url_legada(): void
    {
        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $this->criarReserva($dono, $gestor, 'em_analise', 'Ativa');

        $response = $this->actingAs($gestor)->get(route('gestor.reservas.index', [
            'situacao' => 'inativa',
            'arquivo' => 'ativas',
        ]));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('reservas.data.0.titulo', 'Ativa')
            ->where('filters.arquivo', 'ativas')
        );
    }

    // ---------------------------------------------------------------
    // Idempotência do cancelamento
    // ---------------------------------------------------------------

    /**
     * ReservaPolicy::delete não checa situação, então recancelar era possível e
     * disparava outra rodada de notificações a todos os gestores. Enquanto as
     * arquivadas eram invisíveis o caminho era inalcançável pela UI; com o
     * filtro novo, deixa de ser.
     */
    public function test_cancelar_reserva_ja_arquivada_nao_notifica_de_novo(): void
    {
        Notification::fake();

        $dono = User::factory()->create();
        $reserva = $this->criarReserva($dono, User::factory()->create(), 'inativa', 'Cancelada');

        app(ReservaService::class)->cancel($reserva, $dono);

        Notification::assertNothingSent();
    }

    /** A guarda não pode ter matado o cancelamento legítimo. */
    public function test_cancelar_reserva_ativa_continua_notificando(): void
    {
        Notification::fake();

        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $reserva = $this->criarReserva($dono, $gestor, 'em_analise', 'Ativa');

        app(ReservaService::class)->cancel($reserva, $dono);

        Notification::assertSentTo($gestor, ReservationCanceledNotification::class);
        $this->assertSame('inativa', $reserva->fresh()->situacao);
    }

    /** Ao cancelar uma reserva, um evento de WebSocket é disparado. */
    public function test_cancelar_reserva_dispara_evento_websocket(): void
    {
        Event::fake();

        $dono = User::factory()->create();
        $gestor = User::factory()->create();
        $reserva = $this->criarReserva($dono, $gestor, 'em_analise', 'Ativa');

        app(ReservaService::class)->cancel($reserva, $dono);

        Event::assertDispatched(ReservaEvent::class, function ($event) use ($reserva) {
            return $event->action === 'canceled' && $event->reservaId === $reserva->id;
        });
    }
}
