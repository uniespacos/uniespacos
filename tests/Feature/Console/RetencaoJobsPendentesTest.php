<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Services\RetencaoService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RetencaoJobsPendentesTest extends TestCase
{
    use DatabaseTransactions;

    private const AGORA = '2026-11-02 12:00:00';

    private const CORTE_REMOCAO = '2026-08-04 12:00:00';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse(self::AGORA));

        config([
            'retencao.jobs_falhos_dias' => 90,
            'retencao.notificacoes_lidas_dias' => 90,
            'retencao.cache_dias' => 90,
            'retencao.sessoes_dias' => 90,
            'retencao.tokens_redefinicao_dias' => 1,
            'retencao.jobs_pendentes_alerta_dias' => 7,
            'retencao.jobs_pendentes_dias' => 90,
            'logging.channels.daily.days' => 90,
            'retencao.logs.diretorio' => sys_get_temp_dir().DIRECTORY_SEPARATOR.'retencao-inexistente-'.Str::random(8),
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_apaga_job_pendente_com_created_at_anterior_ao_corte(): void
    {
        $apagaveisAntes = $this->jobsApagaveisNoBanco();
        $antigo = $this->inserirJob('2026-07-01 00:00:00');

        $this->assertSame($apagaveisAntes + 1, app(RetencaoService::class)->jobsPendentes(simular: true));

        $removidos = app(RetencaoService::class)->jobsPendentes();

        $this->assertSame($apagaveisAntes + 1, $removidos);
        $this->assertFalse($this->jobExiste($antigo));
    }

    public function test_mantem_job_pendente_dentro_do_prazo(): void
    {
        $recente = $this->inserirJob('2026-09-01 00:00:00');

        app(RetencaoService::class)->jobsPendentes();

        $this->assertTrue($this->jobExiste($recente));
    }

    public function test_corte_e_estrito_job_criado_exatamente_no_corte_fica_e_um_segundo_antes_sai(): void
    {
        $noCorte = $this->inserirJob(self::CORTE_REMOCAO);
        $umSegundoAntes = $this->inserirJob('2026-08-04 11:59:59');

        app(RetencaoService::class)->jobsPendentes();

        $this->assertTrue($this->jobExiste($noCorte));
        $this->assertFalse($this->jobExiste($umSegundoAntes));
    }

    public function test_mantem_job_reservado_mesmo_vencido(): void
    {
        $reservadoVencido = $this->inserirJob('2026-06-01 00:00:00', reservadoEm: '2026-11-02 11:00:00');

        app(RetencaoService::class)->jobsPendentes();

        $this->assertTrue($this->jobExiste($reservadoVencido));
    }

    public function test_dry_run_conta_sem_apagar_e_nao_loga_remocao(): void
    {
        Log::spy();
        $apagaveisAntes = $this->jobsApagaveisNoBanco();
        $antigo = $this->inserirJob('2026-07-01 00:00:00');

        Artisan::call('retencao:aplicar', ['--dry-run' => true]);
        $saida = Artisan::output();

        $this->assertStringContainsString('[jobs_pendentes] '.($apagaveisAntes + 1).' seriam removidos.', $saida);
        $this->assertTrue($this->jobExiste($antigo));
        Log::shouldNotHaveReceived('info', ['retencao.jobs_pendentes_apagados', Mockery::any()]);
    }

    #[DataProvider('prazosInvalidos')]
    public function test_prazo_invalido_pula_a_rotina_sem_apagar(mixed $prazo): void
    {
        Log::spy();
        config(['retencao.jobs_pendentes_dias' => $prazo]);
        $antigo = $this->inserirJob('2026-07-01 00:00:00');

        $this->assertNull(app(RetencaoService::class)->jobsPendentes());

        $this->assertTrue($this->jobExiste($antigo));
        Log::shouldHaveReceived('warning')
            ->with('retencao.rotina_pulada', ['rotina' => 'jobs_pendentes_dias', 'motivo' => 'prazo_invalido'])
            ->once();
        Log::shouldNotHaveReceived('info', ['retencao.jobs_pendentes_apagados', Mockery::any()]);
    }

    public function test_prazo_invalido_aparece_como_pulada_na_saida_do_comando(): void
    {
        config(['retencao.jobs_pendentes_dias' => 0]);
        $antigo = $this->inserirJob('2026-07-01 00:00:00');

        Artisan::call('retencao:aplicar');
        $saida = Artisan::output();

        $this->assertStringContainsString('[jobs_pendentes] pulada: prazo inválido.', $saida);
        $this->assertTrue($this->jobExiste($antigo));
    }

    public function test_loga_apagados_somente_quando_remove_algo(): void
    {
        Log::spy();
        $apagaveisAntes = $this->jobsApagaveisNoBanco();
        $this->inserirJob('2026-07-01 00:00:00');

        app(RetencaoService::class)->jobsPendentes();

        Log::shouldHaveReceived('info')
            ->with('retencao.jobs_pendentes_apagados', ['quantidade' => $apagaveisAntes + 1])
            ->once();
    }

    public function test_sem_nada_vencido_nao_loga_apagados(): void
    {
        Log::spy();
        config(['retencao.jobs_pendentes_dias' => 36500]);
        $this->inserirJob('2026-07-01 00:00:00');

        $this->assertSame(0, app(RetencaoService::class)->jobsPendentes());

        Log::shouldNotHaveReceived('info', ['retencao.jobs_pendentes_apagados', Mockery::any()]);
    }

    public function test_comando_lista_jobs_pendentes_depois_do_alerta_e_apaga_o_vencido(): void
    {
        Log::spy();
        $apagaveisAntes = $this->jobsApagaveisNoBanco();
        $antigo = $this->inserirJob('2026-07-01 00:00:00');
        $recente = $this->inserirJob('2026-10-30 00:00:00');

        Artisan::call('retencao:aplicar');
        $saida = Artisan::output();

        $posicaoAlerta = strpos($saida, '[jobs_pendentes_antigos] ');
        $posicaoRemocao = strpos($saida, '[jobs_pendentes] ');
        $this->assertNotFalse($posicaoAlerta);
        $this->assertNotFalse($posicaoRemocao);
        $this->assertLessThan($posicaoRemocao, $posicaoAlerta);
        $this->assertStringContainsString('[jobs_pendentes] '.($apagaveisAntes + 1).' removidos.', $saida);
        $this->assertFalse($this->jobExiste($antigo));
        $this->assertTrue($this->jobExiste($recente));
    }

    public function test_alerta_jobs_pendentes_antigos_conta_sem_apagar_nada(): void
    {
        Log::spy();
        $antigo = $this->inserirJob('2026-07-01 00:00:00');
        $contagemAntes = DB::table('jobs')->count();

        $quantidade = app(RetencaoService::class)->jobsPendentesAntigos();

        $this->assertGreaterThanOrEqual(1, $quantidade);
        $this->assertSame($contagemAntes, DB::table('jobs')->count());
        $this->assertTrue($this->jobExiste($antigo));
        Log::shouldHaveReceived('warning')
            ->with('retencao.jobs_pendentes_antigos', ['quantidade' => $quantidade])
            ->once();
    }

    public function test_alerta_ignora_job_reservado_antigo_e_conta_pendente_antigo(): void
    {
        Log::spy();
        $naoReservadosAntes = $this->jobsAntigosNaoReservadosNoBanco();

        $reservado = $this->inserirJob('2026-06-01 00:00:00', reservadoEm: '2026-11-02 11:00:00');

        $this->assertSame($naoReservadosAntes, app(RetencaoService::class)->jobsPendentesAntigos());
        $this->assertTrue($this->jobExiste($reservado));

        $pendente = $this->inserirJob('2026-07-01 00:00:00');

        $this->assertSame($naoReservadosAntes + 1, app(RetencaoService::class)->jobsPendentesAntigos());
        $this->assertTrue($this->jobExiste($pendente));
        $this->assertTrue($this->jobExiste($reservado));
        Log::shouldHaveReceived('warning')
            ->with('retencao.jobs_pendentes_antigos', ['quantidade' => $naoReservadosAntes + 1])
            ->once();
    }

    public function test_padroes_dos_arquivos_de_configuracao_sem_variaveis_de_ambiente_definidas(): void
    {
        $variaveis = [
            'RETENCAO_JOBS_FALHOS_DIAS',
            'RETENCAO_NOTIFICACOES_LIDAS_DIAS',
            'RETENCAO_CACHE_DIAS',
            'RETENCAO_SESSOES_DIAS',
            'RETENCAO_TOKENS_REDEFINICAO_DIAS',
            'RETENCAO_JOBS_PENDENTES_ALERTA_DIAS',
            'RETENCAO_JOBS_PENDENTES_DIAS',
            'LOG_DAILY_DAYS',
        ];

        $repositorio = Env::getRepository();
        $originais = [];

        foreach ($variaveis as $variavel) {
            $valor = getenv($variavel);
            $originais[$variavel] = [
                'getenv' => $valor === false ? null : $valor,
                'env' => array_key_exists($variavel, $_ENV) ? $_ENV[$variavel] : null,
                'server' => array_key_exists($variavel, $_SERVER) ? $_SERVER[$variavel] : null,
                'repo' => $repositorio->get($variavel),
            ];

            $repositorio->clear($variavel);
            putenv($variavel);
            unset($_ENV[$variavel], $_SERVER[$variavel]);
        }

        try {
            foreach ($variaveis as $variavel) {
                $this->assertNull(env($variavel));
            }

            $retencao = require base_path('config/retencao.php');
            $logging = require base_path('config/logging.php');

            $this->assertIsArray($retencao);
            $this->assertSame(90, $retencao['jobs_falhos_dias']);
            $this->assertSame(90, $retencao['notificacoes_lidas_dias']);
            $this->assertSame(90, $retencao['cache_dias']);
            $this->assertSame(90, $retencao['sessoes_dias']);
            $this->assertSame(1, $retencao['tokens_redefinicao_dias']);
            $this->assertSame(7, $retencao['jobs_pendentes_alerta_dias']);
            $this->assertSame(90, $retencao['jobs_pendentes_dias']);

            $this->assertIsArray($logging);
            $this->assertIsArray($logging['channels'] ?? null);
            $this->assertIsArray($logging['channels']['daily'] ?? null);
            $this->assertSame(90, $logging['channels']['daily']['days']);
        } finally {
            foreach ($originais as $variavel => $estado) {
                if ($estado['repo'] !== null) {
                    $repositorio->set($variavel, is_string($estado['repo']) ? $estado['repo'] : (string) $estado['repo']);
                } else {
                    $repositorio->clear($variavel);
                }

                if ($estado['getenv'] !== null) {
                    putenv($variavel.'='.$estado['getenv']);
                } else {
                    putenv($variavel);
                }

                if ($estado['env'] !== null) {
                    $_ENV[$variavel] = $estado['env'];
                } else {
                    unset($_ENV[$variavel]);
                }

                if ($estado['server'] !== null) {
                    $_SERVER[$variavel] = $estado['server'];
                } else {
                    unset($_SERVER[$variavel]);
                }
            }
        }
    }

    /**
     * @return array<string, array{0: mixed}>
     */
    public static function prazosInvalidos(): array
    {
        return [
            'zero' => [0],
            'negativo' => [-1],
            'texto' => ['abc'],
        ];
    }

    private function jobsApagaveisNoBanco(): int
    {
        return DB::table('jobs')
            ->whereNull('reserved_at')
            ->where('created_at', '<', Carbon::parse(self::CORTE_REMOCAO)->getTimestamp())
            ->count();
    }

    private function jobsAntigosNaoReservadosNoBanco(): int
    {
        return DB::table('jobs')
            ->whereNull('reserved_at')
            ->where('created_at', '<', Carbon::now()->subDays(7)->getTimestamp())
            ->count();
    }

    private function inserirJob(string $criadoEm, ?string $reservadoEm = null): string
    {
        $fila = 'teste-retencao-jobs-'.Str::random(12);
        $timestamp = Carbon::parse($criadoEm)->getTimestamp();

        DB::table('jobs')->insert([
            'queue' => $fila,
            'payload' => '{}',
            'attempts' => 0,
            'reserved_at' => $reservadoEm === null ? null : Carbon::parse($reservadoEm)->getTimestamp(),
            'available_at' => $timestamp,
            'created_at' => $timestamp,
        ]);

        return $fila;
    }

    private function jobExiste(string $fila): bool
    {
        return DB::table('jobs')->where('queue', $fila)->exists();
    }
}
