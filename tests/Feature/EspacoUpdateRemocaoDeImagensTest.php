<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Andar;
use App\Models\Espaco;
use App\Services\EspacoService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EspacoUpdateRemocaoDeImagensTest extends TestCase
{
    private const FOTO_PROPRIA = 'espacos_images/propria.jpg';

    private const FOTO_DE_OUTRO_ESPACO = 'espacos_images/de-outro-espaco.jpg';

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    public function test_caminho_de_outro_espaco_nao_e_apagado_do_disco(): void
    {
        Log::spy();
        Storage::disk('public')->put(self::FOTO_PROPRIA, 'x');
        Storage::disk('public')->put(self::FOTO_DE_OUTRO_ESPACO, 'y');

        $espaco = Espaco::factory()->create([
            'imagens' => [self::FOTO_PROPRIA],
            'main_image_index' => self::FOTO_PROPRIA,
            'andar_id' => Andar::factory()->create()->id,
        ]);

        app(EspacoService::class)->update(
            $espaco,
            $this->dadosBasicos($espaco),
            [],
            [self::FOTO_PROPRIA, self::FOTO_DE_OUTRO_ESPACO],
        );

        Storage::disk('public')->assertMissing(self::FOTO_PROPRIA);
        Storage::disk('public')->assertExists(self::FOTO_DE_OUTRO_ESPACO);
        Log::shouldHaveReceived('warning')
            ->once()
            ->with(
                'Caminhos de imagem fora do espaço ignorados na atualização',
                ['espaco_id' => $espaco->id, 'caminhos' => [self::FOTO_DE_OUTRO_ESPACO]],
            );
    }

    public function test_remocao_de_imagem_propria_continua_funcionando_sem_warning(): void
    {
        Log::spy();
        Storage::disk('public')->put(self::FOTO_PROPRIA, 'x');

        $espaco = Espaco::factory()->create([
            'imagens' => [self::FOTO_PROPRIA],
            'main_image_index' => self::FOTO_PROPRIA,
            'andar_id' => Andar::factory()->create()->id,
        ]);

        $atualizado = app(EspacoService::class)->update(
            $espaco,
            $this->dadosBasicos($espaco),
            [],
            [self::FOTO_PROPRIA],
        );

        Storage::disk('public')->assertMissing(self::FOTO_PROPRIA);
        $this->assertSame([], $atualizado->imagens);
        Log::shouldNotHaveReceived('warning');
    }

    /**
     * @return array<string, mixed>
     */
    private function dadosBasicos(Espaco $espaco): array
    {
        return [
            'nome' => $espaco->nome,
            'capacidade_pessoas' => 30,
            'descricao' => 'Descrição',
            'andar_id' => $espaco->andar_id,
        ];
    }
}
