<?php

declare(strict_types=1);

namespace Tests\Unit\Console;

use App\Console\AgendadorLoop;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class AgendadorLoopTest extends TestCase
{
    private CarbonImmutable $agora;

    private bool $paradaSolicitada = false;

    private int $iniciados = 0;

    private int $sonecas = 0;

    private int $ciclosDoProximoProcesso = PHP_INT_MAX;

    /** @var list<ProcessoFalso> */
    private array $processos = [];

    protected function setUp(): void
    {
        parent::setUp();

        Log::spy();
        $this->agora = CarbonImmutable::parse('2026-11-06 03:29:59', 'UTC');
    }

    public function test_sem_parada_dispara_rodada_no_segundo_zero_de_cada_minuto(): void
    {
        $loop = $this->criarLoop();

        $loop->ciclo();
        $this->assertSame(0, $this->iniciados);

        $this->agora = CarbonImmutable::parse('2026-11-06 03:30:00', 'UTC');
        $loop->ciclo();
        $this->assertSame(1, $this->iniciados);

        $this->agora = CarbonImmutable::parse('2026-11-06 03:30:01', 'UTC');
        $loop->ciclo();
        $this->assertSame(1, $this->iniciados, 'Não repete a rodada dentro do mesmo minuto.');

        $this->agora = CarbonImmutable::parse('2026-11-06 03:31:00', 'UTC');
        $loop->ciclo();
        $this->assertSame(2, $this->iniciados);
    }

    public function test_com_parada_solicitada_nao_dispara_rodada_nova(): void
    {
        $this->paradaSolicitada = true;
        $this->agora = CarbonImmutable::parse('2026-11-06 03:30:00', 'UTC');

        $this->criarLoop()->ciclo();

        $this->assertSame(0, $this->iniciados);
    }

    public function test_com_parada_para_de_disparar_e_espera_o_processo_em_curso(): void
    {
        $this->agora = CarbonImmutable::parse('2026-11-06 03:30:00', 'UTC');
        $this->ciclosDoProximoProcesso = 3;

        $loop = $this->criarLoop(dormir: function (): void {
            $this->sonecas++;
            if ($this->sonecas === 1) {
                $this->paradaSolicitada = true;
                $this->agora = CarbonImmutable::parse('2026-11-06 03:31:00', 'UTC');
            }
            $this->agora = $this->agora->addSecond();
        });

        $codigo = $loop->executar();

        $this->assertSame(0, $codigo);
        $this->assertSame(1, $this->iniciados, 'Nenhuma rodada nova depois da parada.');
        $this->assertCount(1, $this->processos);
        $this->assertSame(0, $this->processos[0]->paradas, 'O processo terminou dentro do prazo, sem stop().');
        $this->assertGreaterThanOrEqual(3, $this->sonecas, 'A espera acompanha o processo até ele encerrar.');
        Log::shouldHaveReceived('info')
            ->with('agendador.parada_solicitada', ['execucoes_em_curso' => 1])
            ->once();
        Log::shouldHaveReceived('info')
            ->with('agendador.parada_concluida', ['execucoes_no_prazo' => 1, 'execucoes_forcadas' => 0])
            ->once();
    }

    public function test_teto_de_parada_e_respeitado_e_forca_stop_nos_processos(): void
    {
        $this->agora = CarbonImmutable::parse('2026-11-06 03:30:00', 'UTC');

        $loop = $this->criarLoop(teto: 5, dormir: function (): void {
            $this->sonecas++;
            $this->agora = $this->agora->addSecond();
        });

        $loop->ciclo();
        $this->assertSame(1, $this->iniciados);

        $this->paradaSolicitada = true;
        $codigo = $loop->executar();

        $this->assertSame(0, $codigo);
        $this->assertSame(5, $this->sonecas, 'A espera para exatamente no teto de 5 segundos.');
        $this->assertSame(1, $this->processos[0]->paradas, 'Processo ainda em curso após o teto recebe stop().');
        Log::shouldHaveReceived('info')
            ->with('agendador.parada_concluida', ['execucoes_no_prazo' => 0, 'execucoes_forcadas' => 1])
            ->once();
    }

    private function criarLoop(int $teto = 100, ?Closure $dormir = null): AgendadorLoop
    {
        return new AgendadorLoop(
            relogio: fn (): CarbonImmutable => $this->agora,
            iniciarProcesso: fn (): Process => $this->fabricarProcesso(),
            paradaSolicitada: fn (): bool => $this->paradaSolicitada,
            dormir: $dormir ?? function (): void {
                $this->sonecas++;
            },
            saida: function (string $trecho): void {
                unset($trecho);
            },
            tetoParadaSegundos: $teto,
        );
    }

    private function fabricarProcesso(): ProcessoFalso
    {
        $this->iniciados++;
        $processo = new ProcessoFalso($this->ciclosDoProximoProcesso);
        $this->processos[] = $processo;

        return $processo;
    }
}

final class ProcessoFalso extends Process
{
    public int $paradas = 0;

    private bool $construido = false;

    private int $ciclosAteEncerrar = 0;

    public function __construct(int $ciclosAteEncerrar)
    {
        parent::__construct(['true']);

        $this->ciclosAteEncerrar = $ciclosAteEncerrar;
        $this->construido = true;
    }

    public function isRunning(): bool
    {
        if (! $this->construido) {
            return false;
        }

        return $this->ciclosAteEncerrar-- > 0;
    }

    public function getIncrementalOutput(): string
    {
        return '';
    }

    public function getIncrementalErrorOutput(): string
    {
        return '';
    }

    public function stop(float $timeout = 10, ?int $signal = null): ?int
    {
        $this->paradas++;
        $this->ciclosAteEncerrar = 0;

        return 0;
    }
}
