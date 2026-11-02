<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Services\RetencaoService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tests\TestCase;

class RetencaoLogsDiariosTest extends TestCase
{
    use DatabaseTransactions;

    private string $diretorio;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-02 12:00:00'));

        $this->diretorio = sys_get_temp_dir().DIRECTORY_SEPARATOR.'retencao-logs-'.Str::random(8);
        File::makeDirectory($this->diretorio);

        config([
            'retencao.logs.diretorio' => $this->diretorio,
            'logging.channels.daily.days' => 14,
        ]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->diretorio);
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_remove_somente_logs_diarios_com_data_anterior_ao_corte_sem_escrever_no_canal(): void
    {
        Log::spy();
        $this->criarArquivos([
            'laravel-2026-10-01.log',
            'laravel-2026-10-18.log',
            'laravel-2026-10-19.log',
            'laravel-2026-11-02.log',
            'laravel.log',
            'laravel-2026-13-99.log',
            'laravel-2026-10-01.log.bak',
            'outro.log',
        ]);

        $removidos = app(RetencaoService::class)->logs();

        $this->assertSame(2, $removidos);
        $this->assertArquivosRestantes([
            'laravel-2026-10-19.log',
            'laravel-2026-11-02.log',
            'laravel-2026-13-99.log',
            'laravel-2026-10-01.log.bak',
            'laravel.log',
            'outro.log',
        ]);

        foreach (['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug', 'log', 'channel', 'stack'] as $metodo) {
            Log::shouldNotHaveReceived($metodo);
        }
    }

    public function test_decide_pela_data_do_nome_e_nao_pelo_mtime(): void
    {
        $this->criarArquivos(['laravel-2026-11-02.log', 'laravel-2026-10-01.log']);
        touch($this->diretorio.DIRECTORY_SEPARATOR.'laravel-2026-11-02.log', Carbon::parse('2000-01-01')->getTimestamp());
        touch($this->diretorio.DIRECTORY_SEPARATOR.'laravel-2026-10-01.log', Carbon::now()->getTimestamp());

        $this->assertSame(1, app(RetencaoService::class)->logs());

        $this->assertArquivosRestantes(['laravel-2026-11-02.log']);
    }

    public function test_simulacao_conta_sem_remover(): void
    {
        $this->criarArquivos(['laravel-2026-10-01.log', 'laravel-2026-11-02.log']);

        $this->assertSame(1, app(RetencaoService::class)->logs(simular: true));

        $this->assertArquivosRestantes(['laravel-2026-10-01.log', 'laravel-2026-11-02.log']);
    }

    public function test_prazo_zero_pula_a_rotina_sem_remover(): void
    {
        Log::spy();
        config(['logging.channels.daily.days' => 0]);
        $this->criarArquivos(['laravel-2026-10-01.log']);

        $this->assertNull(app(RetencaoService::class)->logs());

        $this->assertArquivosRestantes(['laravel-2026-10-01.log']);
        Log::shouldHaveReceived('warning')
            ->with('retencao.rotina_pulada', ['rotina' => 'logs_diarios', 'motivo' => 'prazo_invalido'])
            ->once();
    }

    public function test_diretorio_inexistente_nao_falha(): void
    {
        config(['retencao.logs.diretorio' => $this->diretorio.DIRECTORY_SEPARATOR.'nao-existe']);

        $this->assertSame(0, app(RetencaoService::class)->logs());
    }

    /**
     * @param  list<string>  $nomes
     */
    private function criarArquivos(array $nomes): void
    {
        foreach ($nomes as $nome) {
            File::put($this->diretorio.DIRECTORY_SEPARATOR.$nome, 'registro de teste');
        }
    }

    /**
     * @param  list<string>  $esperados
     */
    private function assertArquivosRestantes(array $esperados): void
    {
        $nomes = array_map(
            fn (\SplFileInfo $arquivo): string => $arquivo->getFilename(),
            File::files($this->diretorio),
        );
        sort($nomes);
        sort($esperados);

        $this->assertSame($esperados, $nomes);
    }
}
