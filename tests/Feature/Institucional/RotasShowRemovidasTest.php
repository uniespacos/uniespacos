<?php

declare(strict_types=1);

namespace Tests\Feature\Institucional;

use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * A rota `show` foi removida (antes dava 500). O GET no URI do recurso agora responde 405
 * (Method Not Allowed), e não 404, porque PUT/PATCH/DELETE continuam registrados no mesmo URI.
 */
class RotasShowRemovidasTest extends TestCase
{
    protected Instituicao $instituicao;

    protected Unidade $unidade;

    protected Modulo $modulo;

    protected Setor $setor;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'secao.gestao-unidades', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'secao.gestao-modulos', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'secao.gestao-setores', 'guard_name' => 'web']);

        $this->instituicao = Instituicao::factory()->create();
        $this->unidade = Unidade::factory()->create(['instituicao_id' => $this->instituicao->id]);
        $this->modulo = Modulo::factory()->create(['unidade_id' => $this->unidade->id]);
        $this->setor = Setor::factory()->create(['unidade_id' => $this->unidade->id]);

        $this->admin = User::factory()->create(['setor_id' => $this->setor->id]);
        $this->admin->givePermissionTo([
            'secao.gestao-unidades',
            'secao.gestao-modulos',
            'secao.gestao-setores',
        ]);
    }

    public function test_show_de_unidades_retorna_405_sem_rota_show()
    {
        $response = $this->actingAs($this->admin)
            ->get("/institucional/unidades/{$this->unidade->id}");

        $response->assertStatus(405);
    }

    public function test_show_de_modulos_retorna_405_sem_rota_show()
    {
        $response = $this->actingAs($this->admin)
            ->get("/institucional/modulos/{$this->modulo->id}");

        $response->assertStatus(405);
    }

    public function test_show_de_setors_retorna_405_sem_rota_show()
    {
        $response = $this->actingAs($this->admin)
            ->get("/institucional/setors/{$this->setor->id}");

        $response->assertStatus(405);
    }
}
