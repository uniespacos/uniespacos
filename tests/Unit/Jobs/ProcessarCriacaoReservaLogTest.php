<?php

declare(strict_types=1);

namespace Tests\Unit\Jobs;

use App\Jobs\ProcessarCriacaoReserva;
use App\Models\User;
use Illuminate\Log\Logger;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\Logger as MonologLogger;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProcessarCriacaoReservaLogTest extends TestCase
{
    #[Test]
    public function logs_do_job_nao_carregam_o_titulo_da_reserva(): void
    {
        $canario = 'Titulo canario '.bin2hex(random_bytes(8));
        $solicitante = User::factory()->create();

        $capturado = new TestHandler;
        Log::swap(new Logger(new MonologLogger('teste', [$capturado])));

        $job = new ProcessarCriacaoReserva([
            'titulo' => $canario,
            'descricao' => 'Descricao',
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-01',
            'recorrencia' => 'nenhuma',
            'horarios_solicitados' => [],
        ], $solicitante);

        app()->call([$job, 'handle']);

        $registrosDoJob = array_values(array_filter(
            $capturado->getRecords(),
            fn ($registro) => str_starts_with($registro['message'], 'ProcessarCriacaoReserva'),
        ));

        $this->assertCount(2, $registrosDoJob);

        foreach ($registrosDoJob as $registro) {
            $this->assertArrayNotHasKey('titulo', $registro['context']);
            $this->assertStringNotContainsString($canario, json_encode(
                array_diff_key($registro['context'], ['exception' => true]),
                JSON_THROW_ON_ERROR,
            ));
            $this->assertSame($solicitante->id, $registro['context']['solicitante_id']);
        }
    }
}
