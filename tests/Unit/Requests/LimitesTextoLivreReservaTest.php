<?php

declare(strict_types=1);

namespace Tests\Unit\Requests;

use App\Http\Requests\AvaliarReservaRequest;
use App\Http\Requests\StoreReservaRequest;
use App\Http\Requests\UpdateReservaRequest;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LimitesTextoLivreReservaTest extends TestCase
{
    #[Test]
    #[DataProvider('requestsComDescricao')]
    public function descricao_aceita_exatamente_2000_caracteres(string $request): void
    {
        $regras = ['descricao' => (new $request)->rules()['descricao']];

        $this->assertFalse(
            Validator::make(['descricao' => str_repeat('a', 2000)], $regras)->fails(),
        );
    }

    #[Test]
    #[DataProvider('requestsComDescricao')]
    public function descricao_recusa_2001_caracteres(string $request): void
    {
        $regras = ['descricao' => (new $request)->rules()['descricao']];

        $this->assertTrue(
            Validator::make(['descricao' => str_repeat('a', 2001)], $regras)->fails(),
        );
    }

    #[Test]
    #[DataProvider('requestsComDescricao')]
    public function descricao_recusa_tipo_errado(string $request): void
    {
        $regras = ['descricao' => (new $request)->rules()['descricao']];

        $this->assertTrue(
            Validator::make(['descricao' => ['texto', 'em', 'lista']], $regras)->fails(),
        );
    }

    #[Test]
    public function motivo_aceita_exatamente_2000_caracteres(): void
    {
        $this->assertFalse($this->validarMotivo('deferida', str_repeat('a', 2000))->fails());
    }

    #[Test]
    public function motivo_recusa_2001_caracteres(): void
    {
        $validador = $this->validarMotivo('indeferida', str_repeat('a', 2001));

        $this->assertTrue($validador->errors()->has('motivo'));
    }

    #[Test]
    public function motivo_recusa_tipo_errado(): void
    {
        $validador = $this->validarMotivo('indeferida', ['texto', 'em', 'lista']);

        $this->assertTrue($validador->errors()->has('motivo'));
    }

    #[Test]
    public function motivo_continua_obrigatorio_quando_indeferida(): void
    {
        $validador = $this->validarMotivo('indeferida', null);

        $this->assertTrue($validador->errors()->has('motivo'));
    }

    #[Test]
    public function motivo_nao_e_obrigatorio_quando_deferida(): void
    {
        $validador = $this->validarMotivo('deferida', null);

        $this->assertFalse($validador->errors()->has('motivo'));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function requestsComDescricao(): array
    {
        return [
            'store' => [StoreReservaRequest::class],
            'update' => [UpdateReservaRequest::class],
        ];
    }

    private function validarMotivo(string $situacao, mixed $motivo): \Illuminate\Validation\Validator
    {
        return Validator::make(
            ['situacao' => $situacao, 'motivo' => $motivo],
            ['situacao' => (new AvaliarReservaRequest)->rules()['situacao'], 'motivo' => (new AvaliarReservaRequest)->rules()['motivo']],
        );
    }
}
