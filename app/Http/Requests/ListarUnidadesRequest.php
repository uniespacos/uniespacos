<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Unidade;
use Illuminate\Foundation\Http\FormRequest;

class ListarUnidadesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('viewAny', Unidade::class);
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
