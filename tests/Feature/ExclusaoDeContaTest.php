<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Exceptions\ContaNaoPodeSerAnonimizadaException;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\Setor;
use App\Models\User;
use App\Repositories\UserRepositoryEloquent;
use App\Repositories\UserRepositoryInterface;
use App\Services\ExclusaoDeContaService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class ExclusaoDeContaTest extends TestCase
{
    private const NOME_ORIGINAL = 'Maria Titular Exclusiva';

    private const TELEFONE_ORIGINAL = '77999990000';

    private const FOTO = 'avatars/foto-titular-exclusiva.jpg';

    private string $emailOriginal;

    private User $titular;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->emailOriginal = 'maria.'.Str::lower(Str::random(8)).'@test.local';
        $this->titular = User::factory()->create([
            'name' => self::NOME_ORIGINAL,
            'email' => $this->emailOriginal,
            'telefone' => self::TELEFONE_ORIGINAL,
            'profile_pic' => self::FOTO,
            'two_factor_secret' => 'segredo-2fa',
            'two_factor_recovery_codes' => 'codigos-2fa',
            'remember_token' => 'token-lembrar',
        ]);
        $this->titular->assignRole('comum');
        $this->titular->favoritos()->attach($this->espacoSemGestores());

        Storage::disk('public')->put(self::FOTO, 'bytes-da-foto');

        $this->inserirNotificacao($this->titular->id);
        $this->inserirSessao('sessao-do-titular', $this->titular->id);
        $this->inserirTokenDeReset($this->emailOriginal);
    }

    public function test_exclusao_de_conta_remove_notificacoes_sessoes_tokens_foto_favoritos_e_papeis(): void
    {
        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $this->assertSame(0, DB::table('notifications')->where('notifiable_id', $this->titular->id)->where('notifiable_type', User::class)->count());
        $this->assertSame(0, DB::table('sessions')->where('user_id', $this->titular->id)->count());
        $this->assertSame(0, DB::table('password_reset_tokens')->where('email', $this->emailOriginal)->count());
        Storage::disk('public')->assertMissing(self::FOTO);
        $this->assertSame(0, DB::table('espaco_user')->where('user_id', $this->titular->id)->count());
        $this->assertSame([], $this->titular->fresh()->getRoleNames()->all());
    }

    public function test_exclusao_de_conta_mantem_a_linha_do_usuario_sem_dados_pessoais(): void
    {
        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $anonimizado = $this->titular->fresh();
        $this->assertNotNull($anonimizado);
        $this->assertTrue($anonimizado->estaAnonimizado());
        $this->assertSame('Usuário anonimizado', $anonimizado->name);
        $this->assertSame('anonimizado-'.$this->titular->id.'@invalid', $anonimizado->email);
        $this->assertSame('', $anonimizado->getRawOriginal('telefone'));
        $this->assertSame('', $anonimizado->getRawOriginal('profile_pic'));
        $this->assertNull($anonimizado->remember_token);
        $this->assertNull($anonimizado->email_verified_at);
        $this->assertNull($anonimizado->two_factor_secret);
        $this->assertNull($anonimizado->two_factor_recovery_codes);

        $this->assertDatabaseMissing('users', ['id' => $this->titular->id, 'name' => self::NOME_ORIGINAL]);
        $this->assertDatabaseMissing('users', ['id' => $this->titular->id, 'email' => $this->emailOriginal]);
        $this->assertDatabaseMissing('users', ['id' => $this->titular->id, 'telefone' => self::TELEFONE_ORIGINAL]);
    }

    public function test_titular_anonimizado_nao_consegue_mais_entrar(): void
    {
        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $this->assertFalse(Hash::check('password', $this->titular->fresh()->password));
        $this->assertFalse(Auth::attempt(['email' => $this->emailOriginal, 'password' => 'password']));
        $this->assertFalse(Auth::attempt(['email' => 'anonimizado-'.$this->titular->id.'@invalid', 'password' => 'password']));
    }

    public function test_autoexclusao_pelo_perfil_passa_pelo_servico_de_anonimizacao(): void
    {
        $spy = Mockery::spy(ExclusaoDeContaService::class);
        $this->app->instance(ExclusaoDeContaService::class, $spy);

        $this->actingAs($this->titular)
            ->delete('/settings/profile', ['password' => 'password'])
            ->assertRedirect('/')
            ->assertSessionHasNoErrors();

        $spy->shouldHaveReceived('anonimizar')->once();
        $this->assertGuest();
    }

    public function test_autoexclusao_pelo_perfil_anonimiza_a_conta_e_desloga(): void
    {
        $this->actingAs($this->titular)
            ->delete('/settings/profile', ['password' => 'password'])
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertTrue($this->titular->fresh()->estaAnonimizado());
        Storage::disk('public')->assertMissing(self::FOTO);
    }

    public function test_exclusao_pelo_institucional_passa_pelo_mesmo_servico(): void
    {
        $spy = Mockery::spy(ExclusaoDeContaService::class);
        $this->app->instance(ExclusaoDeContaService::class, $spy);

        $this->actingAs($this->criarInstitucional())
            ->delete(route('institucional.usuarios.destroy', $this->titular), ['password' => 'password'])
            ->assertRedirect();

        $spy->shouldHaveReceived('anonimizar')->once();
    }

    public function test_exclusao_pelo_institucional_anonimiza_a_conta(): void
    {
        $this->actingAs($this->criarInstitucional())
            ->delete(route('institucional.usuarios.destroy', $this->titular), ['password' => 'password'])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertTrue($this->titular->fresh()->estaAnonimizado());
        $this->assertSame(0, DB::table('sessions')->where('user_id', $this->titular->id)->count());
        Storage::disk('public')->assertMissing(self::FOTO);
    }

    public function test_anonimizacao_e_atomica_e_desfaz_todas_as_etapas_quando_uma_falha(): void
    {
        $repo = Mockery::mock(UserRepositoryEloquent::class)->makePartial();
        $repo->shouldReceive('removerSessoes')->andThrow(new \RuntimeException('falha simulada'));
        $this->app->instance(UserRepositoryInterface::class, $repo);

        try {
            app(ExclusaoDeContaService::class)->anonimizar($this->titular);
            $this->fail('A falha simulada deveria ter sido propagada.');
        } catch (\RuntimeException $e) {
            $this->assertSame('falha simulada', $e->getMessage());
        }

        $this->assertDatabaseHas('users', ['id' => $this->titular->id, 'name' => self::NOME_ORIGINAL, 'email' => $this->emailOriginal]);
        $this->assertDatabaseHas('users', ['id' => $this->titular->id, 'telefone' => self::TELEFONE_ORIGINAL]);
        $this->assertSame(1, DB::table('notifications')->where('notifiable_id', $this->titular->id)->count());
        $this->assertSame(1, DB::table('sessions')->where('user_id', $this->titular->id)->count());
        $this->assertSame(1, DB::table('password_reset_tokens')->where('email', $this->emailOriginal)->count());
        $this->assertSame(1, DB::table('espaco_user')->where('user_id', $this->titular->id)->count());
        $this->assertTrue($this->titular->fresh()->hasRole('comum'));
        Storage::disk('public')->assertExists(self::FOTO);
    }

    public function test_gestor_de_agenda_nao_pode_ser_anonimizado_enquanto_for_gestor(): void
    {
        $agenda = Agenda::factory()->for($this->espacoSemGestores())->create(['user_id' => $this->titular->id]);

        try {
            app(ExclusaoDeContaService::class)->anonimizar($this->titular);
            $this->fail('Gestor de agenda não deveria ser anonimizado.');
        } catch (ContaNaoPodeSerAnonimizadaException $e) {
            $this->assertStringContainsString('gestora de agenda', $e->getMessage());
        }

        $this->assertDatabaseHas('users', ['id' => $this->titular->id, 'name' => self::NOME_ORIGINAL]);
        $this->assertDatabaseHas('agendas', ['id' => $agenda->id, 'user_id' => $this->titular->id]);
        Storage::disk('public')->assertExists(self::FOTO);
    }

    public function test_autoexclusao_de_gestor_volta_ao_perfil_com_erro_e_mantem_a_sessao(): void
    {
        Agenda::factory()->for($this->espacoSemGestores())->create(['user_id' => $this->titular->id]);

        $this->actingAs($this->titular)
            ->from('/settings/profile')
            ->delete('/settings/profile', ['password' => 'password'])
            ->assertRedirect('/settings/profile')
            ->assertSessionHasErrors('password');

        $this->assertAuthenticatedAs($this->titular);
        $this->assertFalse($this->titular->fresh()->estaAnonimizado());
    }

    public function test_anonimizar_conta_ja_anonimizada_nao_altera_a_senha_nem_os_dados(): void
    {
        $servico = app(ExclusaoDeContaService::class);
        $servico->anonimizar($this->titular);
        $senhaAposPrimeira = $this->titular->fresh()->getRawOriginal('password');

        $servico->anonimizar($this->titular->fresh());

        $this->assertSame($senhaAposPrimeira, $this->titular->fresh()->getRawOriginal('password'));
        $this->assertSame('Usuário anonimizado', $this->titular->fresh()->name);
    }

    public function test_reservas_e_horarios_do_titular_mantem_o_user_id_preenchido(): void
    {
        $reserva = $this->criarReservaComHorario($this->titular, $this->titular);

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $this->assertDatabaseHas('reservas', ['id' => $reserva->id, 'user_id' => $this->titular->id]);
        $this->assertDatabaseHas('horarios', ['reserva_id' => $reserva->id, 'user_id' => $this->titular->id]);
    }

    public function test_anonimizar_um_usuario_nao_altera_reservas_horarios_nem_conta_de_outro(): void
    {
        $outro = User::factory()->create(['name' => 'Outro Solicitante', 'email' => 'outro.'.Str::random(6).'@test.local']);
        $outro->assignRole('comum');
        $this->inserirNotificacao($outro->id);
        $this->inserirSessao('sessao-do-outro', $outro->id);
        $reservaOutro = $this->criarReservaComHorario($outro, $outro);

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $this->assertDatabaseHas('users', ['id' => $outro->id, 'name' => 'Outro Solicitante', 'email' => $outro->email]);
        $this->assertSame(1, DB::table('notifications')->where('notifiable_id', $outro->id)->count());
        $this->assertSame(1, DB::table('sessions')->where('user_id', $outro->id)->count());
        $this->assertDatabaseHas('reservas', ['id' => $reservaOutro->id, 'user_id' => $outro->id, 'titulo' => $reservaOutro->titulo]);
        $this->assertDatabaseHas('horarios', ['reserva_id' => $reservaOutro->id, 'user_id' => $outro->id]);
    }

    public function test_setor_do_titular_e_preservado_para_relatorios_agregados(): void
    {
        $setor = Setor::factory()->create();
        $this->titular->update(['setor_id' => $setor->id]);

        app(ExclusaoDeContaService::class)->anonimizar($this->titular);

        $this->assertDatabaseHas('users', ['id' => $this->titular->id, 'setor_id' => $setor->id]);
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

    private function inserirNotificacao(int $userId): void
    {
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\Teste',
            'notifiable_type' => User::class,
            'notifiable_id' => $userId,
            'data' => json_encode(['reserva_id' => 1], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function inserirSessao(string $id, int $userId): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $userId,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'teste',
            'payload' => 'x',
            'last_activity' => time(),
        ]);
    }

    private function inserirTokenDeReset(string $email): void
    {
        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => 'hash-do-token',
            'created_at' => now(),
        ]);
    }

    private function criarReservaComHorario(User $solicitante, User $avaliador): Reserva
    {
        $agenda = Agenda::factory()->for($this->espacoSemGestores())->create(['user_id' => null]);
        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'titulo' => 'Reunião de '.$solicitante->id,
            'situacao' => 'em_analise',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'user_id' => $avaliador->id,
            'situacao' => 'deferida',
            'data' => '2099-06-01',
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return $reserva;
    }
}
