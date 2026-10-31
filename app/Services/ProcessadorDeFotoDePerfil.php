<?php

declare(strict_types=1);

namespace App\Services;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProcessadorDeFotoDePerfil
{
    private const DISCO = 'public';

    private const PASTA = 'avatars';

    private const LADO_MAXIMO = 800;

    private const PIXELS_MAXIMOS = 25_000_000;

    private const QUALIDADE_JPEG = 85;

    private const QUALIDADE_WEBP = 85;

    private const COMPRIMENTO_NOME = 40;

    private const ORIENTACAO_PADRAO = 1;

    private const MARCADOR_APP1 = 0xE1;

    private const MARCADOR_SOS = 0xDA;

    private const MARCADOR_EOI = 0xD9;

    private const TAG_ORIENTACAO = 0x0112;

    public function armazenar(UploadedFile $arquivo): ?string
    {
        $bytes = file_get_contents($arquivo->getRealPath());

        if ($bytes === false) {
            return null;
        }

        $info = getimagesizefromstring($bytes);

        if ($info === false || $info[0] * $info[1] > self::PIXELS_MAXIMOS) {
            return null;
        }

        $imagem = @imagecreatefromstring($bytes);

        if (! $imagem instanceof GdImage) {
            return null;
        }

        $orientada = $this->aplicarOrientacao($imagem, $this->orientacaoExif($bytes));

        if (! $orientada instanceof GdImage) {
            return null;
        }

        [$conteudo, $extensao] = $this->codificar($this->redimensionar($orientada), $info[2]);

        $caminho = self::PASTA.'/'.Str::random(self::COMPRIMENTO_NOME).'.'.$extensao;

        Storage::disk(self::DISCO)->put($caminho, $conteudo);

        return $caminho;
    }

    private function orientacaoExif(string $bytes): int
    {
        if (! str_starts_with($bytes, "\xFF\xD8")) {
            return self::ORIENTACAO_PADRAO;
        }

        $tamanho = strlen($bytes);
        $posicao = 2;

        while ($posicao + 4 <= $tamanho && ord($bytes[$posicao]) === 0xFF) {
            $marcador = ord($bytes[$posicao + 1]);

            if ($marcador === 0xFF) {
                $posicao++;

                continue;
            }

            if ($marcador === self::MARCADOR_SOS || $marcador === self::MARCADOR_EOI) {
                break;
            }

            $comprimento = $this->lerInteiro($bytes, $posicao + 2, 2, false);

            if ($comprimento === null || $comprimento < 2) {
                break;
            }

            if ($marcador === self::MARCADOR_APP1 && substr($bytes, $posicao + 4, 6) === "Exif\0\0" && $comprimento >= 8) {
                return $this->orientacaoTiff(substr($bytes, $posicao + 10, $comprimento - 8));
            }

            $posicao += 2 + $comprimento;
        }

        return self::ORIENTACAO_PADRAO;
    }

    private function orientacaoTiff(string $tiff): int
    {
        if (strlen($tiff) < 8) {
            return self::ORIENTACAO_PADRAO;
        }

        $ordem = substr($tiff, 0, 2);

        if ($ordem !== 'II' && $ordem !== 'MM') {
            return self::ORIENTACAO_PADRAO;
        }

        $littleEndian = $ordem === 'II';
        $ifd = $this->lerInteiro($tiff, 4, 4, $littleEndian);

        if ($ifd === null) {
            return self::ORIENTACAO_PADRAO;
        }

        $quantidade = $this->lerInteiro($tiff, $ifd, 2, $littleEndian);

        if ($quantidade === null) {
            return self::ORIENTACAO_PADRAO;
        }

        for ($indice = 0; $indice < $quantidade; $indice++) {
            $entrada = $ifd + 2 + $indice * 12;

            if ($this->lerInteiro($tiff, $entrada, 2, $littleEndian) !== self::TAG_ORIENTACAO) {
                continue;
            }

            $valor = $this->lerInteiro($tiff, $entrada + 8, 2, $littleEndian);

            return $valor !== null && $valor >= 1 && $valor <= 8 ? $valor : self::ORIENTACAO_PADRAO;
        }

        return self::ORIENTACAO_PADRAO;
    }

    private function lerInteiro(string $dados, int $posicao, int $bytes, bool $littleEndian): ?int
    {
        if ($posicao < 0 || $posicao + $bytes > strlen($dados)) {
            return null;
        }

        $formato = $bytes === 2
            ? ($littleEndian ? 'v' : 'n')
            : ($littleEndian ? 'V' : 'N');

        $valor = unpack($formato, substr($dados, $posicao, $bytes));

        return is_array($valor) ? (int) $valor[1] : null;
    }

    private function aplicarOrientacao(GdImage $imagem, int $orientacao): ?GdImage
    {
        $espelhamento = match ($orientacao) {
            2, 5, 7 => IMG_FLIP_HORIZONTAL,
            4 => IMG_FLIP_VERTICAL,
            default => null,
        };

        if ($espelhamento !== null) {
            imageflip($imagem, $espelhamento);
        }

        $angulo = match ($orientacao) {
            3 => 180,
            5, 8 => 90,
            6, 7 => 270,
            default => 0,
        };

        if ($angulo === 0) {
            return $imagem;
        }

        $rotacionada = imagerotate($imagem, $angulo, 0);

        return $rotacionada instanceof GdImage ? $rotacionada : null;
    }

    private function redimensionar(GdImage $imagem): GdImage
    {
        $largura = imagesx($imagem);
        $altura = imagesy($imagem);
        $maiorLado = max($largura, $altura);

        $escala = $maiorLado > self::LADO_MAXIMO ? self::LADO_MAXIMO / $maiorLado : 1.0;
        $novaLargura = max(1, (int) round($largura * $escala));
        $novaAltura = max(1, (int) round($altura * $escala));

        $tela = imagecreatetruecolor($novaLargura, $novaAltura);
        imagesavealpha($tela, true);
        imagealphablending($tela, false);
        $transparente = imagecolorallocatealpha($tela, 0, 0, 0, 127);

        if ($transparente !== false) {
            imagefill($tela, 0, 0, $transparente);
        }
        imagecopyresampled($tela, $imagem, 0, 0, 0, 0, $novaLargura, $novaAltura, $largura, $altura);

        return $tela;
    }

    /**
     * @return array{string, string}
     */
    private function codificar(GdImage $imagem, int $tipo): array
    {
        return match ($tipo) {
            IMAGETYPE_JPEG => [$this->capturar(fn () => imagejpeg($imagem, null, self::QUALIDADE_JPEG)), 'jpg'],
            IMAGETYPE_WEBP => [$this->capturar(fn () => imagewebp($imagem, null, self::QUALIDADE_WEBP)), 'webp'],
            default => [$this->capturar(fn () => imagepng($imagem)), 'png'],
        };
    }

    private function capturar(callable $codificar): string
    {
        ob_start();
        $codificar();

        return (string) ob_get_clean();
    }
}
