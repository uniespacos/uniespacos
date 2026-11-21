<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\AndarComEspacosException;
use App\Exceptions\AutorizacaoDeJobException;
use App\Exceptions\ConflitoDeHorarioException;
use App\Exceptions\ContaNaoPodeSerAnonimizadaException;
use App\Exceptions\DominioException;
use App\Exceptions\EmailJaVerificadoException;
use App\Exceptions\EscopoInvalidoException;
use App\Exceptions\ReservaArquivadaException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ExcecoesDeDominioTest extends TestCase
{
    private const CHAVES_PADRAO = [
        'Conflict with another approved reservation at this time.',
        'This reservation is archived and can no longer be changed.',
        'The requested scope is not valid for this action.',
        'You are not authorized to act on the requested time slots.',
        'This email address has already been verified.',
    ];

    /**
     * @return iterable<string, array{class-string<DominioException>}>
     */
    public static function subclassesDeDominio(): iterable
    {
        yield ConflitoDeHorarioException::class => [ConflitoDeHorarioException::class];
        yield ReservaArquivadaException::class => [ReservaArquivadaException::class];
        yield EscopoInvalidoException::class => [EscopoInvalidoException::class];
        yield AutorizacaoDeJobException::class => [AutorizacaoDeJobException::class];
        yield AndarComEspacosException::class => [AndarComEspacosException::class];
        yield EmailJaVerificadoException::class => [EmailJaVerificadoException::class];
        yield ContaNaoPodeSerAnonimizadaException::class => [ContaNaoPodeSerAnonimizadaException::class];
    }

    #[Test]
    #[DataProvider('subclassesDeDominio')]
    public function excecao_de_dominio_estende_a_base_e_a_exception_de_dominio_do_php(string $classe): void
    {
        $this->assertTrue(is_subclass_of($classe, DominioException::class));
        $this->assertTrue(is_subclass_of($classe, \DomainException::class));
    }

    #[Test]
    public function conflito_de_horario_usa_mensagem_padrao_traduzida_no_pt_br(): void
    {
        app()->setLocale('pt_BR');

        $this->assertSame('Conflito com outra reserva deferida neste horário.', (new ConflitoDeHorarioException)->getMessage());
    }

    #[Test]
    public function construtor_aceita_mensagem_especifica(): void
    {
        $this->assertSame('Horário X indisponível.', (new ReservaArquivadaException('Horário X indisponível.'))->getMessage());
    }

    #[Test]
    public function andar_com_espacos_inclui_o_nome_do_andar_na_mensagem(): void
    {
        app()->setLocale('pt_BR');

        $mensagem = AndarComEspacosException::porNome('segundo')->getMessage();

        $this->assertSame("Não é possível remover o andar 'segundo' porque ele já possui espaços vinculados.", $mensagem);
    }

    #[Test]
    public function andar_com_espacos_traduz_o_nome_do_andar_no_espanhol(): void
    {
        app()->setLocale('es');

        $mensagem = AndarComEspacosException::porNome('segundo')->getMessage();

        $this->assertSame("No es posible eliminar la planta 'segundo' porque ya tiene espacios asignados.", $mensagem);
    }

    #[Test]
    #[DataProvider('idiomasSuportados')]
    public function chaves_padrao_das_excecoes_de_dominio_existem_em_cada_idioma(string $idioma): void
    {
        foreach (self::CHAVES_PADRAO as $chave) {
            $this->assertNotSame($chave, __($chave, [], $idioma), "Chave sem tradução em {$idioma}: {$chave}");
        }
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function idiomasSuportados(): iterable
    {
        yield 'pt' => ['pt'];
        yield 'pt_BR' => ['pt_BR'];
        yield 'es' => ['es'];
    }
}
