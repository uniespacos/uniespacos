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
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);
        $user = User::factory()->create(['setor_id' => $setor->id]);

        $html = (new SectorUpdatedNotification($setor, $user))->toMail($user)->render();

        $this->assertStringContainsString('/privacidade', $html);
        $this->assertStringContainsString('projur@uesb.edu.br', $html);
    }
}
