<?php

declare(strict_types=1);

namespace App\Services\Relatorio\Exporters;

use App\Enums\Relatorio\FormatoRelatorioEnum;
use App\Services\Relatorio\Data\DadosRelatorio;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class PdfExporter implements ExporterInterface
{
    public function suporta(FormatoRelatorioEnum $formato): bool
    {
        return $formato === FormatoRelatorioEnum::PDF;
    }

    public function exportar(DadosRelatorio $dados, string $nomeArquivo): StreamedResponse
    {
        ini_set('memory_limit', '512M');
        set_time_limit(120);

        $maxLinhasPdf = (int) config('relatorios.pdf.max_linhas_amostra', 30);
        $linhasAmostra = array_slice($dados->linhas, 0, $maxLinhasPdf);
        $totalOmitidas = max(0, count($dados->linhas) - $maxLinhasPdf);

        $orientacao = count($dados->colunas) > 6 ? 'landscape' : config('relatorios.pdf.orientacao_padrao', 'portrait');

        $pdf = Pdf::loadView('relatorios.pdf.tabela', [
            'dados' => $dados,
            'linhasAmostra' => $linhasAmostra,
            'totalOmitidas' => $totalOmitidas,
            'maxLinhasPdf' => $maxLinhasPdf,
        ]);
        $pdf->setPaper(config('relatorios.pdf.tamanho', 'A4'), $orientacao);

        return response()->streamDownload(
            function () use ($pdf) {
                echo $pdf->output();
            },
            $nomeArquivo,
            ['Content-Type' => 'application/pdf'],
        );
    }
}
