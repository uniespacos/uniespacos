<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Repositories\RetencaoRepositoryInterface;
use App\Services\RetencaoService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Mockery;
use Mockery\MockInterface;
use Tests\TestCase;

class RetencaoTokensEJobsTest extends TestCase
{
    use DatabaseTransactions;

    private const AGORA = '2026-11-02 12:00:00';

    private const CORTE_TOKENS = '2026-11-01 12:00:00';

    private const CORTE_JOBS = '2026-10-26 12:00:00';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse(self::AGORA));

        config([
            'retencao.jobs_falhos_dias' => 30,
            'retencao.notificacoes_lidas_dias' => 90,
            'retencao.cache_dias' => 7,
            'retencao.sessoes_dias' => 7,
            'retencao.tokens_redefinicao_dias' => 1,
            'retencao.jobs_pendentes_alerta_dias' => 7,
            'logging.channels.daily.days' => 14,
            'retencao.logs.diretorio' => sys_get_temp_dir().DIRECTORY_SEPARATOR.'retencao-inexistente-'.Str::random(8),
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_apaga_tokens_vencidos_preserva_recentes_e_conta_os_sem_data_no_log(): void
    {
        Log::spy();
        $vencidosAntes = $this->tokensVencidosNoBanco();
        $semDataAntes = $this->tokensSemDataNoBanco();

        $vencido = $this->inserirToken('2026-10-31 12:00:00');
        $recente = $this->inserirToken('2026-11-01 12:30:00');
        $semData = $this->inserirToken(null);

        $this->assertSame(0, Artisan::call('retencao:aplicar'));

        $this->assertFalse($this->tokenExiste($vencido));
        $this->assertTrue($this->tokenExiste($recente));
        $this->assertTrue($this->tokenExiste($semData));

        Log::shouldHaveReceived('info')
            ->with('retencao.rotina_aplicada', ['rotina' => 'tokens_redefinicao', 'quantidade' => $vencidosAntes + 1, 'simulacao' => false])
            ->once();
        Log::shouldHaveReceived('info')
            ->with('retencao.tokens_redefinicao_sem_data', ['quantidade' => $semDataAntes + 1])
            ->once();
    }

    public function test_dry_run_conta_tokens_vencidos_sem_apagar(): void
    {
        $vencidosAntes = $this->tokensVencidosNoBanco();
        $vencido = $this->inserirToken('2026-10-31 12:00:00');

        Artisan::call('retencao:aplicar', ['--dry-run' => true]);
        $saida = Artisan::output();

        $this->assertStringContainsString('[tokens_redefinicao] '.($vencidosAntes + 1).' seriam removidos.', $saida);
        $this->assertTrue($this->tokenExiste($vencido));
    }

    public function test_prazo_invalido_pula_a_rotina_de_tokens_sem_apagar(): void
    {
        Log::spy();
        config(['retencao.tokens_redefinicao_dias' => 0]);
        $vencido = $this->inserirToken('2026-10-31 12:00:00');

        $this->assertNull(app(RetencaoService::class)->tokensRedefinicao());

        $this->assertTrue($this->tokenExiste($vencido));
        Log::shouldHaveReceived('warning')
            ->with('retencao.rotina_pulada', ['rotina' => 'tokens_redefinicao_dias', 'motivo' => 'prazo_invalido'])
            ->once();
    }

    public function test_conta_jobs_pendentes_antigos_sem_apagar_nenhum_job(): void
    {
        Log::spy();
        $antigosAntes = $this->jobsAntigosNoBanco();
        $totalAntes = DB::table('jobs')->count();

        $antigo = $this->inserirJob('2026-10-01 00:00:00');
        $recente = $this->inserirJob('2026-10-30 00:00:00');

        Artisan::call('retencao:aplicar');
        $saida = Artisan::output();

        $this->assertStringContainsString('[jobs_pendentes_antigos] '.($antigosAntes + 1).' encontrados.', $saida);
        $this->assertTrue($this->jobExiste($antigo));
        $this->assertTrue($this->jobExiste($recente));
        $this->assertSame($totalAntes + 2, DB::table('jobs')->count());
        Log::shouldHaveReceived('warning')
            ->with('retencao.jobs_pendentes_antigos', ['quantidade' => $antigosAntes + 1])
            ->once();
    }

    public function test_dry_run_nao_altera_jobs_e_lista_as_duas_rotinas_novas(): void
    {
        $totalAntes = DB::table('jobs')->count();
        $antigo = $this->inserirJob('2026-10-01 00:00:00');

        Artisan::call('retencao:aplicar', ['--dry-run' => true]);
        $saida = Artisan::output();

        $this->assertStringContainsString('[tokens_redefinicao] ', $saida);
        $this->assertStringContainsString('[jobs_pendentes_antigos] ', $saida);
        $this->assertTrue($this->jobExiste($antigo));
        $this->assertSame($totalAntes + 1, DB::table('jobs')->count());
    }

    public function test_sem_jobs_pendentes_antigos_nao_emite_alerta(): void
    {
        Log::spy();

        $this->mock(RetencaoRepositoryInterface::class, function (MockInterface $mock): void {
            $mock->shouldReceive('contarJobsPendentesAntesDe')->once()->andReturn(0);
        });

        $this->assertSame(0, app(RetencaoService::class)->jobsPendentesAntigos());

        Log::shouldNotHaveReceived('warning', ['retencao.jobs_pendentes_antigos', Mockery::any()]);
    }

    public function test_prazo_invalido_pula_a_rotina_de_jobs_pendentes(): void
    {
        Log::spy();
        config(['retencao.jobs_pendentes_alerta_dias' => 'abc']);
        $totalAntes = DB::table('jobs')->count();

        $this->assertNull(app(RetencaoService::class)->jobsPendentesAntigos());

        $this->assertSame($totalAntes, DB::table('jobs')->count());
        Log::shouldHaveReceived('warning')
            ->with('retencao.rotina_pulada', ['rotina' => 'jobs_pendentes_alerta_dias', 'motivo' => 'prazo_invalido'])
            ->once();
    }

    private function tokensVencidosNoBanco(): int
    {
        return DB::table('password_reset_tokens')
            ->whereNotNull('created_at')
            ->where('created_at', '<', self::CORTE_TOKENS)
            ->count();
    }

    private function tokensSemDataNoBanco(): int
    {
        return DB::table('password_reset_tokens')->whereNull('created_at')->count();
    }

    private function jobsAntigosNoBanco(): int
    {
        return DB::table('jobs')
            ->where('created_at', '<', Carbon::parse(self::CORTE_JOBS)->getTimestamp())
            ->count();
    }

    private function inserirToken(?string $criadoEm): string
    {
        $email = 'teste-retencao-'.Str::random(12).'@test.local';

        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => 'token-teste-'.Str::random(20),
            'created_at' => $criadoEm,
        ]);

        return $email;
    }

    private function tokenExiste(string $email): bool
    {
        return DB::table('password_reset_tokens')->where('email', $email)->exists();
    }

    private function inserirJob(string $criadoEm): string
    {
        $fila = 'teste-retencao-'.Str::random(12);

        DB::table('jobs')->insert([
            'queue' => $fila,
            'payload' => '{}',
            'attempts' => 0,
            'reserved_at' => null,
            'available_at' => Carbon::parse($criadoEm)->getTimestamp(),
            'created_at' => Carbon::parse($criadoEm)->getTimestamp(),
        ]);

        return $fila;
    }

    private function jobExiste(string $fila): bool
    {
        return DB::table('jobs')->where('queue', $fila)->exists();
    }
}
