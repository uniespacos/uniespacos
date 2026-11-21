<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Andar;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Reserva;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CongelaRelogio;
use Tests\TestCase;

final class AvaliarReservaPrivacidadeTest extends TestCase
{
    use CongelaRelogio;

    private const SEMANA = '2026-06-01';

    /**
     * @return array{gestor: User, reserva: Reserva, solicitante: User}
     */
    private function criarCenarioDeAvaliacao(): array
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $gestor = User::factory()->create(['setor_id' => $setor->id, 'email_verified_at' => now()]);
        $gestor->assignRole('gestor');

        $solicitante = User::factory()->create([
            'setor_id' => $setor->id,
            'name' => 'Solicitante Teste',
            'email' => 'solicitante-avaliar@exemplo-teste.local',
            'telefone' => '71-5555-0000',
            'two_factor_secret' => 'secret-solicitante-avaliar',
            'two_factor_recovery_codes' => json_encode(['recovery-avaliar']),
            'profile_pic' => 'solicitante-avaliar.jpg',
        ]);

        $modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);
        $andar = Andar::factory()->create(['modulo_id' => $modulo->id]);
        $espaco = Espaco::factory()->create(['andar_id' => $andar->id]);

        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'situacao' => 'em_analise',
            'data_inicial' => self::SEMANA,
            'data_final' => self::SEMANA,
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => self::SEMANA,
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return ['gestor' => $gestor, 'reserva' => $reserva, 'solicitante' => $solicitante];
    }

    #[Test]
    public function avaliacao_expoe_apenas_nome_email_telefone_e_id_do_solicitante(): void
    {
        $cenario = $this->criarCenarioDeAvaliacao();

        $this->actingAs($cenario['gestor'])
            ->get(route('gestor.reservas.show', $cenario['reserva']))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Reservas/Gestor/AvaliarReservaPage')
                ->has('reserva.user', 4)
                ->where('reserva.user.id', $cenario['solicitante']->id)
                ->where('reserva.user.name', 'Solicitante Teste')
                ->where('reserva.user.email', 'solicitante-avaliar@exemplo-teste.local')
                ->where('reserva.user.telefone', '71-5555-0000')
                ->missing('reserva.user.two_factor_secret')
                ->missing('reserva.user.two_factor_recovery_codes')
                ->missing('reserva.user.password')
                ->missing('reserva.user.remember_token')
                ->missing('reserva.user.setor_id')
                ->missing('reserva.user.setor')
                ->missing('reserva.user.profile_pic')
                ->missing('reserva.user.email_verified_at')
            );
    }
}
