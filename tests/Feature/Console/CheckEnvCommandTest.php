<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Services\VerificacaoDeAmbienteService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class CheckEnvCommandTest extends TestCase
{
    private const SENHA_DO_TESTE = 'senha-muito-secreta-9Qz';

    private string $chaveDoTeste;

    protected function setUp(): void
    {
        parent::setUp();

        $this->chaveDoTeste = 'base64:'.base64_encode(random_bytes(32));

        config([
            'app.env' => 'production',
            'app.debug' => false,
            'app.url' => 'https://uniespacos.uesb.edu.br',
            'app.key' => $this->chaveDoTeste,
            'telescope.enabled' => false,
            'logging.log_queries' => false,
            'logging.default' => 'stack',
            'logging.channels.stack.channels' => ['daily'],
            'logging.channels.daily.level' => 'info',
            'session.secure' => true,
            'session.same_site' => 'strict',
            'session.encrypt' => true,
            'session.http_only' => true,
            'database.default' => 'pgsql',
            'database.connections.pgsql.driver' => 'pgsql',
            'database.connections.pgsql.password' => self::SENHA_DO_TESTE,
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'chave-de-teste',
            'broadcasting.connections.reverb.secret' => 'segredo-de-teste',
            'broadcasting.connections.reverb.app_id' => '1',
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.gmail.com',
            'queue.default' => 'database',
            'cache.default' => 'database',
            'hashing.bcrypt.rounds' => 12,
            'verificacao-ambiente.classes.telescope' => 'Classe\\Inexistente\\TelescopeProvider',
            'retencao.jobs_falhos_dias' => 30,
            'retencao.notificacoes_lidas_dias' => 90,
            'retencao.cache_dias' => 7,
            'retencao.sessoes_dias' => 7,
            'retencao.tokens_redefinicao_dias' => 1,
            'retencao.jobs_pendentes_alerta_dias' => 7,
        ]);
    }

    public function test_lista_todas_as_checagens_com_status(): void
    {
        $codigo = Artisan::call('app:check-env');
        $saida = Artisan::output();

        $this->assertSame(0, $codigo);
        $this->assertStringContainsString('app_key', $saida);
        $this->assertStringContainsString('chaves_reverb', $saida);
        $this->assertStringContainsString('OK', $saida);
        $this->assertStringContainsString('Resumo: 0 falha(s), 0 aviso(s).', $saida);
    }

    public function test_estrito_sai_com_1_quando_debug_esta_ligado(): void
    {
        config(['app.debug' => true]);

        $codigo = Artisan::call('app:check-env', ['--estrito' => true]);

        $this->assertSame(1, $codigo);
        $this->assertStringContainsString('FALHA', Artisan::output());
    }

    public function test_sem_estrito_sai_com_0_mesmo_com_debug_ligado(): void
    {
        config(['app.debug' => true]);

        $codigo = Artisan::call('app:check-env');

        $this->assertSame(0, $codigo);
        $this->assertStringContainsString('FALHA', Artisan::output());
    }

    public function test_estrito_sai_com_0_quando_so_ha_avisos(): void
    {
        config(['app.env' => 'local']);

        $codigo = Artisan::call('app:check-env', ['--estrito' => true]);

        $this->assertSame(0, $codigo);
        $this->assertStringContainsString('AVISO', Artisan::output());
    }

    public function test_saida_nunca_contem_app_key_nem_senha_do_banco(): void
    {
        config(['app.debug' => true]);

        Artisan::call('app:check-env');
        $saida = Artisan::output();

        $this->assertStringNotContainsString($this->chaveDoTeste, $saida);
        $this->assertStringNotContainsString(substr($this->chaveDoTeste, 7), $saida);
        $this->assertStringNotContainsString(self::SENHA_DO_TESTE, $saida);
        $this->assertStringNotContainsString('segredo-de-teste', $saida);
    }

    public function test_erro_interno_registra_apenas_a_classe_e_sai_com_0(): void
    {
        Log::spy();
        $this->mock(VerificacaoDeAmbienteService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('executar')->andThrow(new RuntimeException('detalhe com segredo-de-teste'));
        });

        $codigo = Artisan::call('app:check-env');
        $saida = Artisan::output();

        $this->assertSame(0, $codigo);
        $this->assertStringContainsString(RuntimeException::class, $saida);
        $this->assertStringNotContainsString('segredo-de-teste', $saida);
        Log::shouldHaveReceived('error')
            ->once()
            ->with('ambiente.verificacao_falhou', ['excecao' => RuntimeException::class]);
    }

    public function test_erro_interno_com_estrito_sai_com_1(): void
    {
        Log::spy();
        $this->mock(VerificacaoDeAmbienteService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('executar')->andThrow(new RuntimeException('falha'));
        });

        $this->assertSame(1, Artisan::call('app:check-env', ['--estrito' => true]));
    }
}
