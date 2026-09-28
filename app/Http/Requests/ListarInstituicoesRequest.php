<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Instituicao;
use Illuminate\Foundation\Http\FormRequest;

class ListarInstituicoesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('viewAny', Instituicao::class);
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
        ];
    }
}
