<?php

declare(strict_types=1);

namespace App\Services;

class DetectorDeMetadadosDeImagem
{
    private const ASSINATURA_JPEG = "\xFF\xD8";

    private const ASSINATURA_PNG = "\x89PNG\r\n\x1a\n";

    private const MARCADOR_RST_INICIO = 0xD0;

    private const MARCADOR_SOI = 0xD8;

    private const MARCADOR_EOI = 0xD9;

    private const MARCADOR_SOS = 0xDA;

    private const MARCADOR_APP_INICIO = 0xE1;

    private const MARCADOR_APP_FIM = 0xEF;

    private const MARCADOR_COM = 0xFE;

    private const CHUNKS_PNG_COM_METADADOS = ['eXIf', 'tEXt', 'iTXt', 'zTXt'];

    private const CHUNKS_WEBP_COM_METADADOS = ['EXIF', 'XMP '];

    private const COMENTARIO_DO_ESCRITOR_GD = 'CREATOR: gd-jpeg ';

    private const INICIO_CHUNKS_WEBP = 12;

    /**
     * Estruturas malformadas antes dos dados da imagem contam como "com metadados": o reprocessamento remove tudo.
     */
    public function possuiMetadados(string $bytes): bool
    {
        if (str_starts_with($bytes, self::ASSINATURA_JPEG)) {
            return $this->jpeg($bytes);
        }

        if (str_starts_with($bytes, self::ASSINATURA_PNG)) {
            return $this->png($bytes);
        }

        if (str_starts_with($bytes, 'RIFF') && substr($bytes, 8, 4) === 'WEBP') {
            return $this->webp($bytes);
        }

        return false;
    }

    private function jpeg(string $bytes): bool
    {
        $tamanho = strlen($bytes);
        $posicao = 2;

        while ($posicao + 1 < $tamanho) {
            if (ord($bytes[$posicao]) !== 0xFF) {
                return true;
            }

            $marcador = ord($bytes[$posicao + 1]);

            if ($marcador === 0xFF) {
                $posicao++;

                continue;
            }

            if ($marcador === self::MARCADOR_SOS || $marcador === self::MARCADOR_EOI) {
                return false;
            }

            if ($marcador < 0xC0 || ($marcador >= self::MARCADOR_RST_INICIO && $marcador <= self::MARCADOR_SOI)) {
                return true;
            }

            if ($posicao + 4 > $tamanho) {
                return true;
            }

            $comprimento = unpack('n', substr($bytes, $posicao + 2, 2));

            if (! is_array($comprimento) || $comprimento[1] < 2) {
                return true;
            }

            if ($this->segmentoComMetadados($marcador, substr($bytes, $posicao + 4, $comprimento[1] - 2))) {
                return true;
            }

            $posicao += 2 + $comprimento[1];
        }

        return true;
    }

    private function segmentoComMetadados(int $marcador, string $dados): bool
    {
        if ($marcador === self::MARCADOR_COM) {
            return ! str_starts_with($dados, self::COMENTARIO_DO_ESCRITOR_GD);
        }

        return $marcador >= self::MARCADOR_APP_INICIO && $marcador <= self::MARCADOR_APP_FIM;
    }

    private function png(string $bytes): bool
    {
        $tamanho = strlen($bytes);
        $posicao = strlen(self::ASSINATURA_PNG);

        while ($posicao + 12 <= $tamanho) {
            $cabecalho = unpack('N', substr($bytes, $posicao, 4));

            if (! is_array($cabecalho)) {
                return true;
            }

            $tipo = substr($bytes, $posicao + 4, 4);

            if (in_array($tipo, self::CHUNKS_PNG_COM_METADADOS, true)) {
                return true;
            }

            if ($tipo === 'IEND') {
                return false;
            }

            $posicao += 12 + $cabecalho[1];
        }

        return true;
    }

    private function webp(string $bytes): bool
    {
        $tamanho = strlen($bytes);
        $posicao = self::INICIO_CHUNKS_WEBP;

        while ($posicao + 8 <= $tamanho) {
            $cabecalho = unpack('V', substr($bytes, $posicao + 4, 4));

            if (! is_array($cabecalho)) {
                return true;
            }

            $tipo = substr($bytes, $posicao, 4);

            if (in_array($tipo, self::CHUNKS_WEBP_COM_METADADOS, true)) {
                return true;
            }

            $comprimento = $cabecalho[1];
            $posicao += 8 + $comprimento + ($comprimento % 2);
        }

        return $posicao !== $tamanho;
    }
}
