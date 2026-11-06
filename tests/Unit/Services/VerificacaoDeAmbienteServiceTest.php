<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\VerificacaoDeAmbienteService;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class VerificacaoDeAmbienteServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.env' => 'production',
            'app.debug' => false,
            'app.url' => 'https://uniespacos.uesb.edu.br',
            'app.key' => 'base64:'.base64_encode(str_repeat('k', 32)),
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
            'database.connections.pgsql.password' => 'senha-de-teste-7f3k',
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
        ]);
    }

    public function test_configuracao_segura_nao_gera_falha_nem_aviso(): void
    {
        foreach ($this->executar() as $resultado) {
            $this->assertSame(
                VerificacaoDeAmbienteService::OK,
                $resultado['status'],
                "Checagem {$resultado['checagem']} deveria estar OK: {$resultado['motivo']}",
            );
        }
    }

    public function test_cada_resultado_traz_checagem_status_e_motivo(): void
    {
        $resultados = $this->executar();

        $this->assertCount(21, $resultados);

        foreach ($resultados as $resultado) {
            $this->assertArrayHasKey('checagem', $resultado);
            $this->assertArrayHasKey('status', $resultado);
            $this->assertNotSame('', $resultado['motivo']);
        }
    }

    /**
     * @return array<string, array{0: string, 1: array<string, mixed>}>
     */
    public static function falhas(): array
    {
        return [
            'app_debug ligado' => ['app_debug', ['app.debug' => true]],
            'app_key sem prefixo base64' => ['app_key', ['app.key' => 'semprefixo'.base64_encode(str_repeat('k', 32))]],
            'app_key com tamanho errado' => ['app_key', ['app.key' => 'base64:'.base64_encode('curta')]],
            'app_key ausente' => ['app_key', ['app.key' => null]],
            'telescope habilitado' => ['telescope_habilitado', ['telescope.enabled' => true]],
            'log_queries ligado' => ['log_queries', ['logging.log_queries' => true]],
            'session.secure nulo' => ['session_secure', ['session.secure' => null]],
            'session.same_site none' => ['session_same_site', ['session.same_site' => 'none']],
            'senha do banco vazia' => ['senha_banco', ['database.connections.pgsql.password' => '']],
            'senha do banco na lista proibida' => ['senha_banco', ['database.connections.pgsql.password' => 'uniespacossecretkey']],
            'chave do Reverb vazia' => ['chaves_reverb', ['broadcasting.connections.reverb.key' => '']],
            'broadcasting.default diferente de reverb' => ['broadcast_padrao', ['broadcasting.default' => 'null']],
        ];
    }

    /**
     * @return array<string, array{0: string, 1: array<string, mixed>}>
     */
    public static function avisos(): array
    {
        return [
            'app.env fora de production/staging' => ['app_env', ['app.env' => 'local']],
            'app.url sem https' => ['app_url', ['app.url' => 'http://uniespacos.uesb.edu.br']],
            'app.url com localhost' => ['app_url', ['app.url' => 'https://localhost']],
            'nível de log em debug' => ['nivel_de_log', ['logging.channels.daily.level' => 'debug']],
            'session.encrypt false' => ['session_encrypt', ['session.encrypt' => false]],
            'session.http_only false' => ['session_http_only', ['session.http_only' => false]],
            'mail.default em log' => ['mail_mailer', ['mail.default' => 'log']],
            'host SMTP de desenvolvimento' => ['mail_host_smtp', ['mail.mailers.smtp.host' => 'mailpit']],
            'queue.default sync' => ['queue_sync', ['queue.default' => 'sync']],
            'cache.default array' => ['cache_padrao', ['cache.default' => 'array']],
            'bcrypt rounds abaixo de 12' => ['bcrypt_rounds', ['hashing.bcrypt.rounds' => 10]],
            'Telescope instalado' => ['telescope_instalado', ['verificacao-ambiente.classes.telescope' => VerificacaoDeAmbienteService::class]],
            'prazo de retenção zero' => ['retencao_prazos', ['retencao.cache_dias' => 0]],
        ];
    }

    #[DataProvider('falhas')]
    public function test_falha_quando_a_checagem_e_violada(string $checagem, array $ajustes): void
    {
        config($ajustes);

        $this->assertSame(VerificacaoDeAmbienteService::FALHA, $this->statusDe($checagem));
    }

    #[DataProvider('avisos')]
    public function test_aviso_quando_a_checagem_e_violada(string $checagem, array $ajustes): void
    {
        config($ajustes);

        $this->assertSame(VerificacaoDeAmbienteService::AVISO, $this->statusDe($checagem));
    }

    public function test_nivel_configurado_como_aviso_rebaixa_a_falha(): void
    {
        config([
            'app.debug' => true,
            'verificacao-ambiente.niveis.app_debug' => 'aviso',
        ]);

        $this->assertSame(VerificacaoDeAmbienteService::AVISO, $this->statusDe('app_debug'));
    }

    public function test_nivel_desconhecido_cai_para_falha(): void
    {
        config([
            'app.debug' => true,
            'verificacao-ambiente.niveis.app_debug' => 'ignorar',
        ]);

        $this->assertSame(VerificacaoDeAmbienteService::FALHA, $this->statusDe('app_debug'));
    }

    public function test_app_key_valida_com_32_bytes_passa(): void
    {
        config(['app.key' => 'base64:'.base64_encode(random_bytes(32))]);

        $this->assertSame(VerificacaoDeAmbienteService::OK, $this->statusDe('app_key'));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function executar(): array
    {
        return app(VerificacaoDeAmbienteService::class)->executar();
    }

    private function statusDe(string $checagem): string
    {
        $encontrados = array_values(array_filter(
            $this->executar(),
            fn (array $resultado): bool => $resultado['checagem'] === $checagem,
        ));

        $this->assertCount(1, $encontrados);

        return $encontrados[0]['status'];
    }
}
