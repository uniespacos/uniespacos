<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * B4: Horario::avaliador() inferia a FK `avaliador_id` (inexistente); a coluna real é `user_id`.
 */
class HorarioAvaliadorTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-06-15 12:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function criarHorario(string $situacao, ?int $avaliadorId): Horario
    {
        $dono = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $dono->id]);
        $reserva = Reserva::factory()->create(['situacao' => $situacao, 'user_id' => $dono->id]);

        return Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => $situacao,
            'data' => '2026-06-16',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
            'user_id' => $avaliadorId,
        ]);
    }

    #[Test]
    public function relacao_avaliador_usa_a_fk_user_id(): void
    {
        $relacao = (new Horario)->avaliador();

        $this->assertInstanceOf(BelongsTo::class, $relacao);
        $this->assertSame('user_id', $relacao->getForeignKeyName());
        $this->assertSame('horarios.user_id', $relacao->getQualifiedForeignKeyName());
    }

    #[Test]
    public function avaliador_resolve_o_usuario_de_user_id(): void
    {
        $gestor = User::factory()->create();
        $horario = $this->criarHorario('deferida', $gestor->id);

        $avaliador = Horario::findOrFail($horario->id)->avaliador;

        $this->assertNotNull($avaliador);
        $this->assertTrue($avaliador->is($gestor));
    }

    #[Test]
    public function eager_load_traz_avaliador_em_reserva_avaliada(): void
    {
        $gestor = User::factory()->create();
        $horario = $this->criarHorario('deferida', $gestor->id);

        $carregado = Horario::with('avaliador')->findOrFail($horario->id);

        $this->assertTrue($carregado->relationLoaded('avaliador'));
        $this->assertNotNull($carregado->avaliador);
        $this->assertSame($gestor->id, $carregado->avaliador->id);
    }

    #[Test]
    public function avaliador_e_null_enquanto_em_analise(): void
    {
        $horario = $this->criarHorario('em_analise', null);

        $carregado = Horario::with('avaliador')->findOrFail($horario->id);

        $this->assertTrue($carregado->relationLoaded('avaliador'));
        $this->assertNull($carregado->avaliador);
    }
}
