<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Tests\TestCase;

class RetencaoAgendamentoTest extends TestCase
{
    public function test_retencao_aplicar_esta_agendada_diariamente_as_0330_utc(): void
    {
        $this->artisan('schedule:list')->assertExitCode(0);

        $eventos = collect(app(Schedule::class)->events())
            ->filter(fn (Event $evento): bool => str_contains((string) $evento->command, 'retencao:aplicar'));

        $this->assertCount(1, $eventos);
        $this->assertSame('30 3 * * *', $eventos->first()?->expression);
    }

    public function test_retencao_aplicar_tem_trava_sem_sobreposicao_com_validade_de_60_minutos(): void
    {
        $evento = collect(app(Schedule::class)->events())
            ->first(fn (Event $evento): bool => str_contains((string) $evento->command, 'retencao:aplicar'));

        $this->assertInstanceOf(Event::class, $evento);
        $this->assertTrue($evento->withoutOverlapping);
        $this->assertSame(60, $evento->expiresAt);
    }
}
