<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Instituicao;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use App\Notifications\SectorUpdatedNotification;
use Tests\TestCase;

class EmailLayoutPrivacidadeTest extends TestCase
{
    public function test_rodape_do_layout_de_email_contem_link_para_politica_de_privacidade_e_contato_juridico(): void
    {
        config(['privacidade.pagina_habilitada' => true]);

        $html = $this->renderizarEmail();

        $this->assertStringContainsString('/privacidade', $html);
        $this->assertStringContainsString('projur@uesb.edu.br', $html);
    }

    public function test_rodape_do_layout_de_email_omite_link_para_politica_de_privacidade_quando_a_pagina_esta_desligada(): void
    {
        config(['privacidade.pagina_habilitada' => false]);

        $html = $this->renderizarEmail();

        $this->assertStringNotContainsString('/privacidade', $html);
        $this->assertStringContainsString('projur@uesb.edu.br', $html);
    }

    private function renderizarEmail(): string
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);
        $user = User::factory()->create(['setor_id' => $setor->id]);

        return (new SectorUpdatedNotification($setor, $user))->toMail($user)->render();
    }
}
