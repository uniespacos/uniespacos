<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\SemanaDeReferencia;
use Illuminate\Support\Facades\Validator;
use InvalidArgumentException;
use Tests\Concerns\CongelaRelogio;
use Tests\TestCase;

class SemanaDeReferenciaTest extends TestCase
{
    use CongelaRelogio;

    public function test_null_resolve_para_a_semana_de_hoje(): void
    {
        $this->congelarRelogio('2026-11-18 10:00:00');

        $semana = SemanaDeReferencia::de(null);

        $this->assertSame('2026-11-16', $semana->inicio);
        $this->assertSame('2026-11-22', $semana->fim);
        $this->assertSame('2026-11-18', $semana->referencia);
    }

    public function test_today_resolve_para_a_semana_de_hoje(): void
    {
        $this->assertEquals(SemanaDeReferencia::de(null), SemanaDeReferencia::de('today'));
    }

    public function test_segunda_feira_inicia_a_propria_semana(): void
    {
        $semana = SemanaDeReferencia::de('2026-11-16');

        $this->assertSame('2026-11-16', $semana->inicio);
        $this->assertSame('2026-11-22', $semana->fim);
        $this->assertSame('2026-11-16', $semana->referencia);
    }

    public function test_domingo_pertence_a_semana_que_comecou_na_segunda_anterior(): void
    {
        $semana = SemanaDeReferencia::de('2026-11-22');

        $this->assertSame('2026-11-16', $semana->inicio);
        $this->assertSame('2026-11-22', $semana->fim);
        $this->assertSame('2026-11-22', $semana->referencia);
    }

    public function test_para_props_expoe_o_formato_que_o_frontend_consome(): void
    {
        $this->congelarRelogio('2026-11-18 10:00:00');

        $this->assertSame(
            ['inicio' => '2026-11-16', 'fim' => '2026-11-22', 'referencia' => '2026-11-18'],
            SemanaDeReferencia::de(null)->paraProps(),
        );
    }

    public function test_horizonte_de_conflito_parte_do_fim_da_semana(): void
    {
        $this->assertSame('2026-12-27', SemanaDeReferencia::de('2026-11-18')->horizonteDeConflito());
    }

    public function test_horizonte_a_partir_da_referencia_usa_a_data_de_referencia(): void
    {
        $this->assertSame('2026-12-20', SemanaDeReferencia::de('2026-11-18')->horizonteDeConflitoAPartirDaReferencia());
    }

    public function test_data_inexistente_lanca_excecao_previsivel(): void
    {
        $this->expectException(InvalidArgumentException::class);

        SemanaDeReferencia::de('2026-02-30');
    }

    public function test_texto_qualquer_lanca_excecao_previsivel(): void
    {
        $this->expectException(InvalidArgumentException::class);

        SemanaDeReferencia::de('abc');
    }

    public function test_data_com_hora_lanca_excecao_previsivel(): void
    {
        $this->expectException(InvalidArgumentException::class);

        SemanaDeReferencia::de('2026-11-18 10:00:00');
    }

    public function test_regras_aceitam_ausencia_hoje_e_data_iso(): void
    {
        foreach ([null, 'today', '2026-11-18'] as $valor) {
            $this->assertFalse(
                Validator::make(['semana' => $valor], ['semana' => SemanaDeReferencia::regras()])->fails(),
                'Deveria aceitar '.var_export($valor, true),
            );
        }
    }

    public function test_regras_rejeitam_formato_invalido_e_arrays(): void
    {
        foreach (['abc', '2026-02-30', '18/11/2026', 'tomorrow', ['x'], 'x'] as $valor) {
            $this->assertTrue(
                Validator::make(['semana' => $valor], ['semana' => SemanaDeReferencia::regras()])->fails(),
                'Deveria rejeitar '.json_encode($valor),
            );
        }
    }
}
