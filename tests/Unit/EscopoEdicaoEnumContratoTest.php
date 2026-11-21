<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\Reserva\EscopoEdicaoEnum;
use PHPUnit\Framework\TestCase;

class EscopoEdicaoEnumContratoTest extends TestCase
{
    public function test_escopo_edicao_enum_esta_estritamente_sincronizado(): void
    {
        $caminho = dirname(__DIR__, 2).'/resources/js/contracts/recorrencia.contract.ts';
        $conteudo = file_get_contents($caminho);
        $this->assertIsString($conteudo);
        $this->assertSame(
            1,
            preg_match('/export\s+const\s+EscopoRecorrencia\s*=\s*\{([^}]+)\}/s', $conteudo, $bloco),
            'Constante EscopoRecorrencia não encontrada em recorrencia.contract.ts',
        );
        $this->assertGreaterThan(0, preg_match_all("/([A-Z_]+)\s*:\s*'([^']+)'/", $bloco[1], $pares, PREG_SET_ORDER));

        $tsValues = [];
        foreach ($pares as $par) {
            $tsValues[$par[1]] = $par[2];
        }

        $phpValues = [];
        foreach (EscopoEdicaoEnum::cases() as $caso) {
            $phpValues[$caso->name] = $caso->value;
        }

        $this->assertSame($phpValues, $tsValues, 'Mismatch entre EscopoEdicaoEnum (PHP) e EscopoRecorrencia (TS)');
    }
}
