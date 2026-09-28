<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ListarEspacosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'unidade' => ['nullable', 'string', 'max:255'],
            'modulo' => ['nullable', 'string', 'max:255'],
            'andar' => ['nullable', 'string', 'max:255'],
            'capacidade' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
