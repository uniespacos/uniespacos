<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\DetectorDeMetadadosDeImagem;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class DetectorDeMetadadosDeImagemTest extends TestCase
{
    private const SOI = "\xFF\xD8";

    private const SOS_E_EOI = "\xFF\xDA\x00\x02\xFF\xD9";

    private const ASSINATURA_PNG = "\x89PNG\r\n\x1a\n";

    private function segmento(int $marcador, string $dados): string
    {
        return "\xFF".chr($marcador).pack('n', strlen($dados) + 2).$dados;
    }

    private function chunkPng(string $tipo, string $dados): string
    {
        return pack('N', strlen($dados)).$tipo.$dados.pack('N', crc32($tipo.$dados));
    }

    private function webp(string $chunks): string
    {
        $corpo = 'WEBP'.$chunks;

        return 'RIFF'.pack('V', strlen($corpo)).$corpo;
    }

    private function chunkWebp(string $tipo, string $dados): string
    {
        return $tipo.pack('V', strlen($dados)).$dados.(strlen($dados) % 2 === 1 ? "\0" : '');
    }

    #[Test]
    public function jpeg_so_com_jfif_nao_tem_metadados(): void
    {
        $jpeg = self::SOI.$this->segmento(0xE0, "JFIF\0\x01\x01\x00\x00\x01\x00\x01\x00\x00").self::SOS_E_EOI;

        $this->assertFalse((new DetectorDeMetadadosDeImagem)->possuiMetadados($jpeg));
    }

    #[Test]
    #[DataProvider('segmentosJpegComMetadados')]
    public function jpeg_com_segmento_de_metadados_antes_do_sos_tem_metadados(int $marcador): void
    {
        $jpeg = self::SOI.$this->segmento($marcador, 'dados').self::SOS_E_EOI;

        $this->assertTrue((new DetectorDeMetadadosDeImagem)->possuiMetadados($jpeg));
    }

    /**
     * @return array<string, array{int}>
     */
    public static function segmentosJpegComMetadados(): array
    {
        return [
            'APP1 (EXIF/XMP)' => [0xE1],
            'APP13 (IPTC)' => [0xED],
            'APP15' => [0xEF],
            'COM (comentário)' => [0xFE],
        ];
    }

    #[Test]
    public function comentario_do_proprio_gd_nao_conta_como_metadado(): void
    {
        $jpeg = self::SOI.$this->segmento(0xFE, 'CREATOR: gd-jpeg v1.0 (using IJG JPEG v80), quality = 85').self::SOS_E_EOI;

        $this->assertFalse((new DetectorDeMetadadosDeImagem)->possuiMetadados($jpeg));
    }

    #[Test]
    public function comentario_de_outra_origem_conta_como_metadado(): void
    {
        $jpeg = self::SOI.$this->segmento(0xFE, 'Localizacao: -14.86, -40.84').self::SOS_E_EOI;

        $this->assertTrue((new DetectorDeMetadadosDeImagem)->possuiMetadados($jpeg));
    }

    #[Test]
    public function jpeg_truncado_antes_do_sos_e_tratado_como_tendo_metadados(): void
    {
        $this->assertTrue((new DetectorDeMetadadosDeImagem)->possuiMetadados(self::SOI."\xFF\xE0\x00"));
    }

    #[Test]
    public function png_sem_chunks_de_texto_nao_tem_metadados(): void
    {
        $png = self::ASSINATURA_PNG
            .$this->chunkPng('IHDR', pack('NN', 10, 10)."\x08\x06\x00\x00\x00")
            .$this->chunkPng('IDAT', 'dados')
            .$this->chunkPng('IEND', '');

        $this->assertFalse((new DetectorDeMetadadosDeImagem)->possuiMetadados($png));
    }

    #[Test]
    #[DataProvider('chunksPngComMetadados')]
    public function png_com_chunk_de_metadados_tem_metadados(string $tipo): void
    {
        $png = self::ASSINATURA_PNG
            .$this->chunkPng('IHDR', pack('NN', 10, 10)."\x08\x06\x00\x00\x00")
            .$this->chunkPng($tipo, 'dados')
            .$this->chunkPng('IEND', '');

        $this->assertTrue((new DetectorDeMetadadosDeImagem)->possuiMetadados($png));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function chunksPngComMetadados(): array
    {
        return [
            'eXIf' => ['eXIf'],
            'tEXt' => ['tEXt'],
            'iTXt' => ['iTXt'],
            'zTXt' => ['zTXt'],
        ];
    }

    #[Test]
    public function webp_sem_exif_nem_xmp_nao_tem_metadados(): void
    {
        $webp = $this->webp($this->chunkWebp('VP8L', 'imagem').$this->chunkWebp('ALPH', 'x'));

        $this->assertFalse((new DetectorDeMetadadosDeImagem)->possuiMetadados($webp));
    }

    #[Test]
    #[DataProvider('chunksWebpComMetadados')]
    public function webp_com_chunk_exif_ou_xmp_tem_metadados(string $tipo): void
    {
        $webp = $this->webp($this->chunkWebp('VP8L', 'imagem').$this->chunkWebp($tipo, 'meta'));

        $this->assertTrue((new DetectorDeMetadadosDeImagem)->possuiMetadados($webp));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function chunksWebpComMetadados(): array
    {
        return [
            'EXIF' => ['EXIF'],
            'XMP ' => ['XMP '],
        ];
    }

    #[Test]
    public function formato_desconhecido_nao_e_considerado_com_metadados_por_esta_regra(): void
    {
        $this->assertFalse((new DetectorDeMetadadosDeImagem)->possuiMetadados('GIF89a'.str_repeat("\0", 20)));
    }
}
