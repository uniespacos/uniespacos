<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class RetencaoAplicarCommandTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * @var array<string, array{0: string, 1: string, 2: mixed}>
     */
    private array $registros = [];

    private string $diretorioLogs;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-02 12:00:00'));

        $this->diretorioLogs = sys_get_temp_dir().DIRECTORY_SEPARATOR.'retencao-cmd-'.Str::random(8);
        File::makeDirectory($this->diretorioLogs);

        config([
            'retencao.logs.diretorio' => $this->diretorioLogs,
            'logging.channels.daily.days' => 14,
            'retencao.jobs_falhos_dias' => 30,
            'retencao.notificacoes_lidas_dias' => 90,
            'retencao.cache_dias' => 7,
            'retencao.sessoes_dias' => 7,
            'retencao.tokens_redefinicao_dias' => 1,
            'retencao.jobs_pendentes_alerta_dias' => 7,
        ]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->diretorioLogs);
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_aplica_a_retencao_removendo_somente_o_que_passou_do_prazo(): void
    {
        $this->cenarioCompleto();

        $this->artisan('retencao:aplicar')->assertExitCode(0);

        foreach (['notif_lida_antiga', 'cache_expirado_antigo', 'lock_expirado_antigo', 'sessao_antiga', 'falha_antiga', 'lote_antigo_finalizado', 'lote_antigo_nao_finalizado'] as $nome) {
            $this->assertPresenca($nome, false);
        }

        foreach (['notif_lida_recente', 'notif_nao_lida_antiga', 'cache_expirado_recente', 'cache_valido', 'lock_valido', 'sessao_recente', 'falha_recente', 'lote_recente_finalizado'] as $nome) {
            $this->assertPresenca($nome, true);
        }
    }

    public function test_dry_run_conta_sem_apagar_nada(): void
    {
        $this->cenarioCompleto();

        $this->artisan('retencao:aplicar', ['--dry-run' => true])
            ->expectsOutputToContain('Simulação: nada será apagado.')
            ->assertExitCode(0);

        foreach (array_keys($this->registros) as $nome) {
            $this->assertPresenca($nome, true);
        }
    }

    public function test_prazo_zero_ou_invalido_pula_a_rotina_sem_apagar(): void
    {
        Log::spy();
        $this->cenarioCompleto();

        config([
            'retencao.notificacoes_lidas_dias' => 0,
            'retencao.cache_dias' => 'abc',
            'retencao.sessoes_dias' => -1,
            'logging.channels.daily.days' => 0,
        ]);

        $this->artisan('retencao:aplicar')->assertExitCode(0);

        $this->assertPresenca('notif_lida_antiga', true);
        $this->assertPresenca('cache_expirado_antigo', true);
        $this->assertPresenca('lock_expirado_antigo', true);
        $this->assertPresenca('sessao_antiga', true);

        Log::shouldHaveReceived('warning')
            ->with('retencao.rotina_pulada', Mockery::type('array'))
            ->times(4);
    }

    public function test_falha_em_uma_rotina_nao_interrompe_as_demais_e_sai_com_erro(): void
    {
        Log::spy();
        $this->cenarioCompleto();

        config(['cache.stores.database.connection' => 'conexao-inexistente-retencao']);

        $this->artisan('retencao:aplicar')->assertExitCode(1);

        $this->assertPresenca('sessao_antiga', false);

        Log::shouldHaveReceived('error')
            ->with('retencao.rotina_falhou', ['rotina' => 'cache', 'excecao' => \InvalidArgumentException::class])
            ->once();
    }

    private function cenarioCompleto(): void
    {
        $this->registrar('notif_lida_antiga', 'notifications', 'id', $this->inserirNotificacao('2026-06-01 00:00:00'));
        $this->registrar('notif_lida_recente', 'notifications', 'id', $this->inserirNotificacao('2026-10-01 00:00:00'));
        $this->registrar('notif_nao_lida_antiga', 'notifications', 'id', $this->inserirNotificacao(null));

        $this->registrar('cache_expirado_antigo', 'cache', 'key', $this->inserirCache(Carbon::parse('2026-10-01')->getTimestamp()));
        $this->registrar('cache_expirado_recente', 'cache', 'key', $this->inserirCache(Carbon::parse('2026-10-30')->getTimestamp()));
        $this->registrar('cache_valido', 'cache', 'key', $this->inserirCache(Carbon::parse('2026-12-01')->getTimestamp()));

        $this->registrar('lock_expirado_antigo', 'cache_locks', 'key', $this->inserirLock(Carbon::parse('2026-10-01')->getTimestamp()));
        $this->registrar('lock_valido', 'cache_locks', 'key', $this->inserirLock(Carbon::parse('2026-12-01')->getTimestamp()));

        $this->registrar('sessao_antiga', 'sessions', 'id', $this->inserirSessao(Carbon::parse('2026-10-01')->getTimestamp()));
        $this->registrar('sessao_recente', 'sessions', 'id', $this->inserirSessao(Carbon::parse('2026-10-30')->getTimestamp()));

        $this->registrar('falha_antiga', 'failed_jobs', 'uuid', $this->inserirFalha('2026-09-01 00:00:00'));
        $this->registrar('falha_recente', 'failed_jobs', 'uuid', $this->inserirFalha('2026-10-30 00:00:00'));

        $this->registrar('lote_antigo_finalizado', 'job_batches', 'id', $this->inserirLote(Carbon::parse('2026-09-01')->getTimestamp(), Carbon::parse('2026-09-01')->getTimestamp()));
        $this->registrar('lote_recente_finalizado', 'job_batches', 'id', $this->inserirLote(Carbon::parse('2026-10-30')->getTimestamp(), Carbon::parse('2026-10-30')->getTimestamp()));
        $this->registrar('lote_antigo_nao_finalizado', 'job_batches', 'id', $this->inserirLote(Carbon::parse('2026-09-01')->getTimestamp(), null));
    }

    private function registrar(string $nome, string $tabela, string $coluna, mixed $valor): void
    {
        $this->registros[$nome] = [$tabela, $coluna, $valor];
    }

    private function assertPresenca(string $nome, bool $presente): void
    {
        [$tabela, $coluna, $valor] = $this->registros[$nome];

        $this->assertSame(
            $presente,
            DB::table($tabela)->where($coluna, $valor)->exists(),
            "Registro '{$nome}' em '{$tabela}' deveria ".($presente ? 'existir' : 'ter sido removido'),
        );
    }

    private function inserirNotificacao(?string $lidaEm): string
    {
        $id = (string) Str::uuid();

        DB::table('notifications')->insert([
            'id' => $id,
            'type' => 'App\\Notifications\\Teste',
            'notifiable_type' => 'App\\Models\\User',
            'notifiable_id' => 1,
            'data' => '{}',
            'read_at' => $lidaEm,
            'created_at' => '2026-06-01 00:00:00',
            'updated_at' => '2026-06-01 00:00:00',
        ]);

        return $id;
    }

    private function inserirCache(int $expiracao): string
    {
        $chave = 'teste-retencao-'.Str::random(12);

        DB::table('cache')->insert(['key' => $chave, 'value' => 'x', 'expiration' => $expiracao]);

        return $chave;
    }

    private function inserirLock(int $expiracao): string
    {
        $chave = 'teste-retencao-lock-'.Str::random(12);

        DB::table('cache_locks')->insert(['key' => $chave, 'owner' => 'teste', 'expiration' => $expiracao]);

        return $chave;
    }

    private function inserirSessao(int $ultimaAtividade): string
    {
        $id = Str::random(40);

        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => null,
            'ip_address' => null,
            'user_agent' => null,
            'payload' => '',
            'last_activity' => $ultimaAtividade,
        ]);

        return $id;
    }

    private function inserirFalha(string $falhouEm): string
    {
        $uuid = (string) Str::uuid();

        DB::table('failed_jobs')->insert([
            'uuid' => $uuid,
            'connection' => 'database',
            'queue' => 'default',
            'payload' => '{}',
            'exception' => 'teste',
            'failed_at' => $falhouEm,
        ]);

        return $uuid;
    }

    private function inserirLote(int $criadoEm, ?int $finalizadoEm): string
    {
        $id = Str::random(20);

        DB::table('job_batches')->insert([
            'id' => $id,
            'name' => 'teste',
            'total_jobs' => 1,
            'pending_jobs' => 0,
            'failed_jobs' => 0,
            'failed_job_ids' => '[]',
            'options' => null,
            'cancelled_at' => null,
            'created_at' => $criadoEm,
            'finished_at' => $finalizadoEm,
        ]);

        return $id;
    }
}
