<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Modulo;
use Illuminate\Foundation\Http\FormRequest;

class ListarModulosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('viewAny', Modulo::class);
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'unidade' => ['nullable', 'string', 'max:255'],
        ];
    }
}
