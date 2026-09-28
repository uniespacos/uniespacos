<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\Agenda;
use App\Models\User;
use App\Services\AutoAprovacaoService;
use PHPUnit\Framework\TestCase;

/**
 * Regras de auto-aprovacao isoladas — sem banco, sem container.
 */
class AutoAprovacaoServiceTest extends TestCase
{
    private AutoAprovacaoService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AutoAprovacaoService;
    }

    public function test_resolvedor_situacao_horario_deferida_quando_dono_e_proprietario(): void
    {
        $proprietarioId = 123;
        $agenda = (new Agenda)->forceFill(['id' => 1, 'user_id' => $proprietarioId]);

        $situacao = $this->service->resolverSituacaoHorario($agenda, $proprietarioId);

        $this->assertSame('deferida', $situacao);
    }

    public function test_resolvedor_situacao_horario_em_analise_quando_usuario_diferente(): void
    {
        $proprietarioId = 123;
        $gestorId = 456;
        $agenda = (new Agenda)->forceFill(['id' => 1, 'user_id' => $gestorId]);

        $situacao = $this->service->resolverSituacaoHorario($agenda, $proprietarioId);

        $this->assertSame('em_analise', $situacao);
    }

    public function test_calculo_situacao_reserva_deferida_gestor_unico_e_proprietario(): void
    {
        $solicitanteId = 123;
        $gestor = (new User)->forceFill(['id' => $solicitanteId]);
        $gestoresUnicos = collect([$gestor]);

        $situacao = $this->service->calcularSituacaoReserva($gestoresUnicos, $solicitanteId);

        $this->assertSame('deferida', $situacao);
    }

    public function test_calculo_situacao_reserva_parcialmente_deferida_multiplos_gestores_inclui_proprietario(): void
    {
        $solicitanteId = 123;
        $gestor1 = (new User)->forceFill(['id' => $solicitanteId]);
        $gestor2 = (new User)->forceFill(['id' => 456]);
        $gestoresUnicos = collect([$gestor1, $gestor2]);

        $situacao = $this->service->calcularSituacaoReserva($gestoresUnicos, $solicitanteId);

        $this->assertSame('parcialmente_deferida', $situacao);
    }

    public function test_calculo_situacao_reserva_null_quando_proprietario_nao_e_gestor(): void
    {
        $solicitanteId = 123;
        $gestor1 = (new User)->forceFill(['id' => 456]);
        $gestor2 = (new User)->forceFill(['id' => 789]);
        $gestoresUnicos = collect([$gestor1, $gestor2]);

        $situacao = $this->service->calcularSituacaoReserva($gestoresUnicos, $solicitanteId);

        $this->assertNull($situacao);
    }

    public function test_calculo_situacao_reserva_null_quando_gestores_vazio(): void
    {
        $solicitanteId = 123;
        $gestoresUnicos = collect([]);

        $situacao = $this->service->calcularSituacaoReserva($gestoresUnicos, $solicitanteId);

        $this->assertNull($situacao);
    }
}
