<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\ProcessarCriacaoReserva;
use App\Jobs\UpdateReservaJob;
use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ReservaConcorrenciaTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        Bus::fake();
        Notification::fake();
    }

    /**
     * @param  array<int, array<string, mixed>>  $slots
     * @return array<string, mixed>
     */
    private function dados(array $slots, string $titulo = 'Reserva de teste', ?string $data = null): array
    {
        $data ??= now()->addDays(1)->toDateString();

        return [
            'titulo' => $titulo,
            'descricao' => 'Descricao de teste',
            'data_inicial' => $data,
            'data_final' => $data,
            'recorrencia' => 'unica',
            'horarios_solicitados' => $slots,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function slot(int $agendaId, string $data, string $inicio = '10:00:00', string $fim = '11:00:00'): array
    {
        return [
            'data' => $data,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'agenda_id' => $agendaId,
        ];
    }

    /**
     * @param  array<string, mixed>  $dados
     */
    private function executar(array $dados, User $solicitante): ?Reserva
    {
        $job = new ProcessarCriacaoReserva($dados, $solicitante);
        app()->call([$job, 'handle']);

        return Reserva::where('titulo', $dados['titulo'])->first();
    }

    public function test_revalidacao_sob_lock_previne_double_booking(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        // Agenda cujo dono é user1 — seus horários nascem `deferida` automaticamente
        $agenda = Agenda::factory()->create(['user_id' => $user1->id]);

        $this->assertCount(0, Horario::where('agenda_id', $agenda->id)->get());

        // Simular: duas requisições validadas quase simultaneamente
        // (ambas veem o banco vazio, ambas passam pela validação síncrona)

        $data = now()->addDays(1)->toDateString();

        // Payload 1: user1 solicitando horário na agenda que ele administra
        $payload1 = $this->dados([
            $this->slot($agenda->id, $data, '10:00:00', '11:00:00'),
        ], 'Reserva User1', $data);

        // Payload 2: user2 solicitando o MESMO horário exato
        $payload2 = $this->dados([
            $this->slot($agenda->id, $data, '10:00:00', '11:00:00'),
        ], 'Reserva User2', $data);

        // Job 1: executa sem conflito, insere horário com `situacao = deferida`
        // (porque user1 é dono da agenda)
        $reserva1 = $this->executar($payload1, $user1);
        $this->assertNotNull($reserva1);
        $this->assertCount(1, $reserva1->horarios);
        $this->assertEquals('deferida', $reserva1->horarios->first()->situacao);

        // Job 2: revalidação sob lock detecta conflito com o horário deferida de user1
        // A transação sofre rollback, Reserva::create de user2 é desfeita
        $reserva2 = $this->executar($payload2, $user2);

        // Validações finais
        $this->assertCount(1, Horario::where('agenda_id', $agenda->id)->get(), 'Apenas 1 horário deve existir no banco');

        // Reserva de user2 não foi persistida (rollback automático da transação)
        $this->assertNull($reserva2, 'Reserva de user2 não deve ter sido criada');
        $this->assertFalse(Reserva::where('titulo', 'Reserva User2')->exists());
    }

    public function test_ausencia_de_conflito_permite_insercao_dupla_nao_sobreposta(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $agenda = Agenda::factory()->create(['user_id' => $user1->id]);

        $data = now()->addDays(1)->toDateString();

        // Slot 1: 10:00-11:00
        $payload1 = $this->dados([
            $this->slot($agenda->id, $data, '10:00:00', '11:00:00'),
        ], 'Reserva Slot 1', $data);

        // Slot 2: 11:00-12:00 (adjacente, sem overlap — deve ser permitido)
        $payload2 = $this->dados([
            $this->slot($agenda->id, $data, '11:00:00', '12:00:00'),
        ], 'Reserva Slot 2', $data);

        $reserva1 = $this->executar($payload1, $user1);
        $this->assertNotNull($reserva1);
        $this->assertCount(1, $reserva1->horarios);

        // Sem revalidação, este segundo insert falharia também
        // Com a lógica correta (`<` e `>`), adjacência é permitida
        $reserva2 = $this->executar($payload2, $user2);
        $this->assertNotNull($reserva2);
        $this->assertCount(1, $reserva2->horarios);

        // Ambos os horários devem estar no banco
        $this->assertCount(2, Horario::where('agenda_id', $agenda->id)->get());

        // Horário 1: deferida (user1 é dono)
        $horario1 = $reserva1->horarios->first();
        $this->assertEquals('10:00:00', $horario1->horario_inicio);
        $this->assertEquals('deferida', $horario1->situacao);

        // Horário 2: em_analise (user2 não é dono)
        $horario2 = $reserva2->horarios->first();
        $this->assertEquals('11:00:00', $horario2->horario_inicio);
        $this->assertEquals('em_analise', $horario2->situacao);
    }

    /**
     * Teste de revalidação de conflito em UpdateReservaJob escopo 'recurring':
     * Editar uma reserva recorrente para um horário que colide com outra reserva já aprovada
     * deve falhar (transação sofre rollback).
     */
    public function test_update_reserva_recurring_revalidacao_sob_lock_previne_double_booking(): void
    {
        Notification::fake();

        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $agenda = Agenda::factory()->create(['user_id' => $userA->id]);

        $data = now()->addDays(1)->toDateString();

        // Reserva 1 de UserA: horário 10:00-11:00 em uma agenda (deferida, pois userA é dono)
        $payload1 = $this->dados([
            $this->slot($agenda->id, $data, '10:00:00', '11:00:00'),
        ], 'Reserva UserA', $data);

        $reservaA = $this->executar($payload1, $userA);
        $this->assertNotNull($reservaA);
        $this->assertCount(1, $reservaA->horarios);
        $this->assertEquals('deferida', $reservaA->horarios->first()->situacao);

        // Reserva 2 de UserB: horário 09:00-10:00 (não conflita inicialmente)
        $payload2 = $this->dados([
            $this->slot($agenda->id, $data, '09:00:00', '10:00:00'),
        ], 'Reserva UserB', $data);

        $reservaB = $this->executar($payload2, $userB);
        $this->assertNotNull($reservaB);
        $this->assertCount(1, $reservaB->horarios);
        $horarioBOriginal = $reservaB->horarios->first();
        $this->assertEquals('09:00:00', $horarioBOriginal->horario_inicio);
        $this->assertEquals('em_analise', $horarioBOriginal->situacao);

        // Total de horários: 2
        $this->assertCount(2, Horario::where('agenda_id', $agenda->id)->get());

        // Agora UserB tenta editar sua reserva para o mesmo horário que UserA (10:00-11:00)
        // A revalidação sob lock deve detectar o conflito e causar rollback da transação
        $payloadUpdate = [
            'titulo' => 'Reserva UserB Editada',
            'descricao' => 'Descricao atualizada',
            'data_inicial' => $data,
            'data_final' => $data,
            'recorrencia' => 'unica',
            'edit_scope' => 'recurring',
            'edited_week_date' => $data,
            'horarios_solicitados' => [
                $this->slot($agenda->id, $data, '10:00:00', '11:00:00'),
            ],
        ];

        $job = new UpdateReservaJob($reservaB, $payloadUpdate, $userB);
        app()->call([$job, 'handle']);

        // Validações finais:
        // Horário de UserB NÃO deve ter sido atualizado para 10:00-11:00
        $reservaBFresh = $reservaB->fresh();
        $this->assertCount(1, $reservaBFresh->horarios);
        $horarioBAtual = $reservaBFresh->horarios->first();
        $this->assertEquals('09:00:00', $horarioBAtual->horario_inicio, 'Horário de UserB não deve ter sido alterado');
        $this->assertEquals($horarioBOriginal->id, $horarioBAtual->id, 'Horário de UserB deve manter o mesmo ID');

        // Total de horários no banco deve continuar 2, sem duplicação
        $this->assertCount(2, Horario::where('agenda_id', $agenda->id)->get(), '2 horários devem estar no banco (1 de UserA, 1 de UserB original)');
    }

    /**
     * Teste de revalidação de conflito em UpdateReservaJob escopo 'single':
     * Editar uma ocorrência específica de uma série para um horário que colide com outra reserva
     * deve falhar (transação sofre rollback).
     */
    public function test_update_reserva_single_revalidacao_sob_lock_previne_double_booking(): void
    {
        Notification::fake();

        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $agenda = Agenda::factory()->create(['user_id' => $userA->id]);

        $data1 = now()->addDays(1)->toDateString();
        $data2 = now()->addDays(8)->toDateString();

        // Reserva 1 de UserA: horário 10:00-11:00 (deferida)
        $payload1 = $this->dados([
            $this->slot($agenda->id, $data1, '10:00:00', '11:00:00'),
        ], 'Reserva UserA', $data1);

        $reservaA = $this->executar($payload1, $userA);
        $this->assertNotNull($reservaA);
        $this->assertCount(1, $reservaA->horarios);

        // Reserva 2 de UserB: múltiplos horários em semanas diferentes
        $payload2 = $this->dados([
            $this->slot($agenda->id, $data1, '09:00:00', '10:00:00'),
            $this->slot($agenda->id, $data2, '09:00:00', '10:00:00'),
        ], 'Reserva UserB', $data1);

        $reservaB = $this->executar($payload2, $userB);
        $this->assertNotNull($reservaB);
        $this->assertCount(2, $reservaB->horarios);
        $horarioBSemana1Original = $reservaB->horarios()
            ->whereDate('data', $data1)
            ->first();

        // Total: 3 horários
        $this->assertCount(3, Horario::where('agenda_id', $agenda->id)->get());

        // Agora UserB tenta editar apenas o horário da primeira data para colidir com UserA (10:00-11:00)
        // edit_scope = 'single' indica edição de uma ocorrência específica
        // A revalidação sob lock deve detectar o conflito e causar rollback
        $payloadUpdateSingle = [
            'titulo' => 'Reserva UserB Editada (Single)',
            'descricao' => 'Editado em single',
            'data_inicial' => $data1,
            'data_final' => $data1,
            'recorrencia' => 'unica',
            'edit_scope' => 'single',
            'edited_week_date' => $data1,
            'horarios_solicitados' => [
                // Horário novo que colide com UserA
                [
                    'data' => $data1,
                    'horario_inicio' => '10:00:00',
                    'horario_fim' => '11:00:00',
                    'agenda_id' => $agenda->id,
                ],
            ],
        ];

        $job = new UpdateReservaJob($reservaB, $payloadUpdateSingle, $userB);
        app()->call([$job, 'handle']);

        // Validações finais:
        $reservaBFresh = $reservaB->fresh();

        // Horário de UserB na primeira data NÃO deve ter sido atualizado
        $horariosNaData1 = $reservaBFresh->horarios()
            ->whereDate('data', $data1)
            ->get();
        $this->assertCount(1, $horariosNaData1);
        $horarioBData1Atual = $horariosNaData1->first();
        $this->assertEquals('09:00:00', $horarioBData1Atual->horario_inicio, 'Horário original não deve ter sido alterado');
        $this->assertEquals($horarioBSemana1Original->id, $horarioBData1Atual->id, 'Horário deve manter o mesmo ID');

        // Horário na segunda data deve continuar intacto
        $horariosNaData2 = $reservaBFresh->horarios()
            ->whereDate('data', $data2)
            ->get();
        $this->assertCount(1, $horariosNaData2);
        $this->assertEquals('09:00:00', $horariosNaData2->first()->horario_inicio);

        // Total de horários: 3 (nenhum novo foi inserido, nenhum foi deletado)
        $this->assertCount(3, Horario::where('agenda_id', $agenda->id)->get());
    }

    /**
     * Teste de não-regressão: editar sem conflito continua funcionando normalmente
     * em ambos os escopos (recurring e single).
     */
    public function test_update_reserva_sem_conflito_funciona_normalmente(): void
    {
        Notification::fake();

        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $agenda = Agenda::factory()->create(['user_id' => $userA->id]);

        $data = now()->addDays(1)->toDateString();

        // Reserva 1 de UserA: 10:00-11:00 (deferida)
        $payload1 = $this->dados([
            $this->slot($agenda->id, $data, '10:00:00', '11:00:00'),
        ], 'Reserva UserA', $data);

        $reservaA = $this->executar($payload1, $userA);
        $this->assertNotNull($reservaA);

        // Reserva 2 de UserB: 14:00-15:00 (não conflita)
        $payload2 = $this->dados([
            $this->slot($agenda->id, $data, '14:00:00', '15:00:00'),
        ], 'Reserva UserB', $data);

        $reservaB = $this->executar($payload2, $userB);
        $this->assertNotNull($reservaB);
        $this->assertCount(1, $reservaB->horarios);

        // Editar reserva de UserB para 15:00-16:00 (ainda sem conflito)
        $payloadUpdate = [
            'titulo' => 'Reserva UserB Editada',
            'descricao' => 'Descricao atualizada',
            'data_inicial' => $data,
            'data_final' => $data,
            'recorrencia' => 'unica',
            'edit_scope' => 'recurring',
            'edited_week_date' => $data,
            'horarios_solicitados' => [
                $this->slot($agenda->id, $data, '15:00:00', '16:00:00'),
            ],
        ];

        // Deve funcionar sem exceção
        $job = new UpdateReservaJob($reservaB, $payloadUpdate, $userB);
        app()->call([$job, 'handle']);

        $reservaBFresh = $reservaB->fresh();
        $this->assertEquals('Reserva UserB Editada', $reservaBFresh->titulo);
        $this->assertCount(1, $reservaBFresh->horarios);
        $horario = $reservaBFresh->horarios->first();
        $this->assertEquals('15:00:00', $horario->horario_inicio);
        $this->assertEquals('16:00:00', $horario->horario_fim);

        // Total de horários: 2 (um de cada usuário, sem duplicação)
        $this->assertCount(2, Horario::where('agenda_id', $agenda->id)->get());
    }
}
