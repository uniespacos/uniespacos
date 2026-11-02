<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Route as RouteFacade;
use Tests\TestCase;

class LimitesDeTaxaReservaTest extends TestCase
{
    use DatabaseTransactions;

    private const ROTAS_DE_RESERVA = [
        'reservas.store',
        'reservas.update',
        'reservas.destroy',
        'gestor.reservas.update',
    ];

    public function test_uso_normal_de_reservas_nao_responde_429(): void
    {
        $usuario = User::factory()->create();

        for ($i = 0; $i < 15; $i++) {
            $resposta = $this->actingAs($usuario)->post(route('reservas.store'), []);

            $this->assertNotSame(429, $resposta->status());
        }
    }

    public function test_rotas_de_reserva_nao_declaram_nenhum_limitador(): void
    {
        $encontradas = [];

        foreach (RouteFacade::getRoutes()->getRoutes() as $rota) {
            if (! in_array($rota->getName(), self::ROTAS_DE_RESERVA, true)) {
                continue;
            }

            $encontradas[] = $rota->getName();

            $limitadores = array_values(array_filter(
                $rota->gatherMiddleware(),
                fn (string $middleware): bool => str_starts_with($middleware, 'throttle'),
            ));

            $this->assertSame([], $limitadores, "Rota {$rota->getName()} não deveria ter limitador");
        }

        $this->assertCount(count(self::ROTAS_DE_RESERVA), $encontradas);
    }
}
