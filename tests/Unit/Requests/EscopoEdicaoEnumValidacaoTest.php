<?php

declare(strict_types=1);

namespace Tests\Unit\Requests;

use App\Http\Requests\UpdateReservaRequest;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class EscopoEdicaoEnumValidacaoTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function validar(array $dados): \Illuminate\Validation\Validator
    {
        $request = new UpdateReservaRequest;

        return Validator::make($dados, $request->rules(), $request->messages());
    }

    #[Test]
    public function edit_scope_fora_do_enum_recebe_a_mensagem_personalizada(): void
    {
        $validator = $this->validar(['edit_scope' => 'todas']);

        $this->assertTrue($validator->errors()->has('edit_scope'));
        $this->assertSame(
            'O escopo de edição deve ser "single" ou "recurring".',
            $validator->errors()->first('edit_scope')
        );
    }

    #[Test]
    public function edit_scope_recurring_nao_gera_erro_de_escopo(): void
    {
        $validator = $this->validar(['edit_scope' => 'recurring']);

        $this->assertFalse($validator->errors()->has('edit_scope'));
    }
}
