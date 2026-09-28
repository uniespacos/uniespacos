<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Setor;
use Illuminate\Foundation\Http\FormRequest;

class ListarSetoresRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('viewAny', Setor::class);
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'unidade_id' => ['nullable', 'integer', 'exists:unidades,id'],
        ];
    }
}
