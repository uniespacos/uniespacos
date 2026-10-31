<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\MensagemDeErro;
use Illuminate\Database\QueryException;
use Illuminate\Log\Logger;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\Logger as MonologLogger;
use Monolog\LogRecord;
use PDOException;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class MensagemDeErroTest extends TestCase
{
    private const GENERICA_PT_BR = 'ocorreu uma falha interna. Tente novamente.';

    private TestHandler $capturado;

    protected function setUp(): void
    {
        parent::setUp();

        app()->setLocale('pt');
        $this->capturado = new TestHandler;
        Log::swap(new Logger(new MonologLogger('teste', [$this->capturado])));
    }

    #[Test]
    public function texto_generico_em_ingles_mostra_a_chave_original(): void
    {
        app()->setLocale('en');

        $mensagem = MensagemDeErro::paraUsuario(new PDOException('falha'));

        $this->assertSame('an internal error occurred. Please try again.', $mensagem);
    }

    #[Test]
    public function texto_generico_em_pt_br_usa_a_traducao(): void
    {
        app()->setLocale('pt_BR');

        $mensagem = MensagemDeErro::paraUsuario(new PDOException('falha'));

        $this->assertSame(self::GENERICA_PT_BR, $mensagem);
    }

    #[Test]
    public function query_exception_devolve_texto_generico_sem_sql_nem_valores(): void
    {
        $canario = 'canario-'.bin2hex(random_bytes(8)).'@test.local';
        $excecao = new QueryException(
            'pgsql',
            'insert into "setors" ("nome") values (?)',
            [$canario],
            new PDOException('SQLSTATE[23505]: duplicate key'),
        );

        $mensagem = MensagemDeErro::paraUsuario($excecao);

        $this->assertSame(self::GENERICA_PT_BR, $mensagem);
        $this->assertStringNotContainsString('insert', $mensagem);
        $this->assertStringNotContainsString($canario, $mensagem);
    }

    #[Test]
    public function query_exception_registra_o_detalhe_no_log(): void
    {
        $excecao = new QueryException('pgsql', 'delete from "setors" where id = ?', [7], new PDOException('falha'));

        MensagemDeErro::paraUsuario($excecao);

        $registros = $this->registrosDeErro();
        $this->assertCount(1, $registros);
        $this->assertSame($excecao, $registros[0]->context['exception']);
    }

    #[Test]
    public function registrar_false_nao_duplica_o_log_de_quem_ja_registra(): void
    {
        $excecao = new QueryException('pgsql', 'update "users" set "email" = ?', ['x@test.local'], new PDOException('falha'));

        $mensagem = MensagemDeErro::paraUsuario($excecao, [], registrar: false);

        $this->assertSame(self::GENERICA_PT_BR, $mensagem);
        $this->assertCount(0, $this->registrosDeErro());
    }

    #[Test]
    public function pdo_exception_devolve_texto_generico_sem_o_detalhe_tecnico(): void
    {
        $mensagem = MensagemDeErro::paraUsuario(new PDOException('SQLSTATE[08006] could not translate host name "postgres"'));

        $this->assertSame(self::GENERICA_PT_BR, $mensagem);
        $this->assertStringNotContainsString('postgres', $mensagem);
    }

    #[Test]
    public function excecao_de_dominio_preserva_a_mensagem(): void
    {
        $mensagem = MensagemDeErro::paraUsuario(new RuntimeException('Este e-mail já está verificado.'));

        $this->assertSame('Este e-mail já está verificado.', $mensagem);
    }

    #[Test]
    public function excecao_de_dominio_nao_gera_registro_de_erro(): void
    {
        MensagemDeErro::paraUsuario(new RuntimeException('Este e-mail já está verificado.'));

        $this->assertSame([], $this->registrosDeErro());
    }

    /**
     * @return array<int, LogRecord>
     */
    private function registrosDeErro(): array
    {
        return array_values(array_filter(
            $this->capturado->getRecords(),
            fn (LogRecord $registro): bool => $registro->level->value >= 400,
        ));
    }
}
