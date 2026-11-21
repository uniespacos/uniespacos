<?php

declare(strict_types=1);

namespace Tests\Unit\Requests;

use App\Http\Requests\UpdateModuloRequest;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Routing\Route;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class UpdateModuloRequestTest extends TestCase
{
    private Modulo $modulo;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'modulos.atualizar', 'guard_name' => 'web']);

        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $this->modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);
    }

    #[Test]
    public function autoriza_usuario_com_permissao_de_atualizar_o_modulo(): void
    {
        $usuario = $this->usuarioComPermissao();

        $this->assertTrue($this->requisicaoPara($usuario)->authorize());
    }

    #[Test]
    public function nega_usuario_sem_permissao_de_atualizar_o_modulo(): void
    {
        $usuario = User::factory()->create();

        $this->assertFalse($this->requisicaoPara($usuario)->authorize());
    }

    #[Test]
    public function nega_quando_nao_ha_usuario_autenticado(): void
    {
        $this->assertFalse($this->requisicaoPara(null)->authorize());
    }

    #[Test]
    public function nega_quando_a_rota_nao_traz_o_modulo(): void
    {
        $usuario = $this->usuarioComPermissao();

        $requisicao = UpdateModuloRequest::create('/institucional/modulos', 'PUT');
        $requisicao->setUserResolver(fn () => $usuario);

        $this->assertFalse($requisicao->authorize());
    }

    private function usuarioComPermissao(): User
    {
        $usuario = User::factory()->create();
        $usuario->givePermissionTo('modulos.atualizar');

        return $usuario;
    }

    private function requisicaoPara(?User $usuario): UpdateModuloRequest
    {
        $requisicao = UpdateModuloRequest::create('/institucional/modulos/'.$this->modulo->id, 'PUT');

        $rota = (new Route(['PUT'], 'institucional/modulos/{modulo}', []))->bind($requisicao);
        $rota->setParameter('modulo', $this->modulo);

        $requisicao->setRouteResolver(fn () => $rota);
        $requisicao->setUserResolver(fn () => $usuario);

        return $requisicao;
    }
}
