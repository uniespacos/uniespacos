<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class LangJsonChavesTest extends TestCase
{
    private const CHAVES_DE_TEXTO_NOVO = [
        'Conflict with another approved reservation at this time.',
        'New Reservation Request',
        "A new reservation request for ':titulo_reserva' was submitted.",
        'Reservation Canceled',
        'The reservation ":titulo_reserva" was canceled.',
    ];

    /**
     * @return iterable<string, array{string}>
     */
    public static function arquivosDeIdiomaProvider(): iterable
    {
        yield 'pt.json' => ['pt.json'];
        yield 'pt_BR.json' => ['pt_BR.json'];
        yield 'es.json' => ['es.json'];
    }

    #[DataProvider('arquivosDeIdiomaProvider')]
    public function test_textos_novos_da_t24_existem_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $caminho = dirname(__DIR__, 2).'/lang/'.$arquivo;
        $traducoes = json_decode((string) file_get_contents($caminho), true, 512, JSON_THROW_ON_ERROR);

        $this->assertIsArray($traducoes);

        foreach (self::CHAVES_DE_TEXTO_NOVO as $chave) {
            $this->assertArrayHasKey($chave, $traducoes, "Chave ausente em {$arquivo}: {$chave}");
            $this->assertIsString($traducoes[$chave]);
            $this->assertNotSame('', $traducoes[$chave], "Tradução vazia em {$arquivo}: {$chave}");
        }
    }
}
