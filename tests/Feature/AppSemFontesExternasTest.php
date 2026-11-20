<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class AppSemFontesExternasTest extends TestCase
{
    public function test_tela_de_login_nao_referencia_provedor_externo_de_fontes(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertDontSee('fonts.bunny.net')
            ->assertDontSee('bunny.net')
            ->assertDontSee('fonts.googleapis.com')
            ->assertDontSee('fonts.gstatic.com');
    }
}
