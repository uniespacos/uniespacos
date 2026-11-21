<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\Relatorio\Exporters\CsvExporter;
use App\Services\Relatorio\Exporters\ExporterFactory;
use App\Services\Relatorio\Exporters\PdfExporter;
use App\Services\Relatorio\Exporters\XlsxExporter;
use Illuminate\Support\ServiceProvider;

final class RelatorioServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../../config/relatorios.php', 'relatorios');

        $this->app->tag([PdfExporter::class, CsvExporter::class, XlsxExporter::class], 'relatorio.exporters');

        $this->app->singleton(ExporterFactory::class, fn ($app) => new ExporterFactory($app->tagged('relatorio.exporters')));
    }

    public function boot(): void {}
}
