<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class LangJsonChavesTest extends TestCase
{
    private const CHAVES_DE_TEXTO_NOVO = [
        'an internal error occurred. Please try again.',
        'The reason must be a valid text.',
        'The reason may not have more than :max characters.',
        'The description may not have more than :max characters.',
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
    public function test_textos_novos_de_minimizacao_e_validacao_existem_em_cada_arquivo_de_idioma(string $arquivo): void
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
