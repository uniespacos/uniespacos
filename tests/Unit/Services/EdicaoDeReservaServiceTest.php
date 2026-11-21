<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Exceptions\ConflitoDeHorarioException;
use App\Exceptions\EscopoInvalidoException;
use App\Models\Agenda;
use App\Models\Reserva;
use App\Models\User;
use App\Repositories\HorarioRepositoryInterface;
use App\Services\EdicaoDeReservaService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\Concerns\CongelaRelogio;
use Tests\TestCase;

/**
 * @phpstan-import-type DadosEdicao from EdicaoDeReservaService
 */
class EdicaoDeReservaServiceTest extends TestCase
{
    use CongelaRelogio;
    use DatabaseTransactions;

    private const DATA = '2026-11-23';

    public function test_conflito_com_horario_deferido_de_outra_reserva_lanca_excecao_de_dominio(): void
    {
        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);
        $this->horarioDeferido($agenda, $gestor, '10:00:00', '11:00:00', $this->reservaDe(User::factory()->create()));

        $reserva = $this->reservaDe(User::factory()->create());

        $this->expectException(ConflitoDeHorarioException::class);
        $this->expectExceptionMessage(
            'Conflito detectado sob lock para agenda '.$agenda->id.' em '.self::DATA.'. Outra reserva pode ter sido editada simultaneamente.',
        );

        app(EdicaoDeReservaService::class)->executar($reserva, $this->dados([
            $this->slot($agenda->id, '10:00:00', '11:00:00'),
        ]));
    }

    public function test_recurring_consulta_conflitos_ignorando_a_propria_reserva(): void
    {
        $gestor = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $gestor->id]);
        $reserva = $this->reservaDe($gestor);
        $this->horarioDeferido($agenda, $gestor, '10:00:00', '11:00:00', $reserva);

        $real = app(HorarioRepositoryInterface::class);
        $espiao = Mockery::mock($real)->makePartial();
        $espiao->shouldReceive('conflitosDeferidos')
            ->once()
            ->with(Mockery::type('array'), $reserva->id)
            ->andReturnUsing(fn (array $linhas, ?int $ignorar) => $real->conflitosDeferidos($linhas, $ignorar));
        app()->instance(HorarioRepositoryInterface::class, $espiao);

        app(EdicaoDeReservaService::class)->executar($reserva, $this->dados([
            $this->slot($agenda->id, '10:00:00', '11:00:00'),
        ]));

        $this->assertCount(1, $reserva->refresh()->horarios);
    }

    public function test_numero_de_consultas_de_conflito_nao_cresce_com_a_quantidade_de_horarios(): void
    {
        DB::enableQueryLog();

        $this->editarComHorarios(2);
        $consultasComPoucos = $this->contarConsultasDeConflito();

        DB::flushQueryLog();
        $this->editarComHorarios(12);
        $consultasComMuitos = $this->contarConsultasDeConflito();

        DB::disableQueryLog();

        $this->assertSame(1, $consultasComPoucos);
        $this->assertSame(1, $consultasComMuitos);
    }

    public function test_escopo_desconhecido_lanca_escopo_invalido(): void
    {
        $reserva = $this->reservaDe(User::factory()->create());

        $this->expectException(EscopoInvalidoException::class);

        app(EdicaoDeReservaService::class)->executar($reserva, $this->dados([], escopo: 'todas'));
    }

    public function test_escopo_single_sem_semana_valida_lanca_escopo_invalido(): void
    {
        $reserva = $this->reservaDe(User::factory()->create());

        $this->expectException(EscopoInvalidoException::class);

        app(EdicaoDeReservaService::class)->executar($reserva, $this->dados([], escopo: 'single', semana: null));
    }

    /**
     * @return array<string, mixed>
     */
    private function slot(int $agendaId, string $inicio, string $fim): array
    {
        return [
            'agenda_id' => $agendaId,
            'data' => self::DATA,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $slots
     * @return DadosEdicao
     */
    private function dados(array $slots, string $escopo = 'recurring', ?string $semana = self::DATA): array
    {
        $dados = [
            'titulo' => 'Editada',
            'descricao' => 'Descricao',
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
            'recorrencia' => 'unica',
            'edit_scope' => $escopo,
            'horarios_solicitados' => $slots,
        ];

        if ($semana !== null) {
            $dados['edited_week_date'] = $semana;
        }

        return $dados;
    }

    private function reservaDe(User $solicitante): Reserva
    {
        return Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'titulo' => 'Original',
            'recorrencia' => 'unica',
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
        ]);
    }

    private function horarioDeferido(Agenda $agenda, User $gestor, string $inicio, string $fim, Reserva $reserva): void
    {
        $reserva->horarios()->create([
            'agenda_id' => $agenda->id,
            'data' => self::DATA,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'situacao' => SituacaoReservaEnum::DEFERIDA->value,
            'user_id' => $gestor->id,
        ]);
    }

    private function editarComHorarios(int $quantidade): void
    {
        $dono = User::factory()->create();
        $agenda = Agenda::factory()->create(['user_id' => $dono->id]);
        $reserva = $this->reservaDe($dono);

        $slots = [];
        for ($i = 0; $i < $quantidade; $i++) {
            $slots[] = $this->slot(
                $agenda->id,
                sprintf('%02d:00:00', 8 + $i),
                sprintf('%02d:00:00', 9 + $i),
            );
        }

        app(EdicaoDeReservaService::class)->executar($reserva, $this->dados($slots));

        $this->assertCount($quantidade, $reserva->refresh()->horarios);
    }

    private function contarConsultasDeConflito(): int
    {
        return collect(DB::getQueryLog())
            ->filter(fn (array $consulta): bool => str_contains((string) $consulta['query'], 'inner join "reservas"'))
            ->count();
    }
}
