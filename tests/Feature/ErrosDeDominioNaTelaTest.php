<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Espaco;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use App\Services\ModuloService;
use App\Support\MensagemDeErro;
use Illuminate\Support\Facades\Notification;
use RuntimeException;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ErrosDeDominioNaTelaTest extends TestCase
{
    private Unidade $unidade;

    private Setor $setor;

    private Modulo $modulo;

    protected function setUp(): void
    {
        parent::setUp();

        app()->setLocale('pt_BR');

        Permission::firstOrCreate(['name' => 'secao.gestao-modulos', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'modulos.atualizar', 'guard_name' => 'web']);

        $instituicao = Instituicao::factory()->create();
        $this->unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $this->setor = Setor::factory()->create(['unidade_id' => $this->unidade->id]);
        $this->modulo = Modulo::factory()->create(['nome' => 'Módulo Original', 'unidade_id' => $this->unidade->id]);
        $this->modulo->andars()->create(['nome' => 'terreo', 'tipo_acesso' => ['terreo']]);
    }

    public function test_remover_andar_com_espacos_mostra_a_mensagem_de_dominio(): void
    {
        $usuario = $this->usuarioComPermissaoDeModulos();
        $andar = $this->modulo->andars()->create(['nome' => 'segundo', 'tipo_acesso' => ['terreo']]);
        Espaco::factory()->create(['andar_id' => $andar->id]);

        $response = $this->actingAs($usuario)
            ->put(route('institucional.modulos.update', $this->modulo->id), $this->payloadSoComTerreo());

        $mensagemDeDominio = __('Cannot remove floor \':andar\' because it already has spaces assigned.', ['andar' => 'segundo']);
        $response->assertSessionHas('error', __('Error updating module: :message', ['message' => $mensagemDeDominio]));
        $this->assertDatabaseHas('andars', ['id' => $andar->id]);
    }

    public function test_falha_inesperada_no_service_mostra_texto_generico_sem_vazar_detalhe_interno(): void
    {
        $this->mock(ModuloService::class, function ($mock): void {
            $mock->shouldReceive('update')->andThrow(new RuntimeException('segredo-interno: /var/www/app/Services/ModuloService.php'));
        });

        $response = $this->actingAs($this->usuarioComPermissaoDeModulos())
            ->put(route('institucional.modulos.update', $this->modulo->id), $this->payloadSoComTerreo());

        $genericaTraduzida = __(MensagemDeErro::GENERICA);
        $response->assertSessionHas('error', __('Error updating module: :message', ['message' => $genericaTraduzida]));
        $this->assertStringNotContainsString('segredo-interno', (string) session('error'));
    }

    public function test_reenviar_verificacao_de_email_ja_verificado_mostra_a_mensagem_de_dominio(): void
    {
        Notification::fake();

        $admin = User::factory()->create(['setor_id' => $this->setor->id]);
        $admin->assignRole('institucional');
        $usuario = User::factory()->create(['setor_id' => $this->setor->id, 'email_verified_at' => '2026-01-01 00:00:00']);

        $response = $this->actingAs($admin)
            ->post(route('institucional.usuarios.resend-verification', ['usuario' => $usuario->id]));

        $response->assertSessionHas('error', __('This email address has already been verified.'));
        Notification::assertNothingSent();
    }

    private function usuarioComPermissaoDeModulos(): User
    {
        $user = User::factory()->create(['setor_id' => $this->setor->id]);
        $user->givePermissionTo(['secao.gestao-modulos', 'modulos.atualizar']);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadSoComTerreo(): array
    {
        return [
            'nome' => 'Módulo Atualizado',
            'unidade_id' => $this->unidade->id,
            'andares' => [
                ['nome' => 'terreo', 'tipo_acesso' => ['terreo']],
            ],
        ];
    }
}
