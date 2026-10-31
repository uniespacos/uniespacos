<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Setor;
use App\Models\User;
use App\Services\ExclusaoDeContaService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class InstitucionalUsuarioAnonimizadosTest extends TestCase
{
    private const NOME_ATIVO = 'Ativo Visivel Exclusivo';

    private Setor $setor;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setor = Setor::factory()->create();
        $this->admin = User::factory()->create(['setor_id' => $this->setor->id]);
        $this->admin->assignRole('institucional');
    }

    public function test_listagem_padrao_nao_traz_contas_anonimizadas(): void
    {
        $ativo = User::factory()->create(['setor_id' => $this->setor->id, 'name' => self::NOME_ATIVO]);
        $anonimizada = $this->criarContaAnonimizada();

        $response = $this->actingAs($this->admin)->get(route('institucional.usuarios.index'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where('filters.anonimizados', false));
        $ids = $this->idsDaPagina($response);
        $this->assertContains($ativo->id, $ids);
        $this->assertContains($this->admin->id, $ids);
        $this->assertNotContains($anonimizada->id, $ids);
    }

    public function test_filtro_mostra_somente_contas_anonimizadas(): void
    {
        $ativo = User::factory()->create(['setor_id' => $this->setor->id, 'name' => self::NOME_ATIVO]);
        $anonimizada = $this->criarContaAnonimizada();

        $response = $this->actingAs($this->admin)->get(route('institucional.usuarios.index', ['anonimizados' => 1]));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page->where('filters.anonimizados', true));
        $ids = $this->idsDaPagina($response);
        $this->assertSame([$anonimizada->id], $ids);
        $this->assertNotContains($ativo->id, $ids);
    }

    public function test_conta_anonimizada_vem_com_nome_traduzido_e_marcada(): void
    {
        $anonimizada = $this->criarContaAnonimizada();

        $response = $this->actingAs($this->admin)->get(route('institucional.usuarios.index', ['anonimizados' => 1]));

        $linha = $this->paginaDeUsuarios($response)['data'][0];
        $this->assertSame(__('Anonymized user'), $linha['name']);
        $this->assertTrue($linha['anonimizado']);
        $this->assertSame($anonimizada->id, $linha['id']);
    }

    public function test_busca_por_nome_continua_funcionando_na_listagem_padrao(): void
    {
        User::factory()->create(['setor_id' => $this->setor->id, 'name' => self::NOME_ATIVO]);
        $this->criarContaAnonimizada();

        $response = $this->actingAs($this->admin)->get(route('institucional.usuarios.index', ['search' => 'Ativo Visivel']));

        $response->assertInertia(fn (AssertableInertia $page) => $page->has('users.data', 1)->where('users.data.0.name', self::NOME_ATIVO));
    }

    public function test_busca_por_email_funciona_dentro_do_filtro_de_anonimizadas(): void
    {
        $alvo = $this->criarContaAnonimizada();
        $this->criarContaAnonimizada();

        $response = $this->actingAs($this->admin)->get(route('institucional.usuarios.index', [
            'anonimizados' => 1,
            'search' => $alvo->email,
        ]));

        $this->assertSame([$alvo->id], $this->idsDaPagina($response));
    }

    public function test_paginacao_preserva_o_filtro_de_anonimizadas(): void
    {
        for ($i = 0; $i < 11; $i++) {
            $this->criarContaAnonimizada();
        }

        $primeira = $this->paginaDeUsuarios(
            $this->actingAs($this->admin)->get(route('institucional.usuarios.index', ['anonimizados' => 1])),
        );
        $this->assertCount(10, $primeira['data']);
        $this->assertStringContainsString('anonimizados=1', (string) $primeira['next_page_url']);

        $segunda = $this->paginaDeUsuarios(
            $this->actingAs($this->admin)->get(route('institucional.usuarios.index', ['anonimizados' => 1, 'page' => 2])),
        );
        $this->assertCount(1, $segunda['data']);
        $this->assertTrue($segunda['data'][0]['anonimizado']);
    }

    public function test_valor_invalido_no_filtro_de_anonimizadas_e_rejeitado(): void
    {
        $this->actingAs($this->admin)
            ->get(route('institucional.usuarios.index', ['anonimizados' => 'talvez']))
            ->assertSessionHasErrors('anonimizados');
    }

    public function test_conta_anonimizada_nao_pode_ser_editada(): void
    {
        $anonimizada = $this->criarContaAnonimizada();

        $this->actingAs($this->admin)
            ->put(route('institucional.usuarios.update', ['usuario' => $anonimizada->id]), [
                'name' => 'Nome Reaberto',
                'email' => 'reaberto.'.Str::lower(Str::random(6)).'@test.local',
                'phone' => '(11) 90000-0000',
            ])
            ->assertForbidden();

        $this->assertSame(1, User::query()->where('id', $anonimizada->id)->where('name', 'Usuário anonimizado')->count());
        $this->assertTrue($anonimizada->fresh()->estaAnonimizado());
    }

    public function test_conta_anonimizada_nao_recebe_papel_pelo_institucional(): void
    {
        $anonimizada = $this->criarContaAnonimizada();

        $this->actingAs($this->admin)
            ->put(route('institucional.usuarios.updatepermissions', ['user' => $anonimizada->id]), [
                'role_name' => 'gestor',
                'agendas' => [],
            ])
            ->assertForbidden();

        $this->assertSame([], $anonimizada->fresh()->getRoleNames()->all());
    }

    public function test_conta_anonimizada_nao_pode_ser_excluida_de_novo(): void
    {
        $anonimizada = $this->criarContaAnonimizada();

        $this->actingAs($this->admin)
            ->delete(route('institucional.usuarios.destroy', ['usuario' => $anonimizada->id]), ['password' => 'password'])
            ->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $anonimizada->id]);
    }

    public function test_conta_anonimizada_nao_recebe_reenvio_de_verificacao(): void
    {
        $anonimizada = $this->criarContaAnonimizada();

        $this->actingAs($this->admin)
            ->post(route('institucional.usuarios.resend-verification', ['usuario' => $anonimizada->id]))
            ->assertForbidden();
    }

    public function test_politica_explica_o_bloqueio_da_conta_anonimizada_e_preserva_contas_ativas(): void
    {
        $anonimizada = $this->criarContaAnonimizada();
        $ativo = User::factory()->create(['setor_id' => $this->setor->id]);
        $mensagem = __('This account is anonymized and can no longer be changed.');

        foreach (['update', 'delete', 'updatePermissions'] as $habilidade) {
            $resposta = Gate::forUser($this->admin)->inspect($habilidade, $anonimizada);
            $this->assertTrue($resposta->denied(), $habilidade);
            $this->assertSame($mensagem, $resposta->message(), $habilidade);
        }

        $this->assertTrue(Gate::forUser($this->admin)->allows('update', $ativo));
        $this->assertTrue(Gate::forUser($this->admin)->allows('updatePermissions', $ativo));
        $this->assertTrue(Gate::forUser($this->admin)->allows('delete', $ativo));
    }

    private function criarContaAnonimizada(): User
    {
        $usuario = User::factory()->create([
            'setor_id' => $this->setor->id,
            'name' => 'Pessoa Anonimizavel '.Str::lower(Str::random(6)),
        ]);
        app(ExclusaoDeContaService::class)->anonimizar($usuario);

        return $usuario->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    private function paginaDeUsuarios(TestResponse $response): array
    {
        $props = $response->viewData('page')['props'];
        $json = json_encode($props['users'], JSON_THROW_ON_ERROR);
        $pagina = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        $this->assertIsArray($pagina);

        return $pagina;
    }

    /**
     * @return array<int, int>
     */
    private function idsDaPagina(TestResponse $response): array
    {
        return array_map(fn (array $linha): int => (int) $linha['id'], $this->paginaDeUsuarios($response)['data']);
    }
}
