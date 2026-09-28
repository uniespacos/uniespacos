<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\Agenda\AgendaEnum;
use App\Enums\ErrorCode;
use App\Enums\Relatorio\FormatoRelatorioEnum;
use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Enums\Reserva\RecorrenciaReservaEnum;
use App\Enums\Reserva\ValidationStatusEnum;
use App\Enums\SituacaoReserva\ModoArquivoEnum;
use App\Enums\SituacaoReserva\OrdenacaoReservaEnum;
use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use PHPUnit\Framework\TestCase;

/**
 * Validação de integridade entre Enums do Backend e Contratos SSOT do Frontend (TypeScript).
 *
 * Garante que qualquer alteração de Enum no PHP ou de Contrato no TS quebre a esteira
 * se não for sincronizada bilateralmente.
 */
class ContractsSyncTest extends TestCase
{
    private string $contractsBasePath;

    protected function setUp(): void
    {
        parent::setUp();
        $this->contractsBasePath = dirname(__DIR__, 2).'/resources/js/contracts';
    }

    public function test_situacao_reserva_enum_esta_estritamente_sincronizado(): void
    {
        $filePath = "{$this->contractsBasePath}/situacao-reserva.contract.ts";
        $tsValues = $this->parseTypeScriptConstObject($filePath, 'SituacaoReserva');

        $phpEnumCases = SituacaoReservaEnum::cases();
        $phpValues = array_combine(
            array_map(fn ($case) => $case->name, $phpEnumCases),
            array_map(fn ($case) => $case->value, $phpEnumCases)
        );

        $this->assertSame($phpValues, $tsValues, 'Mismatch entre SituacaoReservaEnum (PHP) e SituacaoReserva (TS)');
    }

    public function test_modo_arquivo_enum_esta_estritamente_sincronizado(): void
    {
        $filePath = "{$this->contractsBasePath}/modo-arquivo.contract.ts";
        $tsValues = $this->parseTypeScriptConstObject($filePath, 'ModoArquivo');

        $phpEnumCases = ModoArquivoEnum::cases();
        $phpValues = array_combine(
            array_map(fn ($case) => $case->name, $phpEnumCases),
            array_map(fn ($case) => $case->value, $phpEnumCases)
        );

        $this->assertSame($phpValues, $tsValues, 'Mismatch entre ModoArquivoEnum (PHP) e ModoArquivo (TS)');
    }

    public function test_ordenacao_reserva_enum_esta_estritamente_sincronizado(): void
    {
        $filePath = "{$this->contractsBasePath}/ordenacao-reserva.contract.ts";
        $tsValues = $this->parseTypeScriptConstObject($filePath, 'OrdenacaoReserva');

        $phpEnumCases = OrdenacaoReservaEnum::cases();
        $phpValues = array_combine(
            array_map(fn ($case) => $case->name, $phpEnumCases),
            array_map(fn ($case) => $case->value, $phpEnumCases)
        );

        $this->assertSame($phpValues, $tsValues, 'Mismatch entre OrdenacaoReservaEnum (PHP) e OrdenacaoReserva (TS)');
    }

    public function test_validation_status_enum_esta_estritamente_sincronizado(): void
    {
        $filePath = "{$this->contractsBasePath}/validation-status.contract.ts";
        $tsValues = $this->parseTypeScriptConstObject($filePath, 'ValidationStatus');

        $phpEnumCases = ValidationStatusEnum::cases();
        $phpValues = array_combine(
            array_map(fn ($case) => $case->name, $phpEnumCases),
            array_map(fn ($case) => $case->value, $phpEnumCases)
        );

        $this->assertSame($phpValues, $tsValues, 'Mismatch entre ValidationStatusEnum (PHP) e ValidationStatus (TS)');
    }

    public function test_error_code_enum_esta_estritamente_sincronizado(): void
    {
        $filePath = "{$this->contractsBasePath}/error-codes.contract.ts";
        $tsValues = $this->parseTypeScriptConstObject($filePath, 'ErrorCode');

        $phpEnumCases = ErrorCode::cases();
        $phpValues = array_combine(
            array_map(fn ($case) => $case->name, $phpEnumCases),
            array_map(fn ($case) => $case->value, $phpEnumCases)
        );

        $this->assertSame($phpValues, $tsValues, 'Mismatch entre ErrorCode (PHP) e ErrorCode (TS)');
    }

    public function test_tipo_relatorio_enum_esta_estritamente_sincronizado(): void
    {
        $filePath = "{$this->contractsBasePath}/relatorios.contract.ts";
        $tsValues = $this->parseTypeScriptConstObject($filePath, 'TipoRelatorio');

        $phpEnumCases = TipoRelatorioEnum::cases();
        $phpValues = array_combine(
            array_map(fn ($case) => $case->name, $phpEnumCases),
            array_map(fn ($case) => $case->value, $phpEnumCases)
        );

        $this->assertSame($phpValues, $tsValues, 'Mismatch entre TipoRelatorioEnum (PHP) e TipoRelatorio (TS)');
    }

    public function test_formato_relatorio_enum_esta_estritamente_sincronizado(): void
    {
        $filePath = "{$this->contractsBasePath}/relatorios.contract.ts";
        $tsValues = $this->parseTypeScriptConstObject($filePath, 'FormatoRelatorio');

        $phpEnumCases = FormatoRelatorioEnum::cases();
        $phpValues = array_combine(
            array_map(fn ($case) => $case->name, $phpEnumCases),
            array_map(fn ($case) => $case->value, $phpEnumCases)
        );

        $this->assertSame($phpValues, $tsValues, 'Mismatch entre FormatoRelatorioEnum (PHP) e FormatoRelatorio (TS)');
    }

    public function test_recorrencia_reserva_enum_esta_estritamente_sincronizado(): void
    {
        $filePath = "{$this->contractsBasePath}/recorrencia.contract.ts";
        $tsValues = $this->parseTypeScriptConstObject($filePath, 'RecorrenciaReserva');

        $phpEnumCases = RecorrenciaReservaEnum::cases();
        $phpValues = array_combine(
            array_map(fn ($case) => $case->name, $phpEnumCases),
            array_map(fn ($case) => $case->value, $phpEnumCases)
        );

        $this->assertSame($phpValues, $tsValues, 'Mismatch entre RecorrenciaReservaEnum (PHP) e RecorrenciaReserva (TS)');
    }

    public function test_agenda_turnos_enum_esta_estritamente_sincronizado(): void
    {
        $filePath = "{$this->contractsBasePath}/turnos.contract.ts";
        $tsValues = $this->parseTypeScriptConstObject($filePath, 'Turno');

        $phpEnumCases = AgendaEnum::cases();
        $phpValues = array_combine(
            array_map(fn ($case) => $case->name, $phpEnumCases),
            array_map(fn ($case) => $case->value, $phpEnumCases)
        );

        $this->assertSame($phpValues, $tsValues, 'Mismatch entre AgendaEnum (PHP) e Turno (TS)');
    }

    /**
     * Extrai os pares chave => valor de uma constante de objeto TypeScript (ex: export const SituacaoReserva = { ... } as const).
     *
     * @return array<string, string>
     */
    private function parseTypeScriptConstObject(string $filePath, string $constName): array
    {
        $this->assertFileExists($filePath);
        $content = file_get_contents($filePath);
        $this->assertIsString($content);

        $pattern = '/export\s+const\s+'.preg_quote($constName, '/').'\s*=\s*\{([^}]+)\}/s';
        $this->assertSame(1, preg_match($pattern, $content, $matches), "Constante {$constName} não encontrada no arquivo {$filePath}");

        $body = $matches[1];
        $entries = [];

        $linePattern = "/([A-Z0-9_]+)\s*:\s*(?:'([^']+)'|([A-Za-z0-9_.]+))/";
        if (preg_match_all($linePattern, $body, $lineMatches, PREG_SET_ORDER)) {
            foreach ($lineMatches as $match) {
                $key = $match[1];
                $value = ! empty($match[2]) ? $match[2] : $match[3];
                $entries[$key] = $value;
            }
        }

        return $entries;
    }
}
