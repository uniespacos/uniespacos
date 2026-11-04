<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\FotoPerfilRepositoryInterface;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ReprocessamentoDeFotosDePerfilService
{
    private const DISCO = 'public';

    private const PASTA = 'avatars';

    private const LADO_MAXIMO = 800;

    private const TAMANHO_LOTE = 200;

    public function __construct(
        protected FotoPerfilRepositoryInterface $repo,
        protected ProcessadorDeFotoDePerfil $processador,
        protected DetectorDeMetadadosDeImagem $detector,
    ) {}

    /**
     * @return array<string, int>
     */
    public function executar(bool $simular = false): array
    {
        $contagens = [
            'total_com_foto' => 0,
            'ja_em_ordem' => 0,
            'reprocessadas' => 0,
            'ausentes' => 0,
            'ilegiveis' => 0,
            'alteradas_em_paralelo' => 0,
            'fora_do_padrao' => 0,
            'orfas' => 0,
        ];

        $this->repo->percorrerFotosDeUsuarios(self::TAMANHO_LOTE, function (array $lote) use (&$contagens, $simular): void {
            foreach ($lote as $usuario) {
                $contagens['total_com_foto']++;
                $contagens[$this->tratar($usuario['id'], $usuario['caminho'], $simular)]++;
            }
        });

        $contagens['orfas'] = $this->contarOrfas();

        return $contagens;
    }

    private function tratar(int $id, string $caminho, bool $simular): string
    {
        if (! str_starts_with($caminho, self::PASTA.'/') || str_contains($caminho, '..')) {
            return 'fora_do_padrao';
        }

        $disco = Storage::disk(self::DISCO);

        if (! $disco->exists($caminho)) {
            return 'ausentes';
        }

        try {
            $bytes = $disco->get($caminho);
        } catch (Throwable) {
            return 'ilegiveis';
        }

        if (! is_string($bytes)) {
            return 'ilegiveis';
        }

        $info = getimagesizefromstring($bytes);

        if ($info === false) {
            return 'ilegiveis';
        }

        if (! $this->detector->possuiMetadados($bytes) && max($info[0], $info[1]) <= self::LADO_MAXIMO) {
            return 'ja_em_ordem';
        }

        $imagem = $this->processador->reprocessar($bytes);

        if ($imagem === null) {
            return 'ilegiveis';
        }

        if ($simular) {
            return 'reprocessadas';
        }

        return $this->trocar($id, $caminho, $imagem);
    }

    /**
     * @param  array{string, string}  $imagem
     */
    private function trocar(int $id, string $caminhoAntigo, array $imagem): string
    {
        [$conteudo, $extensao] = $imagem;
        $disco = Storage::disk(self::DISCO);
        $novoCaminho = $this->processador->gravar($conteudo, $extensao);

        try {
            $trocou = $this->repo->trocarFoto($id, $caminhoAntigo, $novoCaminho);
        } catch (Throwable $e) {
            $disco->delete($novoCaminho);

            throw $e;
        }

        if (! $trocou) {
            $disco->delete($novoCaminho);

            return 'alteradas_em_paralelo';
        }

        $disco->delete($caminhoAntigo);

        return 'reprocessadas';
    }

    private function contarOrfas(): int
    {
        $referenciados = array_flip($this->repo->caminhosReferenciados());
        $orfas = 0;

        foreach (Storage::disk(self::DISCO)->files(self::PASTA) as $arquivo) {
            if (! isset($referenciados[$arquivo])) {
                $orfas++;
            }
        }

        return $orfas;
    }
}
