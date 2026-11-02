<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\Setor;
use App\Models\User;
use App\Notifications\ReservationCanceledNotification;
use App\Services\ExclusaoDeContaService;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExclusaoDeContaI18nTest extends TestCase
{
    private const NOME_ORIGINAL = 'Titular Para Traducao';

    private const MENSAGEM_GESTOR_PT = 'Não é possível excluir esta conta enquanto ela for gestora de agenda. Peça ao institucional para remover a gestão das agendas antes.';

    private const MENSAGEM_GESTOR_EN = 'This account cannot be deleted while it manages a schedule. Ask the institutional team to remove the schedule management first.';

    private const DATA = '2099-06-01';

    private User $titular;

    protected function setUp(): void
    {
        parent::setUp();

        $this->titular = User::factory()->create([
            'name' => self::NOME_ORIGINAL,
            'email' => 'titular.'.Str::lower(Str::random(8)).'@test.local',
        ]);
        $this->titular->assignRole('comum');
    }

    public function test_nome_de_conta_anonimizada_e_traduzido_na_leitura_em_cada_idioma(): void
    {
        app(ExclusaoDeContaService::class)->anonimizar($this->titular);
        $anonimizado = $this->titular->fresh();
        $this->assertNotNull($anonimizado);

        app()->setLocale('pt_BR');
        $this->assertSame('Usuário anonimizado', $anonimizado->name);

        app()->setLocale('en');
        $this->assertSame('Anonymized user', $anonimizado->name);

        app()->setLocale('es');
        $this->assertSame('Usuario anonimizado', $anonimizado->name);
    }

    public function test_nome_gravado_da_conta_anonimizada_continua_sendo_o_marcador(): void
    {
        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        app()->setLocale('en');
        $this->assertSame(ExclusaoDeContaService::NOME_ANONIMIZADO, $this->titular->fresh()->getRawOriginal('name'));
    }

    public function test_nome_de_conta_nao_anonimizada_nao_e_traduzido(): void
    {
        app()->setLocale('en');

        $this->assertSame(self::NOME_ORIGINAL, $this->titular->fresh()->name);
    }

    public function test_nome_traduzido_chega_na_serializacao_com_o_locale_de_quem_le(): void
    {
        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        app()->setLocale('en');
        $this->assertSame('Anonymized user', $this->titular->fresh()->toArray()['name']);
    }

    public function test_flash_de_sucesso_da_anonimizacao_segue_o_locale_da_sessao_pt_br(): void
    {
        $this->actingAs($this->criarInstitucional())
            ->withSession(['locale' => 'pt-BR'])
            ->delete(route('institucional.usuarios.destroy', $this->titular), ['password' => 'password'])
            ->assertSessionHas('success', 'Conta do usuário anonimizada com sucesso.');
    }

    public function test_flash_de_sucesso_da_anonimizacao_segue_o_locale_da_sessao_en(): void
    {
        $this->actingAs($this->criarInstitucional())
            ->withSession(['locale' => 'en'])
            ->delete(route('institucional.usuarios.destroy', $this->titular), ['password' => 'password'])
            ->assertSessionHas('success', 'User account anonymized successfully.');
    }

    public function test_flash_de_erro_do_gestor_no_institucional_segue_o_locale_da_sessao_pt_br(): void
    {
        $this->criarAgendaGerida();

        $this->actingAs($this->criarInstitucional())
            ->withSession(['locale' => 'pt-BR'])
            ->delete(route('institucional.usuarios.destroy', $this->titular), ['password' => 'password'])
            ->assertSessionHas('error', self::MENSAGEM_GESTOR_PT);
    }

    public function test_flash_de_erro_do_gestor_no_institucional_segue_o_locale_da_sessao_en(): void
    {
        $this->criarAgendaGerida();

        $this->actingAs($this->criarInstitucional())
            ->withSession(['locale' => 'en'])
            ->delete(route('institucional.usuarios.destroy', $this->titular), ['password' => 'password'])
            ->assertSessionHas('error', self::MENSAGEM_GESTOR_EN);
    }

    public function test_erro_do_gestor_na_autoexclusao_segue_o_locale_da_sessao_en(): void
    {
        $this->criarAgendaGerida();

        $this->actingAs($this->titular)
            ->withSession(['locale' => 'en'])
            ->from('/settings/profile')
            ->delete('/settings/profile', ['password' => 'password'])
            ->assertRedirect('/settings/profile')
            ->assertSessionHasErrors(['password' => self::MENSAGEM_GESTOR_EN]);
    }

    public function test_email_de_reserva_sem_titular_mostra_solicitante_nao_identificado_em_ingles(): void
    {
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $reserva = $this->criarReservaSemTitular();

        app()->setLocale('en');
        $html = (new ReservationCanceledNotification($reserva->fresh(), $gestor))->toMail($gestor)->render();

        $this->assertStringContainsString('Unidentified requester', (string) $html);
        $this->assertStringNotContainsString('Solicitante não identificado', (string) $html);
    }

    private function criarAgendaGerida(): void
    {
        Agenda::factory()->for($this->espacoSemGestores())->create(['user_id' => $this->titular->id]);
    }

    private function criarReservaSemTitular(): Reserva
    {
        $agenda = Agenda::factory()->for($this->espacoSemGestores())->create(['user_id' => null]);
        $reserva = Reserva::factory()->create([
            'user_id' => null,
            'titulo' => 'Reunião '.Str::random(5),
            'situacao' => 'em_analise',
            'data_inicial' => self::DATA,
            'data_final' => self::DATA,
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => self::DATA,
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return $reserva;
    }

    private function espacoSemGestores(): Espaco
    {
        $espaco = Espaco::factory()->create();
        $espaco->agendas()->update(['user_id' => null]);

        return $espaco;
    }

    private function criarInstitucional(): User
    {
        $admin = User::factory()->create(['setor_id' => Setor::factory()->create()->id]);
        $admin->assignRole('institucional');

        return $admin;
    }
}
