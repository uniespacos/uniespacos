<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class ReservaCreateRemovidoTest extends TestCase
{
    public function test_get_reservas_create_nao_existe(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/reservas/create')
            ->assertNotFound();
    }
}
