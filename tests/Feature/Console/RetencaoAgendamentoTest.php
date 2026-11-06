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
}
