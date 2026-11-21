<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Repositories\HorarioRepositoryInterface;
use App\Services\TravaDeHorarios;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\ConnectionResolverInterface;
use LogicException;
use Mockery;
use PHPUnit\Framework\TestCase;

class TravaDeHorariosTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }

    private function conexoesComNivelDeTransacao(int $nivel): ConnectionResolverInterface
    {
        $conexao = Mockery::mock(ConnectionInterface::class);
        $conexao->shouldReceive('transactionLevel')->andReturn($nivel);

        $conexoes = Mockery::mock(ConnectionResolverInterface::class);
        $conexoes->shouldReceive('connection')->andReturn($conexao);

        return $conexoes;
    }

    public function test_adquirir_fora_de_transacao_falha_sem_pedir_o_lock(): void
    {
        $horarios = Mockery::mock(HorarioRepositoryInterface::class);
        $horarios->shouldNotReceive('bloquearPeriodo');

        $trava = new TravaDeHorarios($horarios, $this->conexoesComNivelDeTransacao(0));

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('transação');

        $trava->adquirir([1], '2026-11-02', '2026-11-06');
    }

    public function test_adquirir_dentro_de_transacao_trava_agendas_unicas_e_ordenadas(): void
    {
        $this->expectNotToPerformAssertions();

        $horarios = Mockery::mock(HorarioRepositoryInterface::class);
        $horarios->shouldReceive('bloquearPeriodo')
            ->once()
            ->with([1, 2], '2026-11-02', '2026-11-06');

        $trava = new TravaDeHorarios($horarios, $this->conexoesComNivelDeTransacao(1));

        $trava->adquirir(['2', 1, 2, 0], '2026-11-02', '2026-11-06');
    }

    public function test_adquirir_sem_agendas_validas_nao_trava_nada(): void
    {
        $this->expectNotToPerformAssertions();

        $horarios = Mockery::mock(HorarioRepositoryInterface::class);
        $horarios->shouldNotReceive('bloquearPeriodo');

        $trava = new TravaDeHorarios($horarios, $this->conexoesComNivelDeTransacao(1));

        $trava->adquirir([0], '2026-11-02', '2026-11-06');
    }
}
