<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\ReprocessamentoDeFotosDePerfilService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class ReprocessarFotosDePerfilCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'fotos:reprocessar {--dry-run : Apenas conta as fotos que seriam reprocessadas, sem alterar nada}';

    /**
     * @var string
     */
    protected $description = 'Reprocessa fotos de perfil antigas com metadados (EXIF, GPS) ou lado maior que 800 px. Execução única.';

    public function handle(ReprocessamentoDeFotosDePerfilService $reprocessamento): int
    {
        $simular = (bool) $this->option('dry-run');

        $this->info($simular ? 'Simulação: nenhuma foto será alterada.' : 'Reprocessando fotos de perfil antigas.');

        try {
            $contagens = $reprocessamento->executar($simular);
        } catch (Throwable $e) {
            $excecao = $e::class;

            Log::error('fotos.reprocessamento_falhou', ['excecao' => $excecao]);
            $this->error("Falhou ({$excecao}).");

            return self::FAILURE;
        }

        $rotulos = [
            'total_com_foto' => 'total com foto',
            'ja_em_ordem' => 'já em ordem',
            'reprocessadas' => $simular ? 'a reprocessar' : 'reprocessadas',
            'ausentes' => 'ausentes no disco',
            'ilegiveis' => 'ilegíveis ou não processáveis',
            'alteradas_em_paralelo' => 'alteradas em paralelo',
            'fora_do_padrao' => 'fora do padrão',
            'orfas' => 'órfãs (sem usuário)',
        ];

        foreach ($rotulos as $chave => $rotulo) {
            $this->line("{$rotulo}: {$contagens[$chave]}");
        }

        Log::info('fotos.reprocessamento_concluido', [...$contagens, 'simulacao' => $simular]);

        return self::SUCCESS;
    }
}
