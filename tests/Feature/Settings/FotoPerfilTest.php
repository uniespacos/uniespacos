<?php

declare(strict_types=1);

namespace Tests\Feature\Settings;

use App\Models\Setor;
use App\Models\User;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FotoPerfilTest extends TestCase
{
    private const MARCA_GPS = 'MARCA-GPS-TESTE-UNIESPACOS';

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    private function atualizarFoto(User $user, UploadedFile $foto): TestResponse
    {
        return $this->actingAs($user)->patch('/settings/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => '77999999999',
            'setor_id' => Setor::factory()->create()->id,
            'photo' => $foto,
        ]);
    }

    private function usuario(string $fotoAtual = ''): User
    {
        return User::factory()->create(['profile_pic' => $fotoAtual]);
    }

    private function gravadaComoBytes(string $caminho): string
    {
        return Storage::disk('public')->get($caminho);
    }

    private function imagemDuasCores(int $largura, int $altura): GdImage
    {
        $imagem = imagecreatetruecolor($largura, $altura);
        $metade = intdiv($largura, 2);
        imagefilledrectangle($imagem, 0, 0, $metade - 1, $altura - 1, imagecolorallocate($imagem, 255, 0, 0));
        imagefilledrectangle($imagem, $metade, 0, $largura - 1, $altura - 1, imagecolorallocate($imagem, 0, 0, 255));

        return $imagem;
    }

    private function capturar(callable $codificar): string
    {
        ob_start();
        $codificar();

        return ob_get_clean();
    }

    private function jpegComOrientacaoEGps(int $largura, int $altura, int $orientacao): string
    {
        $jpeg = $this->capturar(fn () => imagejpeg($this->imagemDuasCores($largura, $altura), null, 95));

        return "\xFF\xD8".$this->segmentoApp1Exif($orientacao).substr($jpeg, 2);
    }

    private function segmentoApp1Exif(int $orientacao): string
    {
        $marca = self::MARCA_GPS."\0";
        $dadosInicio = 8 + 2 + 3 * 12 + 4;
        $gpsInicio = $dadosInicio + strlen($marca);

        $ifd0 = pack('v', 3)
            .$this->entradaIfd(0x010F, 2, strlen($marca), $dadosInicio)
            .$this->entradaIfd(0x0112, 3, 1, $orientacao)
            .$this->entradaIfd(0x8825, 4, 1, $gpsInicio)
            .pack('V', 0);

        $gps = pack('v', 1)
            .$this->entradaIfd(0x0001, 2, 2, ord('S'))
            .pack('V', 0);

        $payload = "Exif\0\0"
            .'II'.pack('v', 42).pack('V', 8)
            .$ifd0
            .$marca
            .$gps;

        return "\xFF\xE1".pack('n', strlen($payload) + 2).$payload;
    }

    private function entradaIfd(int $tag, int $tipo, int $quantidade, int $valor): string
    {
        $valorBytes = $tipo === 3 ? pack('v', $valor).pack('v', 0) : pack('V', $valor);

        return pack('v', $tag).pack('v', $tipo).pack('V', $quantidade).$valorBytes;
    }

    private function corPredominante(GdImage $imagem, int $x, int $y): string
    {
        $cor = imagecolorat($imagem, $x, $y);
        $r = ($cor >> 16) & 0xFF;
        $b = $cor & 0xFF;

        return $r > $b ? 'vermelho' : 'azul';
    }

    #[Test]
    public function foto_gravada_nao_contem_o_segmento_exif_nem_a_marca_de_gps(): void
    {
        $original = $this->jpegComOrientacaoEGps(600, 300, 1);
        $this->assertStringContainsString("Exif\0\0", $original, 'Fixture precisa conter EXIF');
        $this->assertStringContainsString(self::MARCA_GPS, $original, 'Fixture precisa conter a marca de GPS');

        $usuario = $this->usuario();
        $this->atualizarFoto($usuario, UploadedFile::fake()->createWithContent('celular.jpg', $original))
            ->assertSessionHasNoErrors();

        $gravada = $this->gravadaComoBytes($usuario->refresh()->getRawOriginal('profile_pic'));
        $this->assertStringNotContainsString("Exif\0\0", $gravada);
        $this->assertStringNotContainsString(self::MARCA_GPS, $gravada);
        $this->assertStringNotContainsString("\xFF\xE1", $gravada);
    }

    #[Test]
    public function orientacao_exif_seis_gira_a_foto_para_a_posicao_de_exibicao(): void
    {
        $original = $this->jpegComOrientacaoEGps(600, 300, 6);

        $usuario = $this->usuario();
        $this->atualizarFoto($usuario, UploadedFile::fake()->createWithContent('celular.jpg', $original))
            ->assertSessionHasNoErrors();

        $caminho = $usuario->refresh()->getRawOriginal('profile_pic');
        $this->assertSame([300, 600], array_slice(getimagesizefromstring($this->gravadaComoBytes($caminho)), 0, 2));

        $imagem = imagecreatefromstring($this->gravadaComoBytes($caminho));
        $this->assertSame('vermelho', $this->corPredominante($imagem, 150, 20));
        $this->assertSame('azul', $this->corPredominante($imagem, 150, 580));
    }

    #[Test]
    public function foto_sem_orientacao_exif_mantem_a_posicao_original(): void
    {
        $original = $this->jpegComOrientacaoEGps(600, 300, 1);

        $usuario = $this->usuario();
        $this->atualizarFoto($usuario, UploadedFile::fake()->createWithContent('celular.jpg', $original))
            ->assertSessionHasNoErrors();

        $caminho = $usuario->refresh()->getRawOriginal('profile_pic');
        $this->assertSame([600, 300], array_slice(getimagesizefromstring($this->gravadaComoBytes($caminho)), 0, 2));
    }

    #[Test]
    public function maior_lado_da_foto_gravada_nao_passa_de_800_pixels(): void
    {
        $usuario = $this->usuario();
        $this->atualizarFoto($usuario, UploadedFile::fake()->image('grande.jpg', 2000, 1000))
            ->assertSessionHasNoErrors();

        $caminho = $usuario->refresh()->getRawOriginal('profile_pic');
        $this->assertSame([800, 400], array_slice(getimagesizefromstring($this->gravadaComoBytes($caminho)), 0, 2));
    }

    #[Test]
    public function foto_menor_que_800_pixels_nao_e_ampliada(): void
    {
        $usuario = $this->usuario();
        $this->atualizarFoto($usuario, UploadedFile::fake()->image('pequena.jpg', 300, 200))
            ->assertSessionHasNoErrors();

        $caminho = $usuario->refresh()->getRawOriginal('profile_pic');
        $this->assertSame([300, 200], array_slice(getimagesizefromstring($this->gravadaComoBytes($caminho)), 0, 2));
    }

    #[Test]
    public function foto_gravada_recebe_nome_aleatorio_sem_o_nome_original(): void
    {
        $usuario = $this->usuario();
        $this->atualizarFoto($usuario, UploadedFile::fake()->image('minha-selfie-pessoal.jpg'))
            ->assertSessionHasNoErrors();

        $caminho = $usuario->refresh()->getRawOriginal('profile_pic');
        $this->assertMatchesRegularExpression('#^avatars/[A-Za-z0-9]{40}\.jpg$#', $caminho);
        $this->assertStringNotContainsString('selfie', $caminho);
    }

    #[Test]
    public function png_com_transparencia_mantem_o_canal_alfa(): void
    {
        $imagem = imagecreatetruecolor(100, 50);
        imagesavealpha($imagem, true);
        imagealphablending($imagem, false);
        imagefill($imagem, 0, 0, imagecolorallocatealpha($imagem, 0, 0, 0, 127));
        imagefilledrectangle($imagem, 50, 0, 99, 49, imagecolorallocatealpha($imagem, 10, 200, 10, 0));
        $png = $this->capturar(fn () => imagepng($imagem));

        $usuario = $this->usuario();
        $this->atualizarFoto($usuario, UploadedFile::fake()->createWithContent('logo.png', $png))
            ->assertSessionHasNoErrors();

        $caminho = $usuario->refresh()->getRawOriginal('profile_pic');
        $this->assertStringEndsWith('.png', $caminho);

        $gravada = imagecreatefromstring($this->gravadaComoBytes($caminho));
        $this->assertSame(127, (imagecolorat($gravada, 5, 5) >> 24) & 0x7F);
        $this->assertSame(0, (imagecolorat($gravada, 75, 25) >> 24) & 0x7F);
    }

    #[Test]
    public function gif_e_convertido_para_png(): void
    {
        $gif = $this->capturar(fn () => imagegif($this->imagemDuasCores(40, 40)));

        $usuario = $this->usuario();
        $this->atualizarFoto($usuario, UploadedFile::fake()->createWithContent('animacao.gif', $gif))
            ->assertSessionHasNoErrors();

        $caminho = $usuario->refresh()->getRawOriginal('profile_pic');
        $this->assertStringEndsWith('.png', $caminho);
        $this->assertSame(IMAGETYPE_PNG, getimagesizefromstring($this->gravadaComoBytes($caminho))[2]);
    }

    #[Test]
    public function webp_continua_webp(): void
    {
        $webp = $this->capturar(fn () => imagewebp($this->imagemDuasCores(40, 40)));

        $usuario = $this->usuario();
        $this->atualizarFoto($usuario, UploadedFile::fake()->createWithContent('foto.webp', $webp))
            ->assertSessionHasNoErrors();

        $caminho = $usuario->refresh()->getRawOriginal('profile_pic');
        $this->assertStringEndsWith('.webp', $caminho);
        $this->assertSame(IMAGETYPE_WEBP, getimagesizefromstring($this->gravadaComoBytes($caminho))[2]);
    }

    #[Test]
    public function imagem_corrompida_e_recusada_sem_gravar_nada(): void
    {
        $fotoAnterior = 'avatars/anterior.jpg';
        Storage::disk('public')->put($fotoAnterior, 'conteudo-anterior');
        $usuario = $this->usuario($fotoAnterior);

        $corrompida = "\xFF\xD8\xFF\xE0".str_repeat("\x00", 50);

        $this->atualizarFoto($usuario, UploadedFile::fake()->createWithContent('quebrada.jpg', $corrompida))
            ->assertSessionHasErrors('photo');

        $this->assertSame($fotoAnterior, $usuario->refresh()->getRawOriginal('profile_pic'));
        Storage::disk('public')->assertExists($fotoAnterior);
        $this->assertSame([$fotoAnterior], Storage::disk('public')->allFiles());
    }

    #[Test]
    public function imagem_com_dimensoes_excessivas_e_recusada_antes_de_decodificar(): void
    {
        $cabecalhoPng = "\x89PNG\r\n\x1a\n".pack('N', 13).'IHDR'.pack('NN', 10000, 10000)."\x08\x06\x00\x00\x00".pack('N', 0);

        $usuario = $this->usuario();
        $this->atualizarFoto($usuario, UploadedFile::fake()->createWithContent('bomba.png', $cabecalhoPng))
            ->assertSessionHasErrors('photo');

        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    #[Test]
    public function foto_anterior_e_apagada_quando_a_foto_e_trocada(): void
    {
        $fotoAnterior = 'avatars/anterior.jpg';
        Storage::disk('public')->put($fotoAnterior, 'conteudo-anterior');
        $usuario = $this->usuario($fotoAnterior);

        $this->atualizarFoto($usuario, UploadedFile::fake()->image('nova.jpg'))
            ->assertSessionHasNoErrors();

        $novo = $usuario->refresh()->getRawOriginal('profile_pic');
        $this->assertNotSame($fotoAnterior, $novo);
        Storage::disk('public')->assertMissing($fotoAnterior);
        Storage::disk('public')->assertExists($novo);
    }
}
