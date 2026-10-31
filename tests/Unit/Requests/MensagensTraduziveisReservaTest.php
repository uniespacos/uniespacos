<?php

declare(strict_types=1);

namespace Tests\Unit\Requests;

use App\Http\Requests\AvaliarReservaRequest;
use App\Http\Requests\StoreReservaRequest;
use App\Http\Requests\UpdateReservaRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MensagensTraduziveisReservaTest extends TestCase
{
    #[Test]
    public function motivo_maior_que_o_limite_mostra_a_mensagem_em_ingles(): void
    {
        app()->setLocale('en');

        $mensagem = $this->primeiraMensagem(
            (new AvaliarReservaRequest),
            ['situacao' => 'indeferida', 'motivo' => str_repeat('a', 2001)],
            'motivo',
        );

        $this->assertSame('The reason may not have more than 2000 characters.', $mensagem);
    }

    #[Test]
    public function motivo_maior_que_o_limite_mostra_a_mensagem_em_pt_br(): void
    {
        app()->setLocale('pt_BR');

        $mensagem = $this->primeiraMensagem(
            (new AvaliarReservaRequest),
            ['situacao' => 'indeferida', 'motivo' => str_repeat('a', 2001)],
            'motivo',
        );

        $this->assertSame('O motivo não pode ter mais de 2000 caracteres.', $mensagem);
    }

    #[Test]
    public function motivo_com_tipo_errado_mostra_a_mensagem_em_ingles(): void
    {
        app()->setLocale('en');

        $mensagem = $this->primeiraMensagem(
            (new AvaliarReservaRequest),
            ['situacao' => 'indeferida', 'motivo' => ['texto', 'em', 'lista']],
            'motivo',
        );

        $this->assertSame('The reason must be a valid text.', $mensagem);
    }

    #[Test]
    public function motivo_com_tipo_errado_mostra_a_mensagem_em_pt_br(): void
    {
        app()->setLocale('pt_BR');

        $mensagem = $this->primeiraMensagem(
            (new AvaliarReservaRequest),
            ['situacao' => 'indeferida', 'motivo' => ['texto', 'em', 'lista']],
            'motivo',
        );

        $this->assertSame('O motivo deve ser um texto válido.', $mensagem);
    }

    #[Test]
    #[DataProvider('requestsComDescricao')]
    public function descricao_maior_que_o_limite_mostra_a_mensagem_em_ingles(string $request): void
    {
        app()->setLocale('en');

        $mensagem = $this->primeiraMensagem(new $request, ['descricao' => str_repeat('a', 2001)], 'descricao');

        $this->assertSame('The description may not have more than 2000 characters.', $mensagem);
    }

    #[Test]
    #[DataProvider('requestsComDescricao')]
    public function descricao_maior_que_o_limite_mostra_a_mensagem_em_pt_br(string $request): void
    {
        app()->setLocale('pt_BR');

        $mensagem = $this->primeiraMensagem(new $request, ['descricao' => str_repeat('a', 2001)], 'descricao');

        $this->assertSame('A descrição não pode ter mais de 2000 caracteres.', $mensagem);
    }

    /**
     * @return array<string, array{class-string<FormRequest>}>
     */
    public static function requestsComDescricao(): array
    {
        return [
            'store' => [StoreReservaRequest::class],
            'update' => [UpdateReservaRequest::class],
        ];
    }

    /**
     * @param  array<string, mixed>  $dados
     */
    private function primeiraMensagem(FormRequest $request, array $dados, string $campo): string
    {
        $validador = Validator::make($dados, [$campo => $request->rules()[$campo]], $request->messages());

        $this->assertTrue($validador->fails());

        return (string) $validador->errors()->first($campo);
    }
}
