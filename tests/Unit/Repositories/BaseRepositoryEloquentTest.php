<?php

declare(strict_types=1);

namespace Tests\Unit\Repositories;

use App\Models\Instituicao;
use App\Repositories\InstituicaoRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Str;
use Tests\TestCase;

class BaseRepositoryEloquentTest extends TestCase
{
    private InstituicaoRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = $this->app->make(InstituicaoRepositoryInterface::class);
    }

    public function test_store_persiste_e_retorna_o_modelo(): void
    {
        $instituicao = $this->repository->store($this->dados('Store'));

        $this->assertInstanceOf(Instituicao::class, $instituicao);
        $this->assertTrue($instituicao->exists);
        $this->assertDatabaseHas('instituicaos', ['id' => $instituicao->id, 'nome' => 'Instituição Store']);
    }

    public function test_get_retorna_o_modelo_existente_e_null_quando_ausente(): void
    {
        $instituicao = $this->criar('Get');

        $this->assertSame($instituicao->id, $this->repository->get($instituicao->id)?->id);
        $this->assertNull($this->repository->get(PHP_INT_MAX));
    }

    public function test_get_list_sem_filtro_retorna_todos_e_com_filtro_restringe(): void
    {
        $alvo = $this->criar('ListaAlvo');
        $this->criar('ListaOutra');

        $todos = $this->repository->getList();
        $this->assertTrue($todos->contains('id', $alvo->id));

        $filtrados = $this->repository->getList(['*'], ['id' => $alvo->id]);
        $this->assertCount(1, $filtrados);
        $this->assertSame($alvo->id, $filtrados->first()?->id);
    }

    public function test_update_altera_atributos_e_retorna_o_modelo_atualizado(): void
    {
        $instituicao = $this->criar('Update');

        $atualizada = $this->repository->update(['nome' => 'Nome Atualizado'], $instituicao->id);

        $this->assertSame('Nome Atualizado', $atualizada->nome);
        $this->assertDatabaseHas('instituicaos', ['id' => $instituicao->id, 'nome' => 'Nome Atualizado']);
    }

    public function test_update_de_id_inexistente_lanca_model_not_found(): void
    {
        $this->expectException(ModelNotFoundException::class);

        $this->repository->update(['nome' => 'Qualquer'], PHP_INT_MAX);
    }

    public function test_destroy_remove_o_registro_e_retorna_true(): void
    {
        $instituicao = $this->criar('Destroy');

        $this->assertTrue($this->repository->destroy($instituicao->id));
        $this->assertDatabaseMissing('instituicaos', ['id' => $instituicao->id]);
    }

    public function test_destroy_de_id_inexistente_lanca_model_not_found(): void
    {
        $this->expectException(ModelNotFoundException::class);

        $this->repository->destroy(PHP_INT_MAX);
    }

    private function criar(string $sufixo): Instituicao
    {
        return $this->repository->store($this->dados($sufixo));
    }

    /**
     * @return array<string, string>
     */
    private function dados(string $sufixo): array
    {
        return [
            'nome' => 'Instituição '.$sufixo,
            'sigla' => 'T'.Str::upper(Str::random(5)),
            'endereco' => 'Rua de Teste, 1',
        ];
    }
}
