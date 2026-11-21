<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\User;
use App\Notifications\UserAssignedAsManagerNotification;
use App\Notifications\UserRemovedAsManagerNotification;
use App\Repositories\EspacoRepositoryInterface;
use App\Repositories\UserRepositoryInterface;
use App\Services\EspacoService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class EspacoServiceAposCommitTest extends TestCase
{
    private const FOTO_ANTIGA = 'espacos_images/antiga.jpg';

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    private function espacoSemGestores(array $atributos = []): Espaco
    {
        $espaco = Espaco::factory()->create($atributos);
        $espaco->agendas()->update(['user_id' => null]);

        return $espaco;
    }

    private function dadosDeEdicao(Espaco $espaco, array $sobrescrever = []): array
    {
        return array_merge([
            'nome' => 'Sala Renomeada',
            'capacidade_pessoas' => 30,
            'descricao' => 'Descrição atualizada',
            'andar_id' => $espaco->andar_id,
        ], $sobrescrever);
    }

    public function test_update_de_nome_e_descricao_nao_notifica_gestores(): void
    {
        $espaco = $this->espacoSemGestores();
        Agenda::where('espaco_id', $espaco->id)->where('turno', 'manha')->update(['user_id' => User::factory()->create()->id]);
        Agenda::where('espaco_id', $espaco->id)->where('turno', 'tarde')->update(['user_id' => User::factory()->create()->id]);

        Notification::fake();

        app(EspacoService::class)->update($espaco, $this->dadosDeEdicao($espaco));

        Notification::assertNothingSent();
    }

    public function test_designar_gestor_que_ja_gerencia_outro_espaco_envia_link_do_espaco_designado(): void
    {
        $gestor = User::factory()->create();

        $outroEspaco = $this->espacoSemGestores();
        Agenda::where('espaco_id', $outroEspaco->id)->where('turno', 'manha')->update(['user_id' => $gestor->id]);

        $espaco = $this->espacoSemGestores();

        Notification::fake();

        app(EspacoService::class)->updateGestores($espaco, ['gestores' => ['tarde' => $gestor->id]]);

        $urlEsperada = str_replace('http://localhost', config('app.url'), route('espacos.show', $espaco->id));

        Notification::assertSentTo(
            $gestor,
            UserAssignedAsManagerNotification::class,
            fn (UserAssignedAsManagerNotification $notificacao) => $notificacao->url === $urlEsperada
                && str_contains($notificacao->descricao, $espaco->nome)
        );
        Notification::assertSentTimes(UserAssignedAsManagerNotification::class, 1);
    }

    public function test_gestor_que_ja_ocupa_o_turno_nao_recebe_de_novo(): void
    {
        $gestor = User::factory()->create();
        $espaco = $this->espacoSemGestores();
        Agenda::where('espaco_id', $espaco->id)->where('turno', 'tarde')->update(['user_id' => $gestor->id]);

        Notification::fake();

        app(EspacoService::class)->updateGestores($espaco, ['gestores' => ['tarde' => $gestor->id]]);

        Notification::assertNothingSent();
    }

    public function test_troca_de_gestor_notifica_o_novo_e_o_antigo_apos_o_commit(): void
    {
        $antigo = User::factory()->create();
        $novo = User::factory()->create();
        $espaco = $this->espacoSemGestores();
        Agenda::where('espaco_id', $espaco->id)->where('turno', 'noite')->update(['user_id' => $antigo->id]);

        Notification::fake();

        app(EspacoService::class)->updateGestores($espaco, ['gestores' => ['noite' => $novo->id]]);

        Notification::assertSentTo($novo, UserAssignedAsManagerNotification::class);
        Notification::assertSentTo($antigo, UserRemovedAsManagerNotification::class);
        $this->assertSame($novo->id, Agenda::where('espaco_id', $espaco->id)->where('turno', 'noite')->value('user_id'));
    }

    public function test_falha_no_update_preserva_foto_antiga_nao_deixa_arquivo_novo_orfao_e_nao_notifica(): void
    {
        Storage::disk('public')->put(self::FOTO_ANTIGA, 'conteudo antigo');
        $espaco = $this->espacoSemGestores(['imagens' => [self::FOTO_ANTIGA], 'main_image_index' => self::FOTO_ANTIGA]);

        $this->mock(EspacoRepositoryInterface::class, function ($mock) {
            $mock->shouldReceive('update')->once()->andThrow(new RuntimeException('falha simulada'));
        });

        Notification::fake();

        try {
            app(EspacoService::class)->update(
                $espaco,
                $this->dadosDeEdicao($espaco),
                [UploadedFile::fake()->create('nova.jpg', 10, 'image/jpeg')],
                [self::FOTO_ANTIGA],
            );
            $this->fail('A falha simulada deveria propagar.');
        } catch (RuntimeException $e) {
            $this->assertSame('falha simulada', $e->getMessage());
        }

        $this->assertSame([self::FOTO_ANTIGA], Storage::disk('public')->allFiles('espacos_images'));
        Notification::assertNothingSent();
    }

    public function test_update_com_sucesso_apaga_foto_removida_so_depois_do_commit(): void
    {
        Storage::disk('public')->put(self::FOTO_ANTIGA, 'conteudo antigo');
        $espaco = $this->espacoSemGestores(['imagens' => [self::FOTO_ANTIGA], 'main_image_index' => self::FOTO_ANTIGA]);

        app(EspacoService::class)->update(
            $espaco,
            $this->dadosDeEdicao($espaco),
            [UploadedFile::fake()->create('nova.jpg', 10, 'image/jpeg')],
            [self::FOTO_ANTIGA],
        );

        $arquivos = Storage::disk('public')->allFiles('espacos_images');
        $this->assertCount(1, $arquivos);
        $this->assertNotSame(self::FOTO_ANTIGA, $arquivos[0]);
        $this->assertSame([$arquivos[0]], $espaco->refresh()->imagens);
    }

    public function test_falha_no_store_nao_deixa_arquivos_orfaos(): void
    {
        $this->mock(EspacoRepositoryInterface::class, function ($mock) {
            $mock->shouldReceive('store')->once()->andThrow(new RuntimeException('falha simulada'));
        });

        $andarId = Espaco::factory()->create()->andar_id;

        try {
            app(EspacoService::class)->store(
                [
                    'nome' => 'Sala Nova',
                    'capacidade_pessoas' => 20,
                    'descricao' => 'Descrição',
                    'andar_id' => $andarId,
                ],
                [UploadedFile::fake()->create('nova.jpg', 10, 'image/jpeg')],
            );
            $this->fail('A falha simulada deveria propagar.');
        } catch (RuntimeException $e) {
            $this->assertSame('falha simulada', $e->getMessage());
        }

        $this->assertSame([], Storage::disk('public')->allFiles('espacos_images'));
    }

    public function test_falha_no_meio_de_update_gestores_nao_notifica_nem_persiste_troca(): void
    {
        $primeiro = User::factory()->create();
        $segundo = User::factory()->create();
        $espaco = $this->espacoSemGestores();

        $this->mock(UserRepositoryInterface::class, function ($mock) use ($primeiro, $segundo) {
            $mock->shouldReceive('get')->with($primeiro->id)->andReturn($primeiro);
            $mock->shouldReceive('get')->with($segundo->id)->andThrow(new RuntimeException('falha simulada'));
        });

        Notification::fake();

        try {
            app(EspacoService::class)->updateGestores($espaco, [
                'gestores' => ['manha' => $primeiro->id, 'tarde' => $segundo->id],
            ]);
            $this->fail('A falha simulada deveria propagar.');
        } catch (RuntimeException $e) {
            $this->assertSame('falha simulada', $e->getMessage());
        }

        Notification::assertNothingSent();
        $this->assertNull(Agenda::where('espaco_id', $espaco->id)->where('turno', 'manha')->value('user_id'));
        $this->assertNull(Agenda::where('espaco_id', $espaco->id)->where('turno', 'tarde')->value('user_id'));
    }
}
