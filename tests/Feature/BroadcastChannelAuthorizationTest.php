<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Events\ReservaEvent;
use App\Models\Espaco;
use App\Models\User;
use Illuminate\Broadcasting\Broadcasters\NullBroadcaster;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Support\Facades\Broadcast;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Autorização dos canais privados em /broadcasting/auth.
 *
 * O `phpunit.xml` fixa BROADCAST_CONNECTION=null, e o broadcaster `null` autoriza
 * qualquer canal sem consultar `routes/channels.php`. Para exercitar a autorização
 * de verdade, o setUp configura em runtime um broadcaster `reverb` com credenciais
 * fake (nenhuma conexão de rede é feita na autenticação do canal) e recarrega as
 * definições de canais nele. Assim a suíte independe do container Reverb e do
 * valor de BROADCAST_CONNECTION do ambiente.
 */
class BroadcastChannelAuthorizationTest extends TestCase
{
    private const FAKE_KEY = 'fake-app-key';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb' => [
                'driver' => 'reverb',
                'key' => self::FAKE_KEY,
                'secret' => 'fake-app-secret',
                'app_id' => 'fake-app-id',
                'options' => [
                    'host' => 'reverb.invalid',
                    'port' => 9000,
                    'scheme' => 'http',
                    'useTLS' => false,
                ],
            ],
        ]);

        $this->recarregarCanais();
    }

    protected function tearDown(): void
    {
        config(['broadcasting.default' => 'null']);
        $this->recarregarCanais();

        parent::tearDown();
    }

    /**
     * Descarta os drivers já instanciados e registra de novo os canais no driver atual.
     */
    private function recarregarCanais(): void
    {
        $manager = app(BroadcastManager::class);
        $manager->forgetDrivers();

        require base_path('routes/channels.php');
    }

    #[Test]
    public function setup_usa_broadcaster_que_realmente_autoriza_canais(): void
    {
        // Guarda contra o falso positivo: com o driver `null` tudo daria 200.
        $this->assertSame('reverb', config('broadcasting.default'));
        $this->assertNotSame('null', config('broadcasting.default'));
    }

    #[Test]
    public function authenticated_user_can_subscribe_to_espaco_channel_with_opção_a(): void
    {
        // Este teste assume OPÇÃO A (qualquer autenticado, espaço existe).
        // Se OPÇÃO B for escolhida, alterar para: criar user, conceder espacos.visualizar,
        // e validar que sem permissão recebe 403.

        $user = User::factory()->create();
        $espaco = Espaco::factory()->create();

        $response = $this->actingAs($user)->postJson('/broadcasting/auth', [
            'channel_name' => "private-App.Models.Espaco.{$espaco->id}",
            'socket_id' => '123456.1',
        ]);

        // Com Opção A: 200 e assinatura gerada com a chave do app
        $response->assertOk();
        $auth = $response->json('auth');
        $this->assertIsString($auth);
        $this->assertStringStartsWith(self::FAKE_KEY.':', $auth);
    }

    #[Test]
    public function nonexistent_espaco_channel_returns_403(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/broadcasting/auth', [
            'channel_name' => 'private-App.Models.Espaco.999999',
            'socket_id' => '123456.1',
        ]);

        $response->assertForbidden();
    }

    #[Test]
    public function unauthenticated_request_does_not_authorize(): void
    {
        // Criar um usuário primeiro para que o factory de Espaco tenha um gestor disponível
        User::factory()->create();
        $espaco = Espaco::factory()->create();

        $response = $this->postJson('/broadcasting/auth', [
            'channel_name' => "private-App.Models.Espaco.{$espaco->id}",
            'socket_id' => '123456.1',
        ]);

        // Sem autenticação, o broadcaster nega antes de tentar o callback do canal.
        $this->assertContains(
            $response->status(),
            [401, 403],
            "Requisição não autenticada deve ser negada (recebeu {$response->status()})"
        );
        $this->assertArrayNotHasKey('auth', $response->json() ?? []);
    }

    #[Test]
    public function user_channel_only_authorizes_the_owner(): void
    {
        $dono = User::factory()->create();
        $outro = User::factory()->create();

        $this->actingAs($dono)->postJson('/broadcasting/auth', [
            'channel_name' => "private-App.Models.User.{$dono->id}",
            'socket_id' => '123456.1',
        ])->assertOk();

        $this->actingAs($dono)->postJson('/broadcasting/auth', [
            'channel_name' => "private-App.Models.User.{$outro->id}",
            'socket_id' => '123456.1',
        ])->assertForbidden();
    }

    #[Test]
    public function reserva_event_segue_despachavel_com_broadcaster_nulo(): void
    {
        // Restaura o broadcaster padrão da suíte (null) e confirma que o evento
        // ShouldBroadcastNow não depende de Reverb para ser disparado.
        config(['broadcasting.default' => 'null']);
        app(BroadcastManager::class)->forgetDrivers();

        $this->assertSame('null', config('broadcasting.default'));

        event(new ReservaEvent(
            action: 'created',
            reservaId: 1,
            espacoId: 2,
            horariosCount: 1,
        ));

        $this->assertInstanceOf(NullBroadcaster::class, Broadcast::driver());
    }
}
