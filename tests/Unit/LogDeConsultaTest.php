<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\LogDeConsulta;
use Illuminate\Database\Connection;
use Illuminate\Events\Dispatcher;
use Illuminate\Log\Logger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\Logger as MonologLogger;
use Monolog\LogRecord;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LogDeConsultaTest extends TestCase
{
    private TestHandler $capturado;

    private Connection $conexao;

    private \Illuminate\Contracts\Events\Dispatcher $dispatcherOriginal;

    protected function setUp(): void
    {
        parent::setUp();

        $this->capturado = new TestHandler;
        Log::swap(new Logger(new MonologLogger('teste', [$this->capturado])));

        $this->conexao = DB::connection();
        $this->dispatcherOriginal = $this->conexao->getEventDispatcher();
        $this->conexao->setEventDispatcher(new Dispatcher($this->app));
    }

    protected function tearDown(): void
    {
        $this->conexao->setEventDispatcher($this->dispatcherOriginal);

        parent::tearDown();
    }

    #[Test]
    public function sem_flag_nao_registra_consultas_em_development(): void
    {
        LogDeConsulta::configurar('development', false, $this->conexao);

        $this->conexao->select('select ? as valor', ['segredo-consulta']);

        $this->assertSame([], $this->registrosDeConsulta());
    }

    #[Test]
    public function com_flag_registra_consultas_em_development(): void
    {
        LogDeConsulta::configurar('development', true, $this->conexao);

        $this->conexao->select('select ? as valor', ['valor-consulta']);

        $registros = $this->registrosDeConsulta();
        $this->assertCount(1, $registros);
        $this->assertSame('select ? as valor', $registros[0]->message);
    }

    #[Test]
    public function com_flag_registra_consultas_em_local(): void
    {
        LogDeConsulta::configurar('local', true, $this->conexao);

        $this->conexao->select('select 1');

        $this->assertCount(1, $this->registrosDeConsulta());
    }

    #[Test]
    public function com_flag_nao_registra_em_production(): void
    {
        LogDeConsulta::configurar('production', true, $this->conexao);

        $this->conexao->select('select ?', ['valor-producao']);

        $this->assertSame([], $this->registrosDeConsulta());
    }

    #[Test]
    public function com_flag_nao_registra_em_staging(): void
    {
        LogDeConsulta::configurar('staging', true, $this->conexao);

        $this->conexao->select('select ?', ['valor-staging']);

        $this->assertSame([], $this->registrosDeConsulta());
    }

    #[Test]
    public function com_flag_nao_registra_em_testing(): void
    {
        LogDeConsulta::configurar('testing', true, $this->conexao);

        $this->conexao->select('select ?', ['valor-teste']);

        $this->assertSame([], $this->registrosDeConsulta());
    }

    /**
     * @return array<int, LogRecord>
     */
    private function registrosDeConsulta(): array
    {
        return array_values(array_filter(
            $this->capturado->getRecords(),
            fn (LogRecord $registro): bool => str_contains($registro->message, 'select'),
        ));
    }
}
