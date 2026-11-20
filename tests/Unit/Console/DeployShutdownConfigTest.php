<?php

declare(strict_types=1);

namespace Tests\Unit\Console;

use App\Console\Commands\AgendadorExecutarCommand;
use Symfony\Component\Yaml\Yaml;
use Tests\TestCase;

class DeployShutdownConfigTest extends TestCase
{
    public function test_agendador_executar_trata_sigterm_sigint_e_sigquit(): void
    {
        if (extension_loaded('pcntl')) {
            $sinais = AgendadorExecutarCommand::sinaisDeParada();

            $this->assertContains(SIGTERM, $sinais);
            $this->assertContains(SIGINT, $sinais);
            $this->assertContains(SIGQUIT, $sinais);
        }

        $codigoFonte = file_get_contents(base_path('app/Console/Commands/AgendadorExecutarCommand.php'));
        $this->assertIsString($codigoFonte);

        $this->assertMatchesRegularExpression(
            '/function\s+sinaisDeParada\s*\(\s*\)\s*:\s*array\s*\{\s*return\s+\[[^\]]*SIGTERM[^\]]*SIGINT[^\]]*SIGQUIT[^\]]*\]\s*;\s*\}/s',
            $codigoFonte,
        );
        $this->assertStringContainsString('foreach (self::sinaisDeParada() as $sinal)', $codigoFonte);
        $this->assertStringContainsString('pcntl_signal($sinal, $marcarParada)', $codigoFonte);
    }

    public function test_compose_prod_define_stop_signal_sigterm_para_servicos_cli_e_preserva_app(): void
    {
        $compose = Yaml::parseFile(base_path('compose.prod.yml'));
        $this->assertIsArray($compose);
        $this->assertArrayHasKey('services', $compose);
        $this->assertIsArray($compose['services']);

        $servicos = $compose['services'];

        foreach (['scheduler', 'reverb', 'queue-worker'] as $servicoCli) {
            $this->assertArrayHasKey($servicoCli, $servicos);
            $this->assertIsArray($servicos[$servicoCli]);
            $this->assertSame('SIGTERM', $servicos[$servicoCli]['stop_signal'] ?? null);
        }

        $this->assertArrayHasKey('app', $servicos);
        $this->assertIsArray($servicos['app']);
        $this->assertArrayNotHasKey('stop_signal', $servicos['app']);
    }

    public function test_workflows_de_deploy_configuram_keepalive_ssh(): void
    {
        $workflows = [
            ['.github/workflows/cicd-staging.yml', 'deploy_staging'],
            ['.github/workflows/cicd-production.yml', 'deploy_production'],
        ];

        foreach ($workflows as [$arquivo, $jobName]) {
            $workflow = Yaml::parseFile(base_path($arquivo));
            $this->assertIsArray($workflow);
            $this->assertArrayHasKey('jobs', $workflow);
            $this->assertIsArray($workflow['jobs']);
            $this->assertArrayHasKey($jobName, $workflow['jobs']);

            $steps = $workflow['jobs'][$jobName]['steps'] ?? [];
            $this->assertIsArray($steps);

            $configureSsh = collect($steps)->firstWhere('name', 'Configure SSH');
            $this->assertIsArray($configureSsh);

            $script = (string) ($configureSsh['run'] ?? '');
            $this->assertStringContainsString('ServerAliveInterval', $script);
            $this->assertStringContainsString('ServerAliveCountMax', $script);
        }
    }

    public function test_cicd_staging_implanta_tag_recem_construida_no_workflow_dispatch(): void
    {
        $workflow = Yaml::parseFile(base_path('.github/workflows/cicd-staging.yml'));
        $this->assertIsArray($workflow);
        $this->assertArrayHasKey('jobs', $workflow);
        $this->assertIsArray($workflow['jobs']);

        $buildJob = $workflow['jobs']['build-and-push'] ?? null;
        $this->assertIsArray($buildJob);
        $this->assertSame('${{ steps.meta_app.outputs.version }}', $buildJob['outputs']['image_tag'] ?? null);

        $deploySteps = $workflow['jobs']['deploy_staging']['steps'] ?? [];
        $this->assertIsArray($deploySteps);

        $deployStep = collect($deploySteps)->firstWhere('name', 'Deploy to Staging via SSH');
        $this->assertIsArray($deployStep);
        $this->assertStringContainsString('${{ needs.build-and-push.outputs.image_tag }}', (string) ($deployStep['run'] ?? ''));

        $promoteStep = collect($deploySteps)->firstWhere('name', 'Promover imagens para a tag `staging`');
        $this->assertIsArray($promoteStep);
        $this->assertArrayNotHasKey('if', $promoteStep);
        $this->assertStringContainsString('${{ needs.build-and-push.outputs.image_tag }}', (string) ($promoteStep['run'] ?? ''));
    }
}
