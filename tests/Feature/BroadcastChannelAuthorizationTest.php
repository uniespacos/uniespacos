<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Espaco;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BroadcastChannelAuthorizationTest extends TestCase
{
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

        // Com Opção A: deve retornar 200 e dados de autorização
        $response->assertOk();
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

        // Sem autenticação, nem tenta entrar no callback — Laravel retorna erro
        $this->assertTrue(
            $response->status() === 401 || $response->status() === 403,
            "Requisição não autenticada deve ser negada (recebeu {$response->status()})"
        );
    }
}
