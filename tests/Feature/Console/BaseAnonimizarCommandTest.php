<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Console\Commands\BaseAnonimizarCommand;
use App\Models\Andar;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Reserva;
use App\Models\Unidade;
use App\Models\User;
use App\Services\ExclusaoDeContaService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BaseAnonimizarCommandTest extends TestCase
{
    private const SENHA_DE_TESTE = 'senha-de-teste-anonimizacao';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-06 12:00:00'));
        Storage::fake('public');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_recusa_production_sem_alterar_o_banco(): void
    {
        $usuario = $this->criarUsuario();
        $this->app['env'] = 'production';

        $this->artisan('base:anonimizar', ['--force' => true, '--senha' => self::SENHA_DE_TESTE])
            ->expectsOutputToContain('não roda em production')
            ->assertExitCode(1);

        $this->assertSame('Fulano de Teste', $this->linhaDoUsuario($usuario->id)->name);
    }

    public function test_recusa_ambiente_fora_da_lista_permitida(): void
    {
        $usuario = $this->criarUsuario();
        $this->app['env'] = 'qa';

        $this->artisan('base:anonimizar', ['--force' => true, '--senha' => self::SENHA_DE_TESTE])
            ->expectsOutputToContain('não está em anonimizacao.ambientes_permitidos')
            ->assertExitCode(1);

        $this->assertSame('Fulano de Teste', $this->linhaDoUsuario($usuario->id)->name);
    }

    public function test_recusa_sem_force_quando_nao_ha_terminal_interativo(): void
    {
        $usuario = $this->criarUsuario();

        $this->artisan('base:anonimizar', ['--no-interaction' => true, '--senha' => self::SENHA_DE_TESTE])
            ->expectsOutputToContain('use --force')
            ->assertExitCode(1);

        $this->assertSame('Fulano de Teste', $this->linhaDoUsuario($usuario->id)->name);
    }

    public function test_confirmacao_negada_nao_altera_nada(): void
    {
        $usuario = $this->criarUsuario();

        $this->artisan('base:anonimizar', ['--senha' => self::SENHA_DE_TESTE])
            ->expectsConfirmation(BaseAnonimizarCommand::PERGUNTA_CONFIRMACAO, 'no')
            ->expectsOutputToContain('Nada foi alterado.')
            ->assertExitCode(1);

        $this->assertSame('Fulano de Teste', $this->linhaDoUsuario($usuario->id)->name);
    }

    public function test_anonimiza_usuarios_reservas_e_horarios(): void
    {
        $usuario = $this->criarUsuario();
        $reserva = $this->criarReserva($usuario, 'Reunião particular', 'Descrição com nome de terceiro', 'Observação livre');
        $horario = $this->criarHorario($reserva, 'Motivo digitado pelo gestor');

        $this->artisan('base:anonimizar', ['--force' => true, '--senha' => self::SENHA_DE_TESTE, '--sem-arquivos' => true])
            ->expectsOutputToContain('Base anonimizada.')
            ->assertExitCode(0);

        $linhaUsuario = $this->linhaDoUsuario($usuario->id);
        $this->assertSame('Usuário '.$usuario->id, $linhaUsuario->name);
        $this->assertSame('usuario'.$usuario->id.'@anonimizado.test', $linhaUsuario->email);
        $this->assertSame('(00) 00000-0000', $linhaUsuario->telefone);
        $this->assertSame('', $linhaUsuario->profile_pic);
        $this->assertTrue(Hash::check(self::SENHA_DE_TESTE, $linhaUsuario->password));
        $this->assertNull($linhaUsuario->remember_token);
        $this->assertNull($linhaUsuario->two_factor_secret);
        $this->assertNull($linhaUsuario->two_factor_recovery_codes);
        $this->assertNull($linhaUsuario->two_factor_confirmed_at);
        $this->assertSame((string) $usuario->setor_id, (string) $linhaUsuario->setor_id);
        $this->assertNotNull($linhaUsuario->email_verified_at);

        $linhaReserva = DB::table('reservas')->find($reserva->id);
        $this->assertSame('Reserva '.$reserva->id, $linhaReserva->titulo);
        $this->assertSame('Texto anonimizado.', $linhaReserva->descricao);
        $this->assertSame('Texto anonimizado.', $linhaReserva->observacao);
        $this->assertNull($linhaReserva->conflict_cache);

        $this->assertSame('Texto anonimizado.', DB::table('horarios')->find($horario->id)->justificativa);
    }

    public function test_nao_toca_conta_ja_anonimizada_pela_exclusao_de_conta(): void
    {
        $id = (int) DB::table('users')->insertGetId([
            'name' => ExclusaoDeContaService::NOME_ANONIMIZADO,
            'email' => User::emailAnonimizado(987654),
            'password' => 'hash-original',
            'telefone' => '',
            'profile_pic' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('base:anonimizar', ['--force' => true, '--senha' => self::SENHA_DE_TESTE, '--sem-arquivos' => true])
            ->assertExitCode(0);

        $linha = $this->linhaDoUsuario($id);
        $this->assertSame(ExclusaoDeContaService::NOME_ANONIMIZADO, $linha->name);
        $this->assertSame(User::emailAnonimizado(987654), $linha->email);
        $this->assertSame('hash-original', $linha->password);
    }

    public function test_dry_run_conta_sem_gravar_e_sem_mostrar_valores(): void
    {
        $usuario = $this->criarUsuario();
        $reserva = $this->criarReserva($usuario, 'Reunião particular', 'Descrição', 'Observação');
        $this->criarHorario($reserva, 'Motivo digitado');
        Storage::disk('public')->put('avatars/fulano.jpg', 'conteudo');

        $this->artisan('base:anonimizar', ['--dry-run' => true])
            ->expectsOutputToContain('Simulação concluída: nada foi gravado.')
            ->doesntExpectOutputToContain('Fulano de Teste')
            ->doesntExpectOutputToContain('Reunião particular')
            ->assertExitCode(0);

        $this->assertSame('Fulano de Teste', $this->linhaDoUsuario($usuario->id)->name);
        $this->assertSame('Reunião particular', DB::table('reservas')->find($reserva->id)->titulo);
        $this->assertSame('Motivo digitado', DB::table('horarios')->where('reserva_id', $reserva->id)->value('justificativa'));
        Storage::disk('public')->assertExists('avatars/fulano.jpg');
    }

    public function test_descricao_do_espaco_e_do_papel_ficam_intactas(): void
    {
        $unidade = Unidade::factory()->create(['instituicao_id' => Instituicao::factory()->create()->id]);
        $modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);
        $andar = Andar::factory()->create(['modulo_id' => $modulo->id]);
        $espaco = Espaco::create([
            'andar_id' => $andar->id,
            'nome' => 'Sala institucional',
            'descricao' => 'Sala institucional com equipamentos',
            'capacidade_pessoas' => 20,
        ]);
        $papelId = (int) DB::table('roles')->insertGetId([
            'name' => 'papel-teste-anonimizacao-'.uniqid(),
            'guard_name' => 'web',
            'description' => 'Papel administrativo institucional',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('base:anonimizar', ['--force' => true, '--senha' => self::SENHA_DE_TESTE, '--sem-arquivos' => true])
            ->assertExitCode(0);

        $this->assertSame('Sala institucional com equipamentos', DB::table('espacos')->find($espaco->id)->descricao);
        $this->assertSame('Papel administrativo institucional', DB::table('roles')->find($papelId)->description);
    }

    public function test_segunda_execucao_nao_altera_contas_nem_senha(): void
    {
        $usuario = $this->criarUsuario();

        $this->artisan('base:anonimizar', ['--force' => true, '--senha' => self::SENHA_DE_TESTE, '--sem-arquivos' => true])
            ->assertExitCode(0);

        $depoisDaPrimeira = $this->linhaDoUsuario($usuario->id);

        $this->artisan('base:anonimizar', ['--force' => true, '--senha' => 'outra-senha-qualquer', '--sem-arquivos' => true])
            ->assertExitCode(0);

        $depoisDaSegunda = $this->linhaDoUsuario($usuario->id);

        $this->assertSame($depoisDaPrimeira->name, $depoisDaSegunda->name);
        $this->assertSame($depoisDaPrimeira->email, $depoisDaSegunda->email);
        $this->assertSame($depoisDaPrimeira->password, $depoisDaSegunda->password);
        $this->assertTrue(Hash::check(self::SENHA_DE_TESTE, $depoisDaSegunda->password));
    }

    public function test_senha_gerada_e_mostrada_uma_vez_e_funciona_na_conta(): void
    {
        $usuario = $this->criarUsuario();

        $codigo = Artisan::call('base:anonimizar', ['--force' => true, '--sem-arquivos' => true]);

        $this->assertSame(0, $codigo);
        $this->assertSame(1, preg_match('/mostrada uma vez\): (\S+)/', Artisan::output(), $casamento));
        $this->assertTrue(Hash::check($casamento[1], $this->linhaDoUsuario($usuario->id)->password));
    }

    public function test_arquivos_de_perfil_sao_apagados_e_sem_arquivos_mantidos(): void
    {
        $this->criarUsuario();
        Storage::disk('public')->put('avatars/fulano.jpg', 'conteudo');
        Storage::disk('public')->put('espacos/foto.jpg', 'conteudo');

        $this->artisan('base:anonimizar', ['--force' => true, '--senha' => self::SENHA_DE_TESTE, '--sem-arquivos' => true])
            ->assertExitCode(0);

        Storage::disk('public')->assertExists('avatars/fulano.jpg');

        $this->artisan('base:anonimizar', ['--force' => true, '--senha' => self::SENHA_DE_TESTE])
            ->assertExitCode(0);

        $this->assertFalse(Storage::disk('public')->exists('avatars/fulano.jpg'));
        Storage::disk('public')->assertExists('espacos/foto.jpg');
    }

    private function criarUsuario(): User
    {
        return User::factory()->create([
            'name' => 'Fulano de Teste',
            'email' => 'fulano.'.uniqid().'@exemplo.test',
            'telefone' => '77 90000-0001',
            'profile_pic' => 'avatars/fulano.jpg',
            'remember_token' => 'token-de-teste',
            'two_factor_secret' => 'segredo-de-teste',
            'two_factor_recovery_codes' => 'codigos-de-teste',
            'two_factor_confirmed_at' => now(),
        ]);
    }

    private function criarReserva(User $usuario, string $titulo, string $descricao, ?string $observacao): Reserva
    {
        return Reserva::factory()->create([
            'user_id' => $usuario->id,
            'titulo' => $titulo,
            'descricao' => $descricao,
            'observacao' => $observacao,
            'conflict_cache' => ['1' => ['conflito_user_name' => 'Outra Pessoa']],
        ]);
    }

    private function criarHorario(Reserva $reserva, string $justificativa): Horario
    {
        return Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'justificativa' => $justificativa,
        ]);
    }

    private function linhaDoUsuario(int $id): object
    {
        $linha = DB::table('users')->find($id);

        if ($linha === null) {
            $this->fail("Usuário {$id} não encontrado após a execução.");
        }

        return $linha;
    }
}
