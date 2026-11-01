<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Reserva;
use App\Models\User;
use App\Notifications\ReservationUpdateFailedNotification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ReservationUpdateFailedIdiomaTest extends TestCase
{
    use DatabaseTransactions;

    public function test_notificacao_de_falha_usa_o_idioma_ativo_na_criacao(): void
    {
        $usuario = User::factory()->create();
        $reserva = Reserva::factory()->for($usuario)->create(['titulo' => 'Sala Azul']);
        $idiomaOriginal = app()->getLocale();

        try {
            app()->setLocale('en');
            $notificacao = new ReservationUpdateFailedNotification($reserva, $usuario);
            $assunto = $notificacao->toMail($usuario)->subject;
        } finally {
            app()->setLocale($idiomaOriginal);
        }

        $this->assertSame('en', $notificacao->locale);
        $this->assertSame('Failed to Update Reservation', $notificacao->titulo);
        $this->assertStringContainsString("reservation 'Sala Azul'", $notificacao->descricao);
        $this->assertSame('Failed to Update Reservation: Sala Azul', $assunto);
    }

    public function test_notificacao_de_falha_mantem_o_texto_em_portugues_no_idioma_padrao(): void
    {
        $usuario = User::factory()->create();
        $reserva = Reserva::factory()->for($usuario)->create(['titulo' => 'Sala Azul']);
        $idiomaOriginal = app()->getLocale();

        try {
            app()->setLocale('pt');
            $notificacao = new ReservationUpdateFailedNotification($reserva, $usuario);
            $assunto = $notificacao->toMail($usuario)->subject;
        } finally {
            app()->setLocale($idiomaOriginal);
        }

        $this->assertSame('pt', $notificacao->locale);
        $this->assertSame('Falha ao Atualizar Reserva', $notificacao->titulo);
        $this->assertSame('Falha ao Atualizar Reserva: Sala Azul', $assunto);
    }
}
