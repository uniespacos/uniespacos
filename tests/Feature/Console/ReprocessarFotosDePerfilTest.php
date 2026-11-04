<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Models\User;
use App\Repositories\FotoPerfilRepositoryEloquent;
use App\Repositories\FotoPerfilRepositoryInterface;
use App\Services\ProcessadorDeFotoDePerfil;
use GdImage;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ReprocessarFotosDePerfilTest extends TestCase
{
    use DatabaseTransactions;

    private const MARCA_GPS = 'MARCA-GPS-TESTE-UNIESPACOS';

    private const MARCA_TEXTO = 'MARCA-TEXTO-TESTE-UNIESPACOS';

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    private function usuario(string $fotoAtual, string $nome = 'Usuário de teste', string $email = ''): User
    {
        return User::factory()->create([
            'name' => $nome,
            'email' => $email !== '' ? $email : 'teste-'.uniqid().'@test.local',
            'profile_pic' => $fotoAtual,
        ]);
    }

    private function bytesDoDisco(string $caminho): string
    {
        return Storage::disk('public')->get($caminho);
    }

    private function fotoDoBanco(User $usuario): string
    {
        return (string) DB::table('users')->where('id', $usuario->id)->value('profile_pic');
    }

    private function arquivosNoDisco(): array
    {
        $arquivos = Storage::disk('public')->allFiles();
        sort($arquivos);

        return $arquivos;
    }

    private function capturar(callable $codificar): string
    {
        ob_start();
        $codificar();

        return (string) ob_get_clean();
    }

    private function imagemDuasCores(int $largura, int $altura): GdImage
    {
        $imagem = imagecreatetruecolor($largura, $altura);
        $metade = intdiv($largura, 2);
        imagefilledrectangle($imagem, 0, 0, $metade - 1, $altura - 1, imagecolorallocate($imagem, 255, 0, 0));
        imagefilledrectangle($imagem, $metade, 0, $largura - 1, $altura - 1, imagecolorallocate($imagem, 0, 0, 255));

        return $imagem;
    }

    private function jpegSemMetadados(int $largura, int $altura): string
    {
        return $this->capturar(fn () => imagejpeg($this->imagemDuasCores($largura, $altura), null, 95));
    }

    private function jpegComExifEGps(int $largura, int $altura, int $orientacao = 1): string
    {
        return "\xFF\xD8".$this->segmentoApp1Exif($orientacao).substr($this->jpegSemMetadados($largura, $altura), 2);
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

    private function pngSemMetadados(int $largura, int $altura): string
    {
        return $this->capturar(fn () => imagepng($this->imagemDuasCores($largura, $altura)));
    }

    private function pngComTexto(int $largura, int $altura): string
    {
        $png = $this->pngSemMetadados($largura, $altura);

        return substr($png, 0, 33).$this->chunkPng('tEXt', "Comment\0".self::MARCA_TEXTO).substr($png, 33);
    }

    private function chunkPng(string $tipo, string $dados): string
    {
        return pack('N', strlen($dados)).$tipo.$dados.pack('N', crc32($tipo.$dados));
    }

    private function webpComChunkExtra(string $tipo, string $dados): string
    {
        $webp = $this->capturar(fn () => imagewebp($this->imagemDuasCores(40, 40)));
        $chunk = $tipo.pack('V', strlen($dados)).$dados.(strlen($dados) % 2 === 1 ? "\0" : '');
        $corpo = substr($webp, 8).$chunk;

        return 'RIFF'.pack('V', strlen($corpo)).$corpo;
    }

    #[Test]
    public function jpeg_com_exif_e_gps_e_reprocessado_e_a_foto_antiga_e_apagada(): void
    {
        Storage::disk('public')->put('avatars/antiga.jpg', $this->jpegComExifEGps(600, 300));
        $usuario = $this->usuario('avatars/antiga.jpg');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('reprocessadas: 1')
            ->assertExitCode(0);

        $novo = $this->fotoDoBanco($usuario);
        $this->assertNotSame('avatars/antiga.jpg', $novo);
        $this->assertMatchesRegularExpression('#^avatars/[A-Za-z0-9]{40}\.jpg$#', $novo);
        Storage::disk('public')->assertMissing('avatars/antiga.jpg');
        Storage::disk('public')->assertExists($novo);
        $this->assertSame([$novo], $this->arquivosNoDisco());

        $gravada = $this->bytesDoDisco($novo);
        $this->assertStringNotContainsString(self::MARCA_GPS, $gravada);
        $this->assertStringNotContainsString("Exif\0\0", $gravada);
        $this->assertStringNotContainsString("\xFF\xE1", $gravada);
    }

    #[Test]
    public function png_com_texto_e_reprocessado_sem_o_chunk_de_texto(): void
    {
        Storage::disk('public')->put('avatars/com-texto.png', $this->pngComTexto(120, 80));
        $usuario = $this->usuario('avatars/com-texto.png');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('reprocessadas: 1')
            ->assertExitCode(0);

        $novo = $this->fotoDoBanco($usuario);
        $this->assertStringEndsWith('.png', $novo);
        $gravada = $this->bytesDoDisco($novo);
        $this->assertStringNotContainsString(self::MARCA_TEXTO, $gravada);
        $this->assertStringNotContainsString('tEXt', $gravada);
    }

    #[Test]
    public function jpeg_sem_metadados_com_lado_maior_que_800_e_reduzido(): void
    {
        Storage::disk('public')->put('avatars/grande.jpg', $this->jpegSemMetadados(2000, 1000));
        $usuario = $this->usuario('avatars/grande.jpg');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('reprocessadas: 1')
            ->assertExitCode(0);

        $novo = $this->fotoDoBanco($usuario);
        $this->assertSame([800, 400], array_slice(getimagesizefromstring($this->bytesDoDisco($novo)), 0, 2));
        Storage::disk('public')->assertMissing('avatars/grande.jpg');
    }

    #[Test]
    public function foto_limpa_com_lado_ate_800_e_intocada(): void
    {
        Storage::disk('public')->put('avatars/limpa.jpg', $this->jpegSemMetadados(300, 200));
        Storage::disk('public')->put('avatars/limite.png', $this->pngSemMetadados(800, 600));
        $antigoJpeg = $this->bytesDoDisco('avatars/limpa.jpg');
        $antigoPng = $this->bytesDoDisco('avatars/limite.png');
        $jpeg = $this->usuario('avatars/limpa.jpg');
        $png = $this->usuario('avatars/limite.png');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('já em ordem: 2')
            ->expectsOutputToContain('reprocessadas: 0')
            ->assertExitCode(0);

        $this->assertSame('avatars/limpa.jpg', $this->fotoDoBanco($jpeg));
        $this->assertSame('avatars/limite.png', $this->fotoDoBanco($png));
        $this->assertSame($antigoJpeg, $this->bytesDoDisco('avatars/limpa.jpg'));
        $this->assertSame($antigoPng, $this->bytesDoDisco('avatars/limite.png'));
    }

    #[Test]
    public function dry_run_conta_sem_alterar_disco_nem_banco(): void
    {
        Storage::disk('public')->put('avatars/exif.jpg', $this->jpegComExifEGps(600, 300));
        Storage::disk('public')->put('avatars/grande.jpg', $this->jpegSemMetadados(2000, 1000));
        Storage::disk('public')->put('avatars/limpa.jpg', $this->jpegSemMetadados(300, 200));
        $arquivosAntes = $this->arquivosNoDisco();
        $exif = $this->usuario('avatars/exif.jpg');
        $grande = $this->usuario('avatars/grande.jpg');
        $limpa = $this->usuario('avatars/limpa.jpg');

        $this->artisan('fotos:reprocessar', ['--dry-run' => true])
            ->expectsOutputToContain('Simulação: nenhuma foto será alterada.')
            ->expectsOutputToContain('a reprocessar: 2')
            ->expectsOutputToContain('já em ordem: 1')
            ->assertExitCode(0);

        $this->assertSame($arquivosAntes, $this->arquivosNoDisco());
        $this->assertSame('avatars/exif.jpg', $this->fotoDoBanco($exif));
        $this->assertSame('avatars/grande.jpg', $this->fotoDoBanco($grande));
        $this->assertSame('avatars/limpa.jpg', $this->fotoDoBanco($limpa));
    }

    #[Test]
    public function segunda_execucao_nao_reprocessa_nada(): void
    {
        Storage::disk('public')->put('avatars/exif.jpg', $this->jpegComExifEGps(600, 300));
        Storage::disk('public')->put('avatars/grande.jpg', $this->jpegSemMetadados(2000, 1000));
        $this->usuario('avatars/exif.jpg');
        $this->usuario('avatars/grande.jpg');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('reprocessadas: 2')
            ->assertExitCode(0);

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('reprocessadas: 0')
            ->expectsOutputToContain('já em ordem: 2')
            ->assertExitCode(0);
    }

    #[Test]
    public function fotos_gravadas_pelo_upload_atual_nao_sao_reprocessadas(): void
    {
        $processador = new ProcessadorDeFotoDePerfil;
        $jpeg = $processador->armazenar(UploadedFile::fake()->createWithContent('celular.jpg', $this->jpegComExifEGps(2000, 1000, 6)));
        $webp = $processador->armazenar(UploadedFile::fake()->createWithContent('foto.webp', $this->capturar(fn () => imagewebp($this->imagemDuasCores(1000, 500)))));
        $this->assertNotNull($jpeg);
        $this->assertNotNull($webp);

        $bytesJpeg = $this->bytesDoDisco($jpeg);
        $bytesWebp = $this->bytesDoDisco($webp);
        $usuarioJpeg = $this->usuario($jpeg);
        $usuarioWebp = $this->usuario($webp);

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('já em ordem: 2')
            ->expectsOutputToContain('reprocessadas: 0')
            ->assertExitCode(0);

        $this->assertSame($jpeg, $this->fotoDoBanco($usuarioJpeg));
        $this->assertSame($webp, $this->fotoDoBanco($usuarioWebp));
        $this->assertSame($bytesJpeg, $this->bytesDoDisco($jpeg));
        $this->assertSame($bytesWebp, $this->bytesDoDisco($webp));
    }

    #[Test]
    public function webp_com_chunk_exif_ou_xmp_e_reprocessado(): void
    {
        Storage::disk('public')->put('avatars/exif.webp', $this->webpComChunkExtra('EXIF', 'MARCA-EXIF-WEBP'));
        Storage::disk('public')->put('avatars/xmp.webp', $this->webpComChunkExtra('XMP ', 'MARCA-XMP-WEBP!'));
        $exif = $this->usuario('avatars/exif.webp');
        $xmp = $this->usuario('avatars/xmp.webp');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('reprocessadas: 2')
            ->assertExitCode(0);

        foreach ([$exif, $xmp] as $usuario) {
            $gravada = $this->bytesDoDisco($this->fotoDoBanco($usuario));
            $this->assertStringNotContainsString('EXIF', $gravada);
            $this->assertStringNotContainsString('XMP ', $gravada);
            $this->assertStringNotContainsString('MARCA-', $gravada);
        }
    }

    #[Test]
    public function arquivo_ausente_e_contado_e_a_referencia_e_mantida(): void
    {
        $usuario = $this->usuario('avatars/sumiu.jpg');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('ausentes no disco: 1')
            ->expectsOutputToContain('reprocessadas: 0')
            ->assertExitCode(0);

        $this->assertSame('avatars/sumiu.jpg', $this->fotoDoBanco($usuario));
    }

    #[Test]
    public function arquivo_ilegivel_ou_nao_imagem_e_contado_e_a_referencia_e_mantida(): void
    {
        $ihdr = pack('NN', 40, 40)."\x08\x06\x00\x00\x00";
        $pngSemImagem = "\x89PNG\r\n\x1a\n"
            .$this->chunkPng('IHDR', $ihdr)
            .$this->chunkPng('tEXt', "Comment\0".self::MARCA_TEXTO)
            .$this->chunkPng('IDAT', str_repeat("\x00", 16))
            .$this->chunkPng('IEND', '');
        Storage::disk('public')->put('avatars/quebrada.png', $pngSemImagem);
        Storage::disk('public')->put('avatars/texto.jpg', 'conteudo-qualquer');
        $quebrada = $this->usuario('avatars/quebrada.png');
        $texto = $this->usuario('avatars/texto.jpg');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('ilegíveis ou não processáveis: 2')
            ->expectsOutputToContain('reprocessadas: 0')
            ->assertExitCode(0);

        $this->assertSame('avatars/quebrada.png', $this->fotoDoBanco($quebrada));
        $this->assertSame('avatars/texto.jpg', $this->fotoDoBanco($texto));
        $this->assertSame($pngSemImagem, $this->bytesDoDisco('avatars/quebrada.png'));
        $this->assertSame(['avatars/quebrada.png', 'avatars/texto.jpg'], $this->arquivosNoDisco());
    }

    #[Test]
    public function caminho_fora_de_avatars_e_contado_e_intocado(): void
    {
        Storage::disk('public')->put('outra-pasta/foto.jpg', $this->jpegComExifEGps(600, 300));
        $fora = $this->usuario('outra-pasta/foto.jpg');
        $travessia = $this->usuario('avatars/../segredo.jpg');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('fora do padrão: 2')
            ->expectsOutputToContain('reprocessadas: 0')
            ->assertExitCode(0);

        $this->assertSame('outra-pasta/foto.jpg', $this->fotoDoBanco($fora));
        $this->assertSame('avatars/../segredo.jpg', $this->fotoDoBanco($travessia));
        $this->assertSame(['outra-pasta/foto.jpg'], $this->arquivosNoDisco());
    }

    #[Test]
    public function usuario_sem_foto_e_ignorado(): void
    {
        $this->usuario('');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('total com foto: 0')
            ->assertExitCode(0);
    }

    #[Test]
    public function fotos_orfas_sao_contadas_e_nao_apagadas(): void
    {
        Storage::disk('public')->put('avatars/orfa.jpg', $this->jpegComExifEGps(600, 300));
        Storage::disk('public')->put('avatars/usada.jpg', $this->jpegSemMetadados(300, 200));
        $this->usuario('avatars/usada.jpg');

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('órfãs (sem usuário): 1')
            ->assertExitCode(0);

        Storage::disk('public')->assertExists('avatars/orfa.jpg');
        Storage::disk('public')->assertExists('avatars/usada.jpg');
    }

    #[Test]
    public function falha_ao_gravar_no_banco_mantem_a_foto_antiga_e_remove_a_copia_nova(): void
    {
        Storage::disk('public')->put('avatars/antiga.jpg', $this->jpegComExifEGps(600, 300));
        $usuario = $this->usuario('avatars/antiga.jpg');
        $arquivosAntes = $this->arquivosNoDisco();

        $this->app->instance(FotoPerfilRepositoryInterface::class, new class extends FotoPerfilRepositoryEloquent
        {
            public function trocarFoto(int $id, string $caminhoAtual, string $novoCaminho): bool
            {
                throw new RuntimeException('falha simulada');
            }
        });

        $this->artisan('fotos:reprocessar')->assertExitCode(1);

        $this->assertSame('avatars/antiga.jpg', $this->fotoDoBanco($usuario));
        $this->assertSame($arquivosAntes, $this->arquivosNoDisco());
    }

    #[Test]
    public function foto_trocada_pelo_usuario_durante_a_execucao_nao_e_sobrescrita(): void
    {
        Storage::disk('public')->put('avatars/antiga.jpg', $this->jpegComExifEGps(600, 300));
        $usuario = $this->usuario('avatars/antiga.jpg');

        $this->app->instance(FotoPerfilRepositoryInterface::class, new class extends FotoPerfilRepositoryEloquent
        {
            public function trocarFoto(int $id, string $caminhoAtual, string $novoCaminho): bool
            {
                DB::table('users')->where('id', $id)->update(['profile_pic' => 'avatars/trocada-pelo-usuario.jpg']);

                return parent::trocarFoto($id, $caminhoAtual, $novoCaminho);
            }
        });

        $this->artisan('fotos:reprocessar')
            ->expectsOutputToContain('alteradas em paralelo: 1')
            ->assertExitCode(0);

        $this->assertSame('avatars/trocada-pelo-usuario.jpg', $this->fotoDoBanco($usuario));
        $this->assertSame(['avatars/antiga.jpg'], $this->arquivosNoDisco());
    }

    #[Test]
    public function saida_e_log_nao_expoem_caminho_nem_dados_pessoais(): void
    {
        Log::spy();
        Storage::disk('public')->put('avatars/foto-maria-privada.jpg', $this->jpegComExifEGps(600, 300));
        $this->usuario('avatars/foto-maria-privada.jpg', 'Maria Exemplo Privada', 'maria.privada@exemplo.test');

        Artisan::call('fotos:reprocessar');
        $saida = Artisan::output();

        foreach (['maria', 'Maria', 'exemplo.test', 'foto-maria', 'avatars/', 'Privada'] as $proibido) {
            $this->assertStringNotContainsString($proibido, $saida);
        }

        Log::shouldHaveReceived('info')->once()->with('fotos.reprocessamento_concluido', [
            'total_com_foto' => 1,
            'ja_em_ordem' => 0,
            'reprocessadas' => 1,
            'ausentes' => 0,
            'ilegiveis' => 0,
            'alteradas_em_paralelo' => 0,
            'fora_do_padrao' => 0,
            'orfas' => 0,
            'simulacao' => false,
        ]);
        Log::shouldNotHaveReceived('error');
    }

    #[Test]
    public function falha_geral_retorna_failure_e_loga_somente_a_classe_da_excecao(): void
    {
        Log::spy();

        $this->mock(FotoPerfilRepositoryInterface::class, function (MockInterface $mock): void {
            $mock->shouldReceive('percorrerFotosDeUsuarios')->andThrow(new RuntimeException('avatars/segredo-maria.jpg'));
        });

        $this->assertSame(1, Artisan::call('fotos:reprocessar'));
        $this->assertStringNotContainsString('segredo', Artisan::output());
        Log::shouldHaveReceived('error')->with('fotos.reprocessamento_falhou', ['excecao' => RuntimeException::class]);
    }
}
