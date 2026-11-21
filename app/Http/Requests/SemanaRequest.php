<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\SemanaDeReferencia;
use Illuminate\Foundation\Http\FormRequest;

class SemanaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'semana' => SemanaDeReferencia::regras(),
        ];
    }

    public function semana(): ?string
    {
        $valor = $this->validated('semana');

        return is_string($valor) ? $valor : null;
    }
}
