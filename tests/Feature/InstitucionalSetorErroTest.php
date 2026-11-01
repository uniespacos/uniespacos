<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Instituicao;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use App\Services\SetorService;
use Illuminate\Database\QueryException;
use Mockery\MockInterface;
use PDOException;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InstitucionalSetorErroTest extends TestCase
{
    private Unidade $unidade;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'secao.gestao-setores', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'setores.listar', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'setores.visualizar', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'setores.criar', 'guard_name' => 'web']);

        $instituicao = Instituicao::factory()->create();
        $this->unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $this->unidade->id]);

        $this->admin = User::factory()->create(['setor_id' => $setor->id]);
        $this->admin->givePermissionTo(['secao.gestao-setores', 'setores.listar', 'setores.visualizar', 'setores.criar']);
    }

    #[Test]
    public function falha_de_banco_ao_cadastrar_setor_nao_expoe_sql_nem_valores_na_tela(): void
    {
        $canario = 'canario-'.bin2hex(random_bytes(8));

        $this->mock(SetorService::class, function (MockInterface $mock) use ($canario): void {
            $mock->shouldReceive('store')->andThrow(new QueryException(
                'pgsql',
                'insert into "setors" ("nome", "sigla") values (?, ?)',
                [$canario, 'SIG'],
                new PDOException('SQLSTATE[23505]: unique violation'),
            ));
        });

        $response = $this->actingAs($this->admin)->post(route('institucional.setors.store'), [
            'nome' => 'Setor de teste',
            'sigla' => 'SDT',
            'unidade_id' => $this->unidade->id,
        ]);

        $response->assertRedirect();
        $erro = (string) $response->getSession()->get('error');

        $this->assertNotSame('', $erro);
        $this->assertStringNotContainsString($canario, $erro);
        $this->assertStringNotContainsString('insert', $erro);
        $this->assertStringNotContainsString('setors', $erro);
    }
}
