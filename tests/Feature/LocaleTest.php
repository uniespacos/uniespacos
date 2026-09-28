<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class LocaleTest extends TestCase
{
    public function test_can_switch_locale_to_english(): void
    {
        $response = $this->post(route('locale.update', ['locale' => 'en']));

        $response->assertRedirect();
        $response->assertSessionHas('locale', 'en');
    }

    public function test_can_switch_locale_to_spanish(): void
    {
        $response = $this->post(route('locale.update', ['locale' => 'es']));

        $response->assertRedirect();
        $response->assertSessionHas('locale', 'es');
    }

    public function test_can_switch_locale_to_portuguese(): void
    {
        $response = $this->post(route('locale.update', ['locale' => 'pt-BR']));

        $response->assertRedirect();
        $response->assertSessionHas('locale', 'pt-BR');
    }

    public function test_ignores_unsupported_locale(): void
    {
        $response = $this->withSession(['locale' => 'pt-BR'])
            ->post(route('locale.update', ['locale' => 'fr']));

        $response->assertRedirect();
        $response->assertSessionHas('locale', 'pt-BR');
    }
}
