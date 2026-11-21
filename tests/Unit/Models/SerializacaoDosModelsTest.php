<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Models\Andar;
use App\Models\Espaco;
use App\Models\Reserva;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SerializacaoDosModelsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-21 10:00:00', 'UTC'));
        Espaco::forgetFavoritosCache();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        Espaco::forgetFavoritosCache();

        parent::tearDown();
    }

    public function test_reserva_to_array_mantem_chaves_e_formatos(): void
    {
        $user = User::factory()->create();
        $reserva = Reserva::factory()->create([
            'user_id' => $user->id,
            'titulo' => 'Reunião de planejamento',
            'descricao' => 'Descrição da reserva',
            'situacao' => 'em_analise',
            'data_inicial' => '2026-03-02 08:00:00',
            'data_final' => '2026-03-02 10:00:00',
            'recorrencia' => 'unica',
            'observacao' => null,
            'publico_estimado' => 30,
            'conflict_cache' => ['a' => 1],
            'termo_aceito_em' => '2026-03-01 09:00:00',
        ]);

        $serializada = Reserva::query()->findOrFail($reserva->id)->toArray();

        $this->assertSame([
            'id' => $reserva->id,
            'titulo' => 'Reunião de planejamento',
            'descricao' => 'Descrição da reserva',
            'situacao' => 'em_analise',
            'data_inicial' => '2026-03-02 08:00:00',
            'data_final' => '2026-03-02 10:00:00',
            'recorrencia' => 'unica',
            'observacao' => null,
            'user_id' => $user->id,
            'created_at' => '2026-11-21T10:00:00.000000Z',
            'updated_at' => '2026-11-21T10:00:00.000000Z',
            'validation_status' => 'pending',
            'conflict_cache' => ['a' => 1],
            'publico_estimado' => 30,
            'categoria' => null,
        ], $serializada);
    }

    public function test_reserva_to_json_coincide_com_to_array(): void
    {
        $reserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
            'publico_estimado' => 12,
        ]);

        $fresca = Reserva::query()->findOrFail($reserva->id);

        $this->assertSame($fresca->toArray(), json_decode((string) $fresca->toJson(), true));
    }

    public function test_reserva_situacao_formatada_entrega_rotulo(): void
    {
        $reserva = Reserva::factory()->create([
            'user_id' => User::factory()->create()->id,
            'situacao' => 'parcialmente_deferida',
        ]);

        $this->assertSame('Parcialmente Deferida', $reserva->situacao_formatada);
    }

    public function test_andar_serializa_tipo_acesso_como_array(): void
    {
        $andar = Andar::factory()->create(['nome' => 'Térreo', 'tipo_acesso' => ['a']]);

        $serializado = Andar::query()->findOrFail($andar->id)->toArray();

        $this->assertSame(['a'], $serializado['tipo_acesso']);
        $this->assertSame('Térreo', $serializado['nome']);
    }

    public function test_espaco_serializa_imagens_e_favorito_para_visitante(): void
    {
        $espaco = Espaco::factory()->create(['imagens' => ['x.jpg']]);

        $serializado = Espaco::query()->findOrFail($espaco->id)->toArray();

        $this->assertSame(['x.jpg'], $serializado['imagens']);
        $this->assertFalse($serializado['is_favorited_by_user']);
    }

    public function test_espaco_marca_favorito_do_usuario_autenticado(): void
    {
        $user = User::factory()->create();
        $favorito = Espaco::factory()->create();
        $outro = Espaco::factory()->create();
        $user->favoritos()->attach($favorito->id);

        $this->actingAs($user);

        $this->assertTrue(Espaco::query()->findOrFail($favorito->id)->toArray()['is_favorited_by_user']);
        $this->assertFalse(Espaco::query()->findOrFail($outro->id)->toArray()['is_favorited_by_user']);
    }
}
